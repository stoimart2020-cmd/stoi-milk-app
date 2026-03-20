import { useState, useEffect } from "react";
import { X, ShoppingBag, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAllRiders } from "../../shared/api/riders";

/**
 * AddDeliveryModal — two distinct modes:
 *
 * "normal" → One Time Order
 *   - Creates a PENDING order scheduled for a future delivery date
 *   - Payment is deducted from the customer's wallet (WALLET mode)
 *   - Rider assignment is optional (can be scheduled later)
 *
 * "spot" → Spot Sale
 *   - Records a sale already made by a rider during a scheduled delivery run
 *   - Marked as DELIVERED immediately — no scheduling needed
 *   - Payment is collected on-spot (CASH / ONLINE / UPI) or deducted from WALLET length
 *   - Rider who made the sale is required
 */
export const AddDeliveryModal = ({ customer, products = [], isOpen, onClose, onSave, mode = "normal" }) => {
    const isSpot = mode === "spot";

    const defaultForm = () => ({
        product: "",
        quantity: 1,
        date: new Date().toISOString().split("T")[0],
        deliveryBoy: customer?.deliveryBoy?._id || customer?.deliveryBoy || "",
        price: 0,
        paymentMode: isSpot ? "CASH" : "WALLET",
        bottlesReturned: 0,
        note: "",
    });

    const [formData, setFormData] = useState(defaultForm());

    // Fetch Riders
    const { data: ridersData } = useQuery({
        queryKey: ["riders"],
        queryFn: getAllRiders,
        enabled: isOpen,
    });
    const riders = ridersData?.result || [];

    // Reset form when modal opens or mode changes
    useEffect(() => {
        if (isOpen) setFormData(defaultForm());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, mode, customer]);

    // Auto-calculate total price from product × quantity
    useEffect(() => {
        if (formData.product && formData.quantity) {
            const selectedProduct = products.find((p) => p._id === formData.product);
            if (selectedProduct) {
                setFormData((prev) => ({ ...prev, price: selectedProduct.price * Number(prev.quantity) }));
            }
        }
    }, [formData.product, formData.quantity, products]);

    const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, mode, customerId: customer?._id });
    };

    if (!isOpen) return null;

    const headerColor = isSpot ? "bg-orange-600" : "bg-teal-600";
    const Icon = isSpot ? Store : ShoppingBag;

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className={`flex justify-between items-center p-4 border-b ${headerColor} text-white`}>
                    <div className="flex items-center gap-2">
                        <Icon size={20} />
                        <div>
                            <h2 className="text-lg font-bold">
                                {isSpot ? "Record Spot Sale" : "Create One Time Order"}
                            </h2>
                            <p className="text-xs text-white/75">
                                {isSpot
                                    ? "Sale already made by rider — recorded after delivery"
                                    : "Schedule an order → deducted from wallet"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <X size={22} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                    {/* Customer Info Bar */}
                    <div className={`rounded-lg p-3 flex items-center justify-between text-sm ${isSpot ? "bg-orange-50" : "bg-blue-50"}`}>
                        <div>
                            <div className={`text-xs font-semibold uppercase ${isSpot ? "text-orange-600" : "text-blue-600"}`}>Customer</div>
                            <div className="font-bold text-gray-800">{customer?.name}</div>
                        </div>
                        <div className="text-right">
                            <div className={`text-xs font-semibold uppercase ${isSpot ? "text-orange-600" : "text-blue-600"}`}>
                                {isSpot ? "Wallet Balance" : "Wallet"}
                            </div>
                            <div className="font-bold text-gray-800">₹{customer?.walletBalance?.toFixed(2) ?? "0.00"}</div>
                        </div>
                    </div>

                    {/* MODE CONTEXT BANNER */}
                    {isSpot ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800">
                            <strong>Spot Sale:</strong> This records a product already sold by the delivery boy during
                            their route. Payment is collected on-spot or deducted from wallet immediately.
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                            <strong>One Time Order:</strong> Creates a scheduled order. Payment will be deducted from
                            the customer&apos;s wallet on delivery. The order appears in the rider&apos;s daily route.
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Product */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.product}
                                onChange={(e) => set("product", e.target.value)}
                                required
                            >
                                <option value="">Choose a product</option>
                                {products.map((p) => (
                                    <option key={p._id} value={p._id}>
                                        {p.name} — ₹{p.price}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                            <input
                                type="number"
                                className="input input-bordered w-full"
                                min="1"
                                value={formData.quantity}
                                onChange={(e) => set("quantity", e.target.value)}
                                required
                            />
                        </div>

                        {/* Total Price */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isSpot && formData.paymentMode !== "WALLET" ? "Amount Collected (₹) *" : "Total Price (₹)"}
                            </label>
                            <input
                                type="number"
                                className="input input-bordered w-full"
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => set("price", e.target.value)}
                                required={isSpot}
                            />
                        </div>

                        {/* Date label differs by mode */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isSpot ? "Sale Date *" : "Delivery Date *"}
                            </label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={formData.date}
                                onChange={(e) => set("date", e.target.value)}
                                required
                            />
                        </div>

                        {/* Payment Mode — wallet hidden for spot */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.paymentMode}
                                onChange={(e) => set("paymentMode", e.target.value)}
                            >
                                {isSpot ? (
                                    <>
                                        <option value="CASH">Cash</option>
                                        <option value="ONLINE">Online / UPI</option>
                                        <option value="CARD">Card</option>
                                        <option value="WALLET">Wallet (Deduct Now)</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="WALLET">Wallet (Auto-deduct on Delivery)</option>
                                        <option value="CASH">Cash on Delivery</option>
                                        <option value="ONLINE">Online / UPI on Delivery</option>
                                    </>
                                )}
                            </select>
                        </div>

                        {/* Rider — required for spot, optional for normal */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isSpot ? "Rider Who Made the Sale *" : "Assign Rider (optional)"}
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.deliveryBoy}
                                onChange={(e) => set("deliveryBoy", e.target.value)}
                                required={isSpot}
                            >
                                <option value="">
                                    {isSpot ? "Select rider" : "Auto-assign / None"}
                                </option>
                                {riders.map((r) => (
                                    <option key={r._id} value={r._id}>{r.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Bottles returned — only relevant for spot (happened already) */}
                        {isSpot && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bottles / Items Returned</label>
                                <input
                                    type="number"
                                    className="input input-bordered w-full"
                                    min="0"
                                    value={formData.bottlesReturned}
                                    onChange={(e) => set("bottlesReturned", e.target.value)}
                                />
                            </div>
                        )}

                        {/* Note / Reason */}
                        <div className={isSpot ? "sm:col-span-2" : "sm:col-span-2"}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isSpot ? "Note / Reason for Spot Sale" : "Internal Note (optional)"}
                            </label>
                            <textarea
                                className="textarea textarea-bordered w-full"
                                rows={2}
                                placeholder={isSpot ? "e.g. Customer requested extra 1L on route" : "e.g. Customer called in for urgent delivery"}
                                value={formData.note}
                                onChange={(e) => set("note", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn btn-ghost border-gray-300">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`btn text-white px-8 ${isSpot ? "bg-orange-600 hover:bg-orange-700" : "btn-teal bg-teal-600 hover:bg-teal-700"}`}
                        >
                            {isSpot ? "✅ Confirm Sale" : "📦 Place Order"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
