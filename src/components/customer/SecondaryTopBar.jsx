import { Package, Truck, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios";
import { NotificationBell } from "../NotificationBell";

export const SecondaryTopBar = ({ user, onNavigate }) => {

    // Fetch Subscriptions for Next Delivery calculation
    const { data: subscriptionsData } = useQuery({
        queryKey: ["my-subscriptions"],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/subscriptions");
            return response.data;
        }
    });

    // Fetch Orders for Last Delivery
    const { data: ordersData } = useQuery({
        queryKey: ["customerOrderHistory"],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/delivery/history");
            return response.data;
        }
    });

    const subscriptions = subscriptionsData?.result || [];
    const orders = ordersData?.result || [];

    // Helper to format product list: "Milk, Curd +2"
    // Helper to format product list: "Milk x 1, Curd x 2"
    const formatProducts = (items) => {
        if (!items || items.length === 0) return "--";
        // items can have structure { product: { name: ... }, quantity: ... } or { name: ..., quantity: ... }
        const formatted = items.map(i => {
            const name = i.product?.name || i.name || "Product";
            const qty = i.quantity || 1;
            return `${name} x ${qty}`;
        });

        if (formatted.length <= 2) return formatted.join(", ");
        return `${formatted.slice(0, 2).join(", ")} +${formatted.length - 2}`;
    };

    // Calculate Next Delivery
    const getNextDelivery = () => {
        if (user?.vacation?.isActive) return { date: "Paused", products: [] };

        // Logic to find next active date (simplified to Tomorrow for now as per requirement)
        // In a real app, we'd iterate dates until we find one with deliveries.
        // For this demo, we assume "Tomorrow" checks.

        const date = new Date();
        date.setDate(date.getDate() + 1); // Tomorrow
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

        const activeForTomorrow = subscriptions.filter(sub => {
            if (sub.status !== 'active' && sub.status !== 'trial') return false;

            // Frequency Check
            if (sub.frequency === "Daily") return true;
            if (sub.frequency === "Alternate Days") {
                const start = new Date(sub.startDate);
                const diffTime = Math.abs(date - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays % 2 === 0;
            }
            if (sub.frequency === "Weekly") {
                return date.getDay() === new Date(sub.startDate).getDay();
            }
            if (sub.frequency === "Custom" && sub.customDays) {
                return sub.customDays.includes(dayName);
            }
            return false;
        });

        if (activeForTomorrow.length === 0) return { date: "No delivery tomorrow", products: [] };

        return {
            date: "Tomorrow",
            products: activeForTomorrow.map(s => ({ name: s.product?.name, quantity: s.quantity }))
        };
    };

    // Get Last Delivery
    const getLastDelivery = () => {
        // Find the latest order that is either delivered or confirmed (and date is in past/today)
        // Since orders array is from API, ensure it's sorted by date desc
        const delivered = orders.find(o =>
            o.status === 'delivered' ||
            (o.status === 'confirmed' && new Date(o.deliveryDate) <= new Date())
        );
        if (!delivered) return { date: "--", products: [] };

        const d = new Date(delivered.date || delivered.createdAt);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        if (d.toDateString() === today.toDateString()) dateStr = "Today";
        else if (d.toDateString() === yesterday.toDateString()) dateStr = "Yesterday";

        return {
            date: dateStr,
            products: delivered.products || delivered.items || []
        };
    };

    const nextDelivery = getNextDelivery();
    const lastDelivery = getLastDelivery();

    return (
        <div className="bg-white border-b border-gray-200 overflow-x-auto">
            <div className="flex justify-between min-w-max px-4 py-2 divide-x divide-gray-100">
                <div className="flex items-center gap-3 px-4 first:pl-0">
                    <div className="p-2 bg-orange-50 rounded-full text-orange-600">
                        <Package size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Bottles</p>
                        <p className="font-bold text-gray-800">{user?.remainingBottles || 0} Pending</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 px-4">
                    <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                        <Truck size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Next: {nextDelivery.date}</p>
                        <p className="font-bold text-gray-800 text-sm">{formatProducts(nextDelivery.products)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 px-4 last:pr-0">
                    <div className="p-2 bg-purple-50 rounded-full text-purple-600">
                        <Clock size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Last: {lastDelivery.date}</p>
                        <p className="font-bold text-gray-800 text-sm">{formatProducts(lastDelivery.products)}</p>
                    </div>
                </div>

                <div className="flex items-center px-4">
                    <NotificationBell userRole="CUSTOMER" onNavigate={onNavigate} />
                </div>
            </div>
            {/* Bottle Warning */}
            {user?.remainingBottles > 1 && (
                <div className="bg-orange-50 px-4 py-2 text-[10px] text-orange-800 font-medium text-center border-t border-orange-100 flex items-center justify-center gap-2 animate-pulse">
                    <span>⚠️ Don't keep bottles with you. Wash and return daily to ensure smooth operations.</span>
                </div>
            )}
        </div>
    );
};
