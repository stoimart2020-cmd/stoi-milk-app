import { useState, useEffect } from "react";
import { X, ShoppingCart, Info } from "lucide-react";

export const SpotSaleModal = ({ customer, products = [], isOpen, onClose, onSave }) => {
    const [selectedProduct, setSelectedProduct] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(0);

    useEffect(() => {
        if (selectedProduct) {
            const p = products.find(prod => prod._id === selectedProduct);
            if (p) setPrice(p.price * quantity);
        }
    }, [selectedProduct, quantity, products]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const p = products.find(prod => prod._id === selectedProduct);
        if (!p) return;

        onSave({
            customerId: customer._id,
            products: [{
                product: selectedProduct,
                name: p.name,
                quantity: Number(quantity),
                price: p.price
            }],
            totalAmount: price,
            deliveryDate: new Date().toISOString().split('T')[0],
            paymentMode: "CASH",
            status: "delivered",
            orderType: "SPOT_SALE"
        });
        onClose();
    };

    if (!isOpen || !customer) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white text-center relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <ShoppingCart size={32} />
                    </div>
                    <h2 className="text-xl font-bold">On-Spot Sale</h2>
                    <p className="text-orange-100 text-sm opacity-90">Recording extra delivery for {customer.name}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Choose Product</label>
                        <select
                            className="select select-bordered w-full rounded-2xl bg-gray-50 focus:bg-white transition-colors"
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            required
                        >
                            <option value="">Select a product</option>
                            {products.map(p => (
                                <option key={p._id} value={p._id}>{p.name} - ₹{p.price}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Quantity</label>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="btn btn-sm btn-circle btn-ghost border-gray-200">-</button>
                                <span className="text-lg font-bold w-4 text-center">{quantity}</span>
                                <button type="button" onClick={() => setQuantity(quantity + 1)} className="btn btn-sm btn-circle btn-ghost border-gray-200">+</button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Total Amount</label>
                            <div className="text-2xl font-black text-orange-600">₹{price}</div>
                        </div>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-2xl flex gap-3 items-start border border-orange-100">
                        <Info size={18} className="text-orange-500 mt-0.5" />
                        <p className="text-xs text-orange-800 leading-relaxed">
                            Order will be marked as <b>delivered</b> immediately. Payment is assumed to be <b>CASH</b>.
                        </p>
                    </div>

                    <button type="submit" className="btn btn-lg bg-gradient-to-r from-orange-500 to-red-600 text-white border-none rounded-2xl w-full shadow-lg shadow-orange-200">
                        Confirm & Record Sale
                    </button>
                </form>
            </div>
        </div>
    );
};
