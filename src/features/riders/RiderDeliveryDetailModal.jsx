import { useState, useEffect, useRef } from "react";
import { ChevronLeft, QrCode, Minus, Plus, Camera, X } from "lucide-react";
import { createQrCode } from "../../shared/api/payments";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";

export const RiderDeliveryDetailModal = ({
    isOpen,
    onClose,
    delivery,
    distance = "0 km",
    onSaveDetails,
    onDeliverNewProduct
}) => {
    const [localProducts, setLocalProducts] = useState([]);
    const [bottleCount, setBottleCount] = useState(0);
    const [cashAmount, setCashAmount] = useState("");
    const [chequeAmount, setChequeAmount] = useState("");
    const [chequeNumber, setChequeNumber] = useState("");
    const [note, setNote] = useState("");
    const [noteType, setNoteType] = useState("");
    const [images, setImages] = useState([]);
    const [showQr, setShowQr] = useState(false);
    const [qrAmount, setQrAmount] = useState("");
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [isGeneratingQr, setIsGeneratingQr] = useState(false);
    
    // Asset Tracking
    const [deliveredAssetsInput, setDeliveredAssetsInput] = useState("");
    const [returnedAssetsInput, setReturnedAssetsInput] = useState("");

    // Cancellation
    const [cancelPrompt, setCancelPrompt] = useState({ show: false, action: null });
    const [cancelReason, setCancelReason] = useState("");

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen && delivery) {
            setLocalProducts(delivery.products ? JSON.parse(JSON.stringify(delivery.products)) : []);
            setBottleCount(0);
            setCashAmount("");
            setChequeAmount("");
            setChequeNumber("");
            setNote("");
            setNoteType("");
            setImages([]);
            setCancelPrompt({ show: false, action: null });
            setCancelReason("");
            setDeliveredAssetsInput("");
            setReturnedAssetsInput("");
        }
    }, [isOpen, delivery]);

    if (!isOpen || !delivery) return null;

    const customer = delivery.customer;
    const isCustomerOnly = delivery.isCustomerOnly;
    const amountDue = isCustomerOnly ? 0 : localProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleUpdateQty = (productId, delta) => {
        setLocalProducts(prev => prev.map(p => {
            if ((p.product?._id || p.product) === productId) {
                return { ...p, quantity: Math.max(0, p.quantity + delta) };
            }
            return p;
        }));
    };

    const confirmCancel = () => {
        if (cancelPrompt.action === 'all') {
            handleSave('cancelled');
        } else if (cancelPrompt.action) {
            // Drop product
            setLocalProducts(prev => prev.filter(p => (p.product?._id || p.product) !== cancelPrompt.action));
            setNote(prev => prev + `\n[Cancelled Item: ${cancelReason}]`);
            setCancelPrompt({ show: false, action: null });
            setCancelReason("");
        }
    };

    const handleSave = (statusOverride) => {
        let finalStatus = statusOverride || 'delivered';
        if (finalStatus !== 'cancelled' && localProducts.length === 0 && !isCustomerOnly && delivery.orderType !== 'BOTTLE_COLLECTION') {
            finalStatus = 'cancelled';
        }

        const deliveredAssets = deliveredAssetsInput.split(',').map(s => s.trim()).filter(s => s);
        const returnedAssets = returnedAssetsInput.split(',').map(s => s.trim()).filter(s => s);

        const payload = {
            deliveryId: delivery._id,
            status: finalStatus,
            bottlesReturned: bottleCount,
            cashAmount,
            chequeAmount,
            chequeNumber,
            note,
            noteType,
            cancelReason: statusOverride === 'cancelled' ? cancelReason : undefined,
            deliveryProofImages: images,
            products: localProducts,
            deliveredAssets,
            returnedAssets
        };
        onSaveDetails(payload);
    };

    if (cancelPrompt.show) {
        return (
            <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel {cancelPrompt.action === 'all' ? 'All' : 'Product'}</h3>
                    <p className="text-sm text-gray-500 mb-4">Please provide a reason for cancellation.</p>
                    <select
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-600 outline-none mb-3 appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em 1.2em' }}
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                    >
                        <option value="">Select Reason</option>
                        <option value="Customer Absent">Customer Absent</option>
                        <option value="Not Required Today">Not Required Today</option>
                        <option value="Payment Issue">Payment Issue</option>
                        <option value="Other">Other</option>
                    </select>
                    {cancelReason === "Other" && (
                        <textarea
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-400 min-h-[80px] resize-none mb-4"
                            placeholder="Please specify..."
                            onChange={e => setCancelReason("Other: " + e.target.value)}
                            autoFocus
                        ></textarea>
                    )}
                    <div className="flex gap-3">
                        <button className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors" onClick={() => setCancelPrompt({ show: false, action: null })}>Back</button>
                        <button className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors shadow-md shadow-red-200" onClick={confirmCancel}>Confirm Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    const handleGenerateQR = async () => {
        const displayAmount = qrAmount || amountDue;
        if (!displayAmount || displayAmount <= 0) {
            toast.error("Amount must be greater than 0");
            return;
        }

        setIsGeneratingQr(true);
        setShowQr(true);
        try {
            const res = await createQrCode({
                amount: displayAmount,
                description: `Order ${delivery._id} payment`
            });
            if (res.status === 'success' && res.result?.short_url) {
                setQrCodeUrl(res.result.short_url);
            } else {
                toast.error("Failed to fetch QR details");
                setShowQr(false);
            }
        } catch (error) {
            console.error("QR Generation Error:", error.response?.data || error);
            const errMsg = error.response?.data?.details?.description || error.response?.data?.message || "Error generating QR code";
            toast.error(errMsg);
            setShowQr(false);
        } finally {
            setIsGeneratingQr(false);
        }
    };

    if (showQr) {
        const displayAmount = qrAmount || amountDue;
        return (
            <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200 text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Scan & Pay</h3>
                    <p className="text-sm text-gray-500 mb-4">{displayAmount > 0 ? `Please pay ₹${displayAmount}` : "Scan to pay with Any UPI App"}</p>
                    <div className="bg-gray-100 p-4 rounded-xl flex items-center justify-center mb-6 min-h-[220px]">
                        {isGeneratingQr ? (
                            <div className="animate-pulse flex flex-col items-center">
                                <QrCode size={60} className="text-gray-300 mb-2" />
                                <span className="text-gray-500 text-sm">Generating QR...</span>
                            </div>
                        ) : qrCodeUrl ? (
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 flex items-center justify-center">
                                <QRCodeSVG value={qrCodeUrl} size={180} level={"H"} />
                            </div>
                        ) : (
                            <div className="w-48 h-48 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center p-4">
                                Failed to load QR. Please try again or check logs.
                            </div>
                        )}
                    </div>
                    <button className="w-full py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-black transition-colors shadow-md" onClick={() => { setShowQr(false); setQrCodeUrl(null); }}>Close QR</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in fade-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 px-4 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-1 -ml-1 hover:bg-gray-100 rounded-full">
                        <ChevronLeft size={28} className="text-[#150a33]" />
                    </button>
                    <h1 className="text-[22px] font-medium text-[#150a33] truncate max-w-[200px]">
                        {customer?.name}
                    </h1>
                </div>
                <div className="bg-[#fce484] text-[#150a33] text-sm font-medium px-4 py-1.5 rounded-full shadow-sm">
                    {customer?.customerId || "NEW"}
                </div>
            </div>

            <div className="p-4 pb-32 max-w-md mx-auto">
                {/* Address & Distance */}
                <div className="flex justify-between items-start mb-6">
                    <p className="text-[16px] text-gray-500 leading-snug max-w-[70%]">
                        {customer?.address?.fullAddress || "No Address Provided"}
                    </p>
                    <div className="text-[#12b8b0] text-[13px] font-medium border border-[#12b8b0] px-4 py-1 rounded-full whitespace-nowrap">
                        {distance}
                    </div>
                </div>

                {/* Top Action Buttons */}
                {!isCustomerOnly && (
                    <div className="flex gap-3 mb-8">
                        <button
                            onClick={() => handleSave('delivered')}
                            className="flex-1 border border-[#12b8b0] text-[#12b8b0] text-[14px] font-medium py-2.5 rounded-lg active:bg-teal-50 transition-colors"
                        >
                            Deliver All Product
                        </button>
                        <button
                            onClick={() => setCancelPrompt({ show: true, action: 'all' })}
                            className="flex-1 border border-[#f44336] text-[#f44336] text-[14px] font-medium py-2.5 rounded-lg active:bg-red-50 transition-colors"
                        >
                            Cancel All Product
                        </button>
                    </div>
                )}

                {/* Products Section */}
                <h3 className="text-[#150a33] text-[18px] mb-3">Products</h3>

                {localProducts.length > 0 ? (
                    <div className="space-y-4 mb-4">
                        {localProducts.map((p, idx) => {
                            const pid = p.product?._id || p.product;
                            return (
                                <div key={idx} className="bg-[#f8f9fa] rounded-2xl p-4 shadow-sm border border-gray-100">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex gap-3">
                                            <div className="w-12 h-12 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center p-1 relative overflow-hidden">
                                                <div className="absolute bottom-0 w-full h-[60%] bg-[#b3ddd9] rounded-b-md"></div>
                                                <div className="w-4 h-6 border-2 border-gray-400 rounded-t-sm bg-white z-10"></div>
                                            </div>
                                            <div>
                                                <h4 className="text-[16px] font-normal text-black">{p.product?.name || p.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[13px] text-gray-500">{p.product?.shortDescription || "1 Unit"}</span>
                                                    <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-1.5 rounded">₹{p.price}/ea</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[24px] text-black pr-2">{p.quantity}</div>
                                    </div>

                                    <div className="flex gap-3 justify-end items-center mt-2">
                                        <button
                                            className="border border-[#f44336] text-[#f44336] text-[13px] font-medium px-6 py-1.5 rounded-lg"
                                            onClick={() => setCancelPrompt({ show: true, action: pid })}
                                        >
                                            Cancel
                                        </button>
                                        <div className="flex items-center bg-[#fce484] rounded-lg shadow-sm overflow-hidden h-9">
                                            <button className="px-3 h-full hover:bg-yellow-300 transition-colors flex items-center justify-center" onClick={() => handleUpdateQty(pid, -1)}><Minus size={14} /></button>
                                            <span className="text-[13px] font-bold text-black px-2 select-none w-6 text-center">{p.quantity}</span>
                                            <button className="px-3 h-full hover:bg-yellow-300 transition-colors flex items-center justify-center" onClick={() => handleUpdateQty(pid, 1)}><Plus size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-gray-400 text-sm mb-4 italic">No scheduled products.</div>
                )}

                {/* Add New & Upload Proof */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <button
                        onClick={() => {
                            onClose(); // Optional: depend on modal layering if you want them stacked instead.
                            setTimeout(() => onDeliverNewProduct(customer), 100);
                        }}
                        className="bg-[#fce484] text-[#150a33] text-[15px] font-medium rounded-xl py-4 flex items-center justify-center gap-2 shadow-sm relative overflow-hidden"
                    >
                        <span className="text-[20px] font-light mt-[-2px]">+</span> Deliver New Product
                    </button>

                    <button
                        className="bg-[#fafafa] text-gray-500 text-[12px] font-medium rounded-xl border border-dashed border-gray-300 py-4 flex flex-col items-center justify-center gap-1.5 relative hover:bg-gray-50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {images.length > 0 ? (
                            <div className="flex -space-x-2">
                                {images.map((img, i) => <img key={i} src={img} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm bg-gray-200" alt="Proof" />)}
                            </div>
                        ) : (
                            <>
                                <Camera size={20} className="text-gray-400 mb-0.5" />
                                <span>Upload delivery proof</span>
                            </>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                        />
                    </button>
                </div>

                {/* Empty Bottle */}
                <h3 className="text-[#150a33] text-[18px] mb-3">Empty Bottle</h3>
                <div className="bg-[#f8f9fa] rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between mb-8">
                    <div>
                        <h4 className="text-[16px] font-normal text-black">Collect Bottles</h4>
                        <p className="text-[13px] text-gray-500">From customer</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            className="w-8 h-8 rounded-md bg-[#12b8b0] text-white flex items-center justify-center shadow-sm"
                            onClick={() => setBottleCount(Math.max(0, bottleCount - 1))}
                        >
                            <Minus size={16} />
                        </button>
                        <span className="text-[24px] font-medium w-6 text-center">{bottleCount}</span>
                        <button
                            className="w-8 h-8 rounded-md bg-[#12b8b0] text-white flex items-center justify-center shadow-sm"
                            onClick={() => setBottleCount(bottleCount + 1)}
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Asset Tracking Inputs */}
                <h3 className="text-[#150a33] text-[18px] mb-3">Asset Tracking</h3>
                <div className="space-y-3 mb-8">
                    <div className="bg-[#f8f9fa] rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Scan/Enter Delivered Asset Numbers (comma separated)</label>
                        <input
                            type="text"
                            placeholder="e.g. AST001, AST002"
                            className="w-full outline-none bg-white rounded-lg px-3 py-2 border border-gray-200 focus:border-[#12b8b0]"
                            value={deliveredAssetsInput}
                            onChange={(e) => setDeliveredAssetsInput(e.target.value)}
                        />
                    </div>
                    
                    <div className="bg-[#f8f9fa] rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Scan/Enter Collected Asset Numbers (comma separated)</label>
                        <input
                            type="text"
                            placeholder="e.g. AST008, AST009"
                            className="w-full outline-none bg-white rounded-lg px-3 py-2 border border-gray-200 focus:border-[#12b8b0]"
                            value={returnedAssetsInput}
                            onChange={(e) => setReturnedAssetsInput(e.target.value)}
                        />
                    </div>
                </div>

                {/* Current Amount Due */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[#150a33] text-[18px]">Current Amount Due</h3>
                    <div className="bg-[#fce484] text-black text-[14px] font-medium px-4 py-1.5 rounded-lg shadow-sm">
                        Rs {amountDue}
                    </div>
                </div>

                {/* Payments Form */}
                <div className="space-y-4 mb-8">
                    <div className="bg-[#f8f9fa] rounded-2xl p-4 flex items-center border border-gray-100 shadow-sm">
                        <label className="text-[#150a33] text-[16px] font-medium w-24">Cash</label>
                        <div className="flex items-center flex-1 bg-white rounded-lg px-3 py-2 border border-white focus-within:border-gray-200">
                            <span className="text-gray-500 mr-2">Rs</span>
                            <input
                                type="number"
                                className="w-full outline-none text-[16px] bg-transparent"
                                value={cashAmount}
                                onChange={(e) => setCashAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
                        <div className="flex items-center">
                            <label className="text-[#150a33] text-[16px] font-medium w-24">Cheque</label>
                            <div className="flex items-center flex-1 bg-white rounded-lg px-3 py-2 border border-white focus-within:border-gray-200">
                                <span className="text-gray-500 mr-2">Rs</span>
                                <input
                                    type="number"
                                    className="w-full outline-none text-[16px] bg-transparent"
                                    value={chequeAmount}
                                    onChange={(e) => setChequeAmount(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg px-4 py-3 border border-white focus-within:border-gray-200">
                            <input
                                type="text"
                                placeholder="Cheque Number"
                                className="w-full outline-none text-[15px] bg-transparent placeholder-gray-400"
                                value={chequeNumber}
                                onChange={(e) => setChequeNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex items-center flex-1 bg-white border border-gray-200 shadow-sm rounded-xl px-4 py-3">
                            <span className="text-gray-500 mr-2">Rs</span>
                            <input
                                type="number"
                                className="w-full outline-none text-[16px] bg-transparent"
                                placeholder="Amount"
                                value={qrAmount}
                                onChange={(e) => setQrAmount(e.target.value)}
                            />
                        </div>
                        <button
                            className="flex items-center gap-2 bg-white border border-black shadow-sm rounded-xl px-4 py-3 text-[13px] font-medium text-black uppercase tracking-wide disabled:opacity-50"
                            onClick={handleGenerateQR}
                            disabled={isGeneratingQr}
                        >
                            <QrCode size={18} /> GENERATE QR CODE
                        </button>
                    </div>
                </div>

                {/* Note */}
                <h3 className="text-[#150a33] text-[18px] mb-3">Note</h3>
                <div className="space-y-3 mb-8">
                    <select
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-[15px] text-gray-600 outline-none appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5em 1.5em' }}
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value)}
                    >
                        <option value="">Select Note</option>
                        <option value="Customer Absent">Customer Absent</option>
                        <option value="Payment Delayed">Payment Delayed</option>
                        <option value="Extra Request">Extra Request</option>
                        <option value="Other">Other</option>
                    </select>

                    <textarea
                        className="w-full bg-[#f8f9fa] border border-gray-100 shadow-sm rounded-xl px-4 py-4 text-[15px] outline-none min-h-[120px] resize-none"
                        placeholder="Note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    ></textarea>
                </div>
            </div>

            {/* Bottom Fixed Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.1)] px-4 py-3 z-50">
                <div className="flex gap-3 max-w-md mx-auto">
                    <button
                        className="flex-[0.8] border border-[#f44336] text-[#f44336] text-[15px] font-medium py-3 rounded-xl active:bg-red-50 transition-colors"
                        onClick={onClose}
                    >
                        Close
                    </button>
                    <button
                        className="flex-[1.2] border border-[#12b8b0] text-[#12b8b0] text-[15px] font-medium py-3 rounded-xl active:bg-teal-50 transition-colors"
                        onClick={() => handleSave('delivered')}
                    >
                        Save
                    </button>
                    <button
                        className="flex-1 border border-[#12b8b0] text-[#12b8b0] text-[15px] font-medium py-3 rounded-xl active:bg-teal-50 transition-colors"
                        onClick={() => handleSave('delivered')} // Ideally triggering NEXT flow in parent
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};
