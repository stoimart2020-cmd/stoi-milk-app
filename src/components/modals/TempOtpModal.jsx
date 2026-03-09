import { useState, useEffect } from "react";
import { getTempOtp } from "../../lib/api/customers";
import { toast } from "react-hot-toast";

export const TempOtpModal = ({ customer, isOpen, onClose }) => {
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchOtp = async () => {
        try {
            setLoading(true);
            const res = await getTempOtp(customer._id);
            setOtp(res.result);
            toast.success("OTP retrieved successfully");
        } catch (error) {
            toast.error("Failed to retrieve OTP");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && customer?._id) {
            fetchOtp();
        } else {
            setOtp("");
        }
    }, [isOpen, customer]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
                <div className="bg-teal-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                    <h3 className="text-lg font-bold">Temporary OTP</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">×</button>
                </div>

                <div className="p-8 text-center space-y-4">
                    <p className="text-sm text-gray-600">
                        Ask the customer to use the following code to login/signup.
                        This code bypasses SMS delivery.
                    </p>

                    {loading ? (
                        <div className="py-4">
                            <span className="loading loading-spinner loading-lg text-teal-600"></span>
                        </div>
                    ) : (
                        <div className="p-6 bg-gray-100 rounded-lg border-2 border-dashed border-teal-300">
                            <span className="text-5xl font-black tracking-[1rem] text-teal-800 ml-4">
                                {otp || "----"}
                            </span>
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            onClick={fetchOtp}
                            disabled={loading}
                            className="btn btn-sm btn-outline btn-teal w-full"
                        >
                            Regenerate Code
                        </button>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end">
                    <button onClick={onClose} className="btn btn-primary w-full">Done</button>
                </div>
            </div>
        </div>
    );
};
