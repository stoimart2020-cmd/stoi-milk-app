import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getComplaints, createComplaint, updateComplaint } from '../lib/api';
import { Plus, Search, MessageSquare, AlertCircle, CheckCircle, Clock, Image as ImageIcon, X, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { axiosInstance } from '../lib/axios';

export const Complaints = () => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [statusFilter, setStatusFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null); // For viewing details/updating
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const [compressing, setCompressing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0 });

    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['complaints', page, limit, statusFilter],
        queryFn: () => getComplaints({ page, limit, status: statusFilter })
    });

    const createMutation = useMutation({
        mutationFn: createComplaint,
        onSuccess: () => {
            queryClient.invalidateQueries(['complaints']);
            toast.success('Complaint created');
            setIsCreateModalOpen(false);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create')
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            setUploadProgress(0);
            return await axiosInstance.put(`/api/complaints/${id}`, data, {
                headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
                onUploadProgress: (progressEvent) => {
                    if (data instanceof FormData) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    }
                }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['complaints']);
            toast.success('Complaint updated');
            setSelectedComplaint(null); // Close detail view
            setSelectedImages([]);
            setUploadProgress(0);
        },
        onError: (err) => {
            console.error("Update error:", err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to update';
            toast.error(errorMsg);
            setUploadProgress(0);
        }
    });

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        createMutation.mutate(Object.fromEntries(formData.entries()));
    };

    const handleUpdateSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Add images if any
        selectedImages.forEach((img) => {
            formData.append("images", img.file);
        });

        updateMutation.mutate({ id: selectedComplaint._id, data: formData });
    };

    const handleImageSelect = async (e) => {
        const files = Array.from(e.target.files);

        if (files.length + selectedImages.length > 5) {
            toast.error("Maximum 5 images allowed");
            return;
        }

        setCompressing(true);
        setCompressionProgress({ current: 0, total: files.length });
        const compressedImages = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setCompressionProgress({ current: i + 1, total: files.length });

            if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
                toast.error(`${file.name} is not a JPEG or PNG image`);
                continue;
            }

            try {
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    fileType: file.type
                };

                const compressedFile = await imageCompression(file, options);
                compressedImages.push({
                    file: compressedFile,
                    preview: URL.createObjectURL(compressedFile),
                    name: file.name,
                    size: compressedFile.size
                });
            } catch (error) {
                console.error("Error compressing image:", error);
                toast.error(`Failed to compress ${file.name}`);
            }
        }

        setSelectedImages([...selectedImages, ...compressedImages]);
        setCompressing(false);
        setCompressionProgress({ current: 0, total: 0 });
    };

    const removeImage = (index) => {
        const newImages = [...selectedImages];
        URL.revokeObjectURL(newImages[index].preview);
        newImages.splice(index, 1);
        setSelectedImages(newImages);
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const complaints = data?.result || [];
    const total = data?.pagination?.total || 0;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Open': return 'badge-error';
            case 'In Progress': return 'badge-warning';
            case 'Resolved': return 'badge-success';
            case 'Closed': return 'badge-ghost';
            default: return 'badge-ghost';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'text-error';
            case 'Medium': return 'text-warning';
            case 'Low': return 'text-success';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="p-6 bg-base-100 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Support - Complaints</h1>
                    <p className="text-sm text-gray-500">Manage customer issues and tickets</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={20} /> New Ticket
                </button>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body p-4">
                    <div className="flex justify-end mb-4">
                        <select
                            className="select select-bordered"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Customer</th>
                                    <th>Category</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Assigned To</th>
                                    <th>Created</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="8" className="text-center">Loading...</td></tr>
                                ) : complaints.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center">No complaints found</td></tr>
                                ) : (
                                    complaints.map(ticket => (
                                        <tr key={ticket._id} className="hover">
                                            <td className="font-bold">{ticket.subject}</td>
                                            <td>
                                                <div className="text-sm">
                                                    <div className="font-bold">{ticket.user?.name}</div>
                                                    <div className="text-xs text-gray-500">{ticket.user?.mobile}</div>
                                                </div>
                                            </td>
                                            <td>{ticket.category}</td>
                                            <td className={`font-bold ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</td>
                                            <td><div className={`badge ${getStatusBadge(ticket.status)}`}>{ticket.status}</div></td>
                                            <td>{ticket.assignedTo?.name || '-'}</td>
                                            <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <button className="btn btn-sm btn-ghost" onClick={() => setSelectedComplaint(ticket)}>
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Create New Ticket</h3>
                        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                            <div className="form-control">
                                <label className="label">Subject</label>
                                <input name="subject" required className="input input-bordered" />
                            </div>
                            <div className="form-control">
                                <label className="label">Description</label>
                                <textarea name="description" required className="textarea textarea-bordered"></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">Category</label>
                                    <select name="category" className="select select-bordered">
                                        <option value="Other">Other</option>
                                        <option value="Quality">Quality</option>
                                        <option value="Delivery">Delivery</option>
                                        <option value="Billing">Billing</option>
                                    </select>
                                </div>
                                <div className="form-control">
                                    <label className="label">Priority</label>
                                    <select name="priority" className="select select-bordered">
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail/Update Modal */}
            {selectedComplaint && (
                <div className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-lg mb-4">Ticket Details: {selectedComplaint.subject}</h3>

                        {/* Ticket Info */}
                        <div className="bg-base-200 p-4 rounded-lg mb-4">
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <p className="text-xs text-gray-500">Customer</p>
                                    <p className="font-medium">{selectedComplaint.user?.name || 'N/A'}</p>
                                    <p className="text-sm text-gray-600">{selectedComplaint.user?.mobile || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Status</p>
                                    <span className={`badge ${getStatusBadge(selectedComplaint.status)}`}>
                                        {selectedComplaint.status}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Description</p>
                                <p className="text-sm">{selectedComplaint.description}</p>
                            </div>

                            {/* Customer Uploaded Images */}
                            {selectedComplaint.attachments?.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-xs font-medium text-gray-600 mb-2">Customer Uploaded Images:</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {selectedComplaint.attachments.map((att, idx) => (
                                            <a
                                                key={idx}
                                                href={`http://localhost:4000${att.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block"
                                            >
                                                <img
                                                    src={`http://localhost:4000${att.url}`}
                                                    alt={att.filename}
                                                    className="w-full h-20 object-cover rounded border hover:opacity-80 transition-opacity"
                                                />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* History Timeline */}
                        <div className="mb-4">
                            <h4 className="font-bold text-sm mb-3">Update History</h4>
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {selectedComplaint.history?.map((h, i) => (
                                    <div key={i} className="border-l-2 border-primary pl-4 pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {h.by?.name || "System"}
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        ({h.by?.role || "System"})
                                                    </span>
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(h.timestamp).toLocaleString("en-IN")}
                                                </p>
                                            </div>
                                        </div>
                                        {h.comment && (
                                            <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                                                {h.comment}
                                            </p>
                                        )}
                                        {h.attachments && h.attachments.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-xs text-gray-600 mb-1">Attachments:</p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {h.attachments.map((url, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={`http://localhost:4000${url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <img
                                                                src={`http://localhost:4000${url}`}
                                                                alt="Attachment"
                                                                className="w-16 h-16 object-cover rounded border hover:opacity-80"
                                                            />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Update Form */}
                        <form onSubmit={handleUpdateSubmit} className="border-t pt-4">
                            <h4 className="font-bold mb-3">Update Ticket</h4>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="form-control">
                                    <label className="label">Status</label>
                                    <select name="status" defaultValue={selectedComplaint.status} className="select select-bordered">
                                        <option value="Open">Open</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>
                                <div className="form-control">
                                    <label className="label">Comment / Resolution</label>
                                    <input name="comment" placeholder="Add a comment or resolution note..." className="input input-bordered" />
                                </div>
                            </div>

                            {/* Image Upload Section */}
                            <div className="mb-4">
                                <label className="label">
                                    <span className="label-text">Attach Response Images (Optional)</span>
                                    <span className="label-text-alt text-gray-500">JPEG/PNG only, max 5 images</span>
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png"
                                        multiple
                                        onChange={handleImageSelect}
                                        className="hidden"
                                        id="admin-image-upload"
                                        disabled={compressing || selectedImages.length >= 5}
                                    />
                                    <label htmlFor="admin-image-upload" className="cursor-pointer">
                                        {compressing ? (
                                            <Loader2 className="mx-auto mb-2 text-primary animate-spin" size={32} />
                                        ) : (
                                            <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                                        )}
                                        <p className="text-sm text-gray-600">
                                            {compressing
                                                ? `Compressing ${compressionProgress.current}/${compressionProgress.total}...`
                                                : "Click to upload response images"}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Images will be automatically compressed</p>
                                    </label>
                                </div>

                                {/* Upload Progress Bar */}
                                {uploadProgress > 0 && uploadProgress < 100 && (
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-600">Uploading...</span>
                                            <span className="text-primary font-medium">{uploadProgress}%</span>
                                        </div>
                                        <progress className="progress progress-primary w-full" value={uploadProgress} max="100"></progress>
                                    </div>
                                )}

                                {/* Image Previews */}
                                {selectedImages.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2 mt-3">
                                        {selectedImages.map((img, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={img.preview}
                                                    alt={img.name}
                                                    className="w-full h-20 object-cover rounded-lg border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute top-1 right-1 btn btn-circle btn-xs btn-error text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg">
                                                    {formatFileSize(img.size)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="modal-action">
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                        setSelectedComplaint(null);
                                        setSelectedImages([]);
                                    }}
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={updateMutation.isPending || compressing}
                                >
                                    {updateMutation.isPending ? "Updating..." : "Update"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
