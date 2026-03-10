import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../lib/api/products';
import { Plus, Edit, Trash, FolderTree, ChevronRight, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const CategoryManagement = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        parent: '',
        image: ''
    });

    const { data: categories, isLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: getCategories
    });

    const createMutation = useMutation({
        mutationFn: createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries(['categories']);
            toast.success('Category created successfully');
            closeModal();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create category')
    });

    const updateMutation = useMutation({
        mutationFn: updateCategory,
        onSuccess: () => {
            queryClient.invalidateQueries(['categories']);
            toast.success('Category updated successfully');
            closeModal();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update category')
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries(['categories']);
            toast.success('Category deleted successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete category')
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory._id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const openModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                parent: category.parent?._id || category.parent || '',
                image: category.image || ''
            });
        } else {
            setEditingCategory(null);
            setFormData({ name: '', parent: '', image: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setFormData({ name: '', parent: '', image: '' });
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure? This cannot be undone.')) {
            deleteMutation.mutate(id);
        }
    };

    // Helper to render tree
    const renderCategoryTree = (parentId = null, level = 0) => {
        const cats = categories?.result?.filter(c => {
            const pId = c.parent?._id || c.parent;
            return pId === parentId || (parentId === null && !pId);
        }) || [];

        if (cats.length === 0) return null;

        return (
            <div className={`space-y-2 ${level > 0 ? 'ml-6 border-l pl-4 border-gray-200' : ''}`}>
                {cats.map(cat => (
                    <div key={cat._id} className="relative">
                        <div className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:shadow-sm transition-shadow">
                            <div className="flex items-center gap-3">
                                {level === 0 ? <FolderTree size={20} className="text-primary" /> : <ChevronRight size={16} className="text-gray-400" />}
                                <div>
                                    <h3 className="font-medium text-gray-800">{cat.name}</h3>
                                    <span className="text-xs text-gray-500">Slug: {cat.slug}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openModal(cat)} className="btn btn-ghost btn-xs btn-square text-blue-600">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(cat._id)} className="btn btn-ghost btn-xs btn-square text-red-600">
                                    <Trash size={16} />
                                </button>
                            </div>
                        </div>
                        {renderCategoryTree(cat._id, level + 1)}
                    </div>
                ))}
            </div>
        );
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Category Management</h1>
                    <p className="text-gray-500 text-sm">Organize your product hierarchy</p>
                </div>
                <button onClick={() => openModal()} className="btn btn-primary gap-2">
                    <Plus size={18} /> Add Category
                </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl min-h-[400px]">
                {categories?.result?.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No categories found. Create one!</div>
                ) : (
                    renderCategoryTree(null)
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
                            <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="form-control">
                                <label className="label font-medium">Name</label>
                                <input
                                    required
                                    className="input input-bordered w-full"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Dairy"
                                />
                            </div>

                            <div className="form-control">
                                <label className="label font-medium">Parent Category</label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.parent}
                                    onChange={e => setFormData({ ...formData, parent: e.target.value })}
                                >
                                    <option value="">None (Root Category)</option>
                                    {categories?.result?.filter(c => c._id !== editingCategory?._id).map(cat => (
                                        <option key={cat._id} value={cat._id}>
                                            {cat.name} {cat.parent ? `(Child of ${cat.parent.name || '...'})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <label className="label text-xs text-gray-500">
                                    Select a parent to make this a sub-category.
                                </label>
                            </div>

                            {/* Image URL (Optional) - simplified for now */}
                            <div className="form-control">
                                <label className="label font-medium">Image URL (Optional)</label>
                                <input
                                    className="input input-bordered w-full"
                                    value={formData.image}
                                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={closeModal} className="btn btn-ghost">Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    {editingCategory ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryManagement;
