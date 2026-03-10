import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Plus, MessageSquare, CheckCircle, Image as ImageIcon, X, Upload, FileImage, Loader2 } from "lucide-react";
import { axiosInstance } from "../../lib/axios";
import { queryClient } from "../../lib/queryClient";
import toast from "react-hot-toast";
import imageCompression from "browser-image-compression";

export const CustomerSupport = ({ onBack }) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showAddImagesModal, setShowAddImagesModal] = useState(false);
    const [newTicket, setNewTicket] = useState({
        subject: "",
        description: "",
        category: "Other",
        priority: "Medium"
    });
    const [selectedImages, setSelectedImages] = useState([]);
    const [compressing, setCompressing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0 });

    const { data: ticketsData, isLoading } = useQuery({
        queryKey: ["my-tickets"],
        queryFn: async () => {
            return await axiosInstance.get("/api/complaints");
        }
    });

    const tickets = ticketsData?.data?.result || [];

    const createMutation = useMutation({
        mutationFn: async (formData) => {
            setUploadProgress(0);
            return await axiosInstance.post("/api/complaints", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
            toast.success("Ticket created successfully");
            setShowCreateModal(false);
            setNewTicket({ subject: "", description: "", category: "Other", priority: "Medium" });
            setSelectedImages([]);
            setUploadProgress(0);
        },
        onError: (err) => {
            console.error("Create ticket error:", err);
            const errorMsg = err.response?.data?.message || err.message || "Failed to create ticket";
            toast.error(errorMsg);
            setUploadProgress(0);
        }
    });

    const addImagesMutation = useMutation({
        mutationFn: async ({ ticketId, formData }) => {
            setUploadProgress(0);
            return await axiosInstance.put(`/api/complaints/${ticketId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
            toast.success("Images added successfully");
            setShowAddImagesModal(false);
            setSelectedImages([]);
            setUploadProgress(0);
            // Refresh the selected ticket to show new images
            if (selectedTicket) {
                queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
            }
        },
        onError: (err) => {
            console.error("Add images error:", err);
            const errorMsg = err.response?.data?.message || err.message || "Failed to add images";
            toast.error(errorMsg);
            setUploadProgress(0);
        }
    });

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

            // Validate file type
            if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
                toast.error(`${file.name} is not a JPEG or PNG image`);
                continue;
            }

            try {
                // Compression options
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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newTicket.subject || !newTicket.description) {
            toast.error("Please fill in all required fields");
            return;
        }

        const formData = new FormData();
        formData.append("subject", newTicket.subject);
        formData.append("description", newTicket.description);
        formData.append("category", newTicket.category);
        formData.append("priority", newTicket.priority);

        selectedImages.forEach((img) => {
            formData.append("images", img.file);
        });

        createMutation.mutate(formData);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Open": return "badge-warning";
            case "In Progress": return "badge-info";
            case "Resolved": return "badge-success";
            case "Closed": return "badge-ghost";
            default: return "badge-ghost";
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const handleAddImagesToTicket = () => {
        if (selectedImages.length === 0) {
            toast.error("Please select at least one image");
            return;
        }

        const formData = new FormData();
        formData.append("comment", "Added additional images");

        selectedImages.forEach((img) => {
            formData.append("images", img.file);
        });

        addImagesMutation.mutate({ ticketId: selectedTicket._id, formData });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="btn btn-ghost btn-circle btn-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-gray-800">Help & Support</h2>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary btn-sm text-white gap-2"
                >
                    <Plus size={16} /> New Ticket
                </button>
            </div>

            {/* Tickets List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-center py-8">
                        <span className="loading loading-spinner loading-md text-primary"></span>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-800">No tickets yet</h3>
                        <p className="text-gray-500 text-sm mt-1">Need help? Create a new support ticket.</p>
                    </div>
                ) : (
                    tickets.map((ticket) => (
                        <div key={ticket._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`badge badge-sm ${getStatusColor(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            #{ticket._id.slice(-6).toUpperCase()}
                                        </span>
                                        {ticket.attachments?.length > 0 && (
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <ImageIcon size={12} /> {ticket.attachments.length}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-medium text-gray-800">{ticket.subject}</h3>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs text-gray-500">
                                        {new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                    </span>
                                    <button
                                        onClick={() => setSelectedTicket(ticket)}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{ticket.description}</p>

                            {ticket.resolution && (
                                <div className="bg-green-50 rounded-lg p-3 text-sm border border-green-100">
                                    <p className="font-medium text-green-800 mb-1 flex items-center gap-1">
                                        <CheckCircle size={14} /> Resolution
                                    </p>
                                    <p className="text-green-700">{ticket.resolution}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg mb-4">Create Support Ticket</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">
                                    <span className="label-text">Subject *</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    placeholder="Brief summary of the issue"
                                    value={newTicket.subject}
                                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text">Category</span>
                                    </label>
                                    <select
                                        className="select select-bordered w-full"
                                        value={newTicket.category}
                                        onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                                    >
                                        <option value="Quality">Quality Issue</option>
                                        <option value="Delivery">Delivery Issue</option>
                                        <option value="Billing">Billing Issue</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text">Priority</span>
                                    </label>
                                    <select
                                        className="select select-bordered w-full"
                                        value={newTicket.priority}
                                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="label">
                                    <span className="label-text">Description *</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered w-full h-24"
                                    placeholder="Describe your issue in detail..."
                                    value={newTicket.description}
                                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                    required
                                ></textarea>
                            </div>

                            {/* Image Upload Section */}
                            <div>
                                <label className="label">
                                    <span className="label-text">Attach Images (Optional)</span>
                                    <span className="label-text-alt text-gray-500">JPEG/PNG only, max 5 images</span>
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png"
                                        multiple
                                        onChange={handleImageSelect}
                                        className="hidden"
                                        id="image-upload"
                                        disabled={compressing || selectedImages.length >= 5}
                                    />
                                    <label htmlFor="image-upload" className="cursor-pointer">
                                        {compressing ? (
                                            <Loader2 className="mx-auto mb-2 text-primary animate-spin" size={32} />
                                        ) : (
                                            <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                                        )}
                                        <p className="text-sm text-gray-600">
                                            {compressing
                                                ? `Compressing ${compressionProgress.current}/${compressionProgress.total}...`
                                                : "Click to upload or drag and drop"}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Images will be automatically compressed to under 1MB</p>
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
                                    <div className="grid grid-cols-3 gap-2 mt-3">
                                        {selectedImages.map((img, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={img.preview}
                                                    alt={img.name}
                                                    className="w-full h-24 object-cover rounded-lg border"
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
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setSelectedImages([]);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary text-white"
                                    disabled={createMutation.isPending || compressing}
                                >
                                    {createMutation.isPending ? "Creating..." : "Submit Ticket"}
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}></div>
                </div>
            )}

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-3xl">
                        <h3 className="font-bold text-lg mb-4">Ticket Details</h3>

                        <div className="space-y-4">
                            {/* Ticket Info */}
                            <div className="bg-base-200 p-4 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-lg">{selectedTicket.subject}</h4>
                                        <p className="text-sm text-gray-600">#{selectedTicket._id.slice(-6).toUpperCase()}</p>
                                    </div>
                                    <span className={`badge ${getStatusColor(selectedTicket.status)}`}>
                                        {selectedTicket.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 mt-2">{selectedTicket.description}</p>

                                {/* Initial Attachments */}
                                {selectedTicket.attachments?.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-xs font-medium text-gray-600 mb-2">Attached Images:</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {selectedTicket.attachments.map((att, idx) => (
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
                            {selectedTicket.history && selectedTicket.history.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-sm mb-3">Update History</h4>
                                    <div className="space-y-3">
                                        {selectedTicket.history.map((h, i) => (
                                            <div key={i} className="border-l-2 border-primary pl-4 pb-3">
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
                                                        <div className="flex gap-2">
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
                            )}

                            {/* Resolution */}
                            {selectedTicket.resolution && (
                                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                    <p className="font-medium text-green-800 mb-2 flex items-center gap-2">
                                        <CheckCircle size={18} /> Final Resolution
                                    </p>
                                    <p className="text-green-700">{selectedTicket.resolution}</p>
                                </div>
                            )}
                        </div>

                        <div className="modal-action">
                            {selectedTicket.status !== "Closed" && selectedTicket.status !== "Resolved" && (
                                <button
                                    className="btn btn-primary text-white gap-2"
                                    onClick={() => {
                                        setShowAddImagesModal(true);
                                        setSelectedImages([]);
                                    }}
                                >
                                    <ImageIcon size={16} /> Add Images
                                </button>
                            )}
                            <button className="btn" onClick={() => setSelectedTicket(null)}>Close</button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={() => setSelectedTicket(null)}></div>
                </div>
            )}

            {/* Add Images to Ticket Modal */}
            {showAddImagesModal && selectedTicket && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg mb-4">Add Images to Ticket</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Ticket: <span className="font-medium">{selectedTicket.subject}</span>
                        </p>

                        <div className="space-y-4">
                            {/* Image Upload */}
                            <div>
                                <label className="label">
                                    <span className="label-text">Select Images</span>
                                    <span className="label-text-alt text-gray-500">JPEG/PNG only, max 5 images</span>
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png"
                                        multiple
                                        onChange={handleImageSelect}
                                        className="hidden"
                                        id="add-images-upload"
                                        disabled={compressing || selectedImages.length >= 5}
                                    />
                                    <label htmlFor="add-images-upload" className="cursor-pointer">
                                        {compressing ? (
                                            <Loader2 className="mx-auto mb-2 text-primary animate-spin" size={32} />
                                        ) : (
                                            <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                                        )}
                                        <p className="text-sm text-gray-600">
                                            {compressing
                                                ? `Compressing ${compressionProgress.current}/${compressionProgress.total}...`
                                                : "Click to upload images"}
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
                                    <div className="grid grid-cols-3 gap-2 mt-3">
                                        {selectedImages.map((img, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={img.preview}
                                                    alt={img.name}
                                                    className="w-full h-24 object-cover rounded-lg border"
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
                        </div>

                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => {
                                    setShowAddImagesModal(false);
                                    setSelectedImages([]);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary text-white"
                                onClick={handleAddImagesToTicket}
                                disabled={addImagesMutation.isPending || compressing || selectedImages.length === 0}
                            >
                                {addImagesMutation.isPending ? "Uploading..." : "Upload Images"}
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={() => setShowAddImagesModal(false)}></div>
                </div>
            )}
        </div>
    );
};
