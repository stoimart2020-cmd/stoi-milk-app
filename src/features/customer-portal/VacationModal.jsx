import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, X, Palmtree, AlertCircle } from "lucide-react";
import { axiosInstance } from "../../shared/api/axios";
import { queryClient } from "../../shared/utils/queryClient";
import toast from "react-hot-toast";

// API calls
const getVacationStatus = async () => {
    const response = await axiosInstance.get("/api/vacation/status");
    return response.data;
};

const setVacation = async (data) => {
    const response = await axiosInstance.post("/api/vacation/set", data);
    return response.data;
};

const cancelVacation = async () => {
    const response = await axiosInstance.post("/api/vacation/cancel");
    return response.data;
};

export const VacationModal = ({ isOpen, onClose }) => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [showConfirmCancel, setShowConfirmCancel] = useState(false);

    const { data: statusData, isLoading } = useQuery({
        queryKey: ["vacationStatus"],
        queryFn: getVacationStatus,
        enabled: isOpen,
    });

    const vacation = statusData?.result || {};
    const isOnVacation = vacation.isActive;

    // Set min date to today
    const today = new Date().toISOString().split("T")[0];

    useEffect(() => {
        if (isOnVacation && vacation.startDate) {
            setStartDate(new Date(vacation.startDate).toISOString().split("T")[0]);
            setEndDate(vacation.endDate ? new Date(vacation.endDate).toISOString().split("T")[0] : "");
            setReason(vacation.reason || "");
        }
    }, [isOnVacation, vacation]);

    // Reset success state when modal opens
    useEffect(() => {
        if (isOpen) {
            setShowSuccess(false);
            setSuccessMessage("");
            setShowConfirmCancel(false);
        }
    }, [isOpen]);

    const setMutation = useMutation({
        mutationFn: setVacation,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["vacationStatus"] });
            queryClient.invalidateQueries({ queryKey: ["user"] });
            setSuccessMessage(data.message);
            setShowSuccess(true);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to set vacation");
        },
    });

    const cancelMutation = useMutation({
        mutationFn: cancelVacation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vacationStatus"] });
            queryClient.invalidateQueries({ queryKey: ["user"] });
            toast.success("Vacation mode cancelled. Welcome back! 🎉");
            onClose();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to cancel vacation");
        },
    });

    const handleSubmit = () => {
        if (!startDate) {
            toast.error("Please select a start date");
            return;
        }
        // End date is now optional
        setMutation.mutate({ startDate, endDate: endDate || null, reason });
    };

    const handleCancelClick = () => {
        setShowConfirmCancel(true);
    };

    const confirmCancel = () => {
        cancelMutation.mutate();
    };

    const handleCloseSuccess = () => {
        setShowSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    const calculateDays = () => {
        if (!startDate || !endDate) return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    };

    const days = calculateDays();

    // Success View
    if (showSuccess) {
        return (
            <div className="modal modal-open">
                <div className="modal-box max-w-md">
                    <div className="text-center py-6">
                        <div className="text-6xl mb-4 animate-bounce">🏖️</div>
                        <h3 className="font-bold text-xl text-gray-800 mb-3">Vacation Mode Activated!</h3>
                        <p className="text-gray-600 text-lg leading-relaxed px-4 mb-6">
                            {successMessage}
                        </p>
                        <button
                            onClick={handleCloseSuccess}
                            className="btn btn-primary text-white px-8"
                        >
                            Got it! 👋
                        </button>
                    </div>
                </div>
                <div className="modal-backdrop" onClick={handleCloseSuccess}></div>
            </div>
        );
    }

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <Palmtree size={20} className="text-amber-600" />
                        </div>
                        <h3 className="font-bold text-lg">Vacation Mode</h3>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
                        <X size={18} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : (
                    <>
                        {/* Status Banner */}
                        {isOnVacation && (
                            <div className="alert alert-warning mb-4">
                                <Palmtree size={18} />
                                <div>
                                    <h4 className="font-bold">Vacation Active</h4>
                                    <p className="text-sm">
                                        From {new Date(vacation.startDate).toLocaleDateString()}
                                        {vacation.endDate ? ` to ${new Date(vacation.endDate).toLocaleDateString()}` : " (Indefinite)"}
                                    </p>
                                </div>
                            </div>
                        )}

                        {showConfirmCancel ? (
                            <div className="text-center py-6 bg-red-50 rounded-lg border border-red-100 mb-4">
                                <h4 className="font-bold text-lg text-red-700 mb-2">Cancel Vacation Mode?</h4>
                                <p className="text-sm text-gray-600 mb-6 px-4">
                                    Deliveries will resume from tomorrow. Are you sure you want to proceed?
                                </p>
                                <div className="flex justify-center gap-3">
                                    <button
                                        onClick={() => setShowConfirmCancel(false)}
                                        className="btn btn-sm btn-ghost"
                                    >
                                        No, Keep it
                                    </button>
                                    <button
                                        onClick={confirmCancel}
                                        className="btn btn-sm btn-error text-white"
                                        disabled={cancelMutation.isPending}
                                    >
                                        {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel Vacation"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Info Box */}
                                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle size={16} className="text-blue-600 mt-0.5" />
                                        <p className="text-sm text-blue-700">
                                            All deliveries will be paused during vacation. You won't be charged for paused days.
                                        </p>
                                    </div>
                                </div>

                                {/* Date Selection */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-medium">Start Date *</span>
                                            </label>
                                            <input
                                                type="date"
                                                className="input input-bordered w-full"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                min={today}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-medium">
                                                    End Date <span className="text-gray-400 font-normal text-xs">(optional)</span>
                                                </span>
                                            </label>
                                            <input
                                                type="date"
                                                className="input input-bordered w-full"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                min={startDate || today}
                                            />
                                        </div>
                                    </div>

                                    {/* Duration Display */}
                                    {!endDate && startDate && (
                                        <div className="text-center py-2 bg-amber-50 rounded-lg">
                                            <span className="text-amber-700 text-sm">🏖️ Indefinite vacation until you come back</span>
                                        </div>
                                    )}

                                    {days && (
                                        <div className="text-center py-2 bg-gray-50 rounded-lg">
                                            <span className="text-2xl font-bold text-gray-800">{days}</span>
                                            <span className="text-gray-500 ml-1">day{days > 1 ? "s" : ""} vacation</span>
                                        </div>
                                    )}

                                    <div>
                                        <label className="label">
                                            <span className="label-text font-medium">Reason (optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="input input-bordered w-full"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="e.g., Family trip, Out of town"
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="modal-action">
                                    {isOnVacation ? (
                                        <>
                                            <button
                                                className="btn btn-error btn-outline"
                                                onClick={handleCancelClick}
                                                disabled={cancelMutation.isPending}
                                            >
                                                Cancel Vacation
                                            </button>
                                            <button
                                                className="btn btn-primary text-white"
                                                onClick={handleSubmit}
                                                disabled={setMutation.isPending}
                                            >
                                                {setMutation.isPending ? <span className="loading loading-spinner loading-sm"></span> : "Update Dates"}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                                            <button
                                                className="btn btn-primary text-white"
                                                onClick={handleSubmit}
                                                disabled={setMutation.isPending || !startDate}
                                            >
                                                {setMutation.isPending ? <span className="loading loading-spinner loading-sm"></span> : "Start Vacation"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};

// Compact vacation status badge for display
export const VacationBadge = ({ vacation, onClick }) => {
    if (!vacation?.isActive) return null;

    const now = new Date();
    const start = new Date(vacation.startDate);
    const end = vacation.endDate ? new Date(vacation.endDate) : null;

    // Check if indefinite or check date range
    const isCurrentlyOnVacation = start <= now && (!end || end >= now);

    if (!isCurrentlyOnVacation && start > now) {
        // Scheduled for future
        return (
            <button
                onClick={onClick}
                className="badge badge-warning badge-sm gap-1 cursor-pointer"
            >
                <Palmtree size={10} />
                Vacation from {start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </button>
        );
    }

    if (isCurrentlyOnVacation) {
        return (
            <button
                onClick={onClick}
                className="badge badge-warning gap-1 cursor-pointer"
            >
                <Palmtree size={12} />
                {end ? `On Vacation until ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "On Vacation (Indefinite)"}
            </button>
        );
    }

    return null;
};
