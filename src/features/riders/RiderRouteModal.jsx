import React, { useState, useEffect } from "react";
import { X, GripVertical, Save, RefreshCw } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import toast from "react-hot-toast";
import { getRiderCustomersSelf, updateRiderRouteSelf } from "../../shared/api/riders";

const SortableItem = ({ id, customer }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl shadow-sm mb-2"
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 p-1">
                <GripVertical size={20} />
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-gray-800">{customer.name}</h4>
                <p className="text-xs text-gray-500 truncate max-w-[200px]">
                    {customer.address?.fullAddress || "No Address"}
                </p>
            </div>
            <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400">#{customer.customerId || "N/A"}</span>
            </div>
        </div>
    );
};

export const RiderRouteModal = ({ isOpen, onClose, onSaveSuccess }) => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
        }
    }, [isOpen]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const data = await getRiderCustomersSelf();
            setCustomers(data.result || []);
        } catch (error) {
            toast.error("Failed to fetch customers");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setCustomers((items) => {
                const oldIndex = items.findIndex((i) => i._id === active.id);
                const newIndex = items.findIndex((i) => i._id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const routeIds = customers.map(c => c._id);
            await updateRiderRouteSelf(routeIds);
            toast.success("Route sequence updated!");
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error) {
            toast.error("Failed to save route");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-50 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">Route Sorting</h2>
                        <p className="text-blue-100 text-xs opacity-90">Drag to rearrange your delivery sequence</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                            <RefreshCw className="animate-spin" size={32} />
                            <p>Loading your route...</p>
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <p>No customers assigned to you.</p>
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={customers.map(c => c._id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {customers.map((customer) => (
                                    <SortableItem
                                        key={customer._id}
                                        id={customer._id}
                                        customer={customer}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={saving || customers.length === 0}
                        className="btn btn-lg bg-blue-600 hover:bg-blue-700 text-white border-none rounded-2xl w-full shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <RefreshCw className="animate-spin" size={20} />
                        ) : (
                            <Save size={20} />
                        )}
                        Save Route Sequence
                    </button>
                </div>
            </div>
        </div>
    );
};
