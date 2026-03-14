import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getCustomerById, updateCustomer, updateVacation, getTempOtp } from "../lib/api/customers";
import { addPayment } from "../lib/api/payments";
import { createSubscription, getAdminCustomerSubscriptions, updateAdminDailyModification, updateSubscription, resetTrialEligibility } from "../lib/api/subscriptions";
import { createOrder } from "../lib/api/orders";
import { getAllProducts } from "../lib/api/products";
import { getActivityLogs } from "../lib/api/logs";
import { getCustomerComplaints, createComplaint } from "../lib/api/complaints";
import { toast } from "react-hot-toast";
import { useState } from "react";
import { EditCustomerModal } from "./EditCustomerModal";
import { CreateTicketModal } from "./modals/CreateTicketModal";
import { AddSubscriptionModal } from "./modals/AddSubscriptionModal";
import { EditSubscriptionModal } from "./modals/EditSubscriptionModal";
import { AddDeliveryModal } from "./modals/AddDeliveryModal";
import { ChangeRequestModal } from "./modals/ChangeRequestModal";
import { AddPaymentModal } from "./modals/AddPaymentModal";
import { EditCalendarModal } from "./modals/EditCalendarModal";
import { queryClient } from "../lib/queryClient";
import { CustomerInvoicesTab } from "./admin/CustomerInvoicesTab";

import { CreatePaymentLinkModal } from "./modals/CreatePaymentLinkModal";
import { MergeCustomersModal } from "./modals/MergeCustomersModal";
import { TempOtpModal } from "./modals/TempOtpModal";

// Edit Credit Limit Modal
const EditCreditLimitModal = ({ customer, isOpen, onClose, onSave }) => {
    const [creditLimit, setCreditLimit] = useState(customer.creditLimit || 0);

    if (!isOpen) return null;

    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Edit Credit Limit</h3>
                <div className="py-4">
                    <label className="label">Credit Limit (₹)</label>
                    <input
                        type="number"
                        className="input input-bordered w-full"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        Deliveries will be paused if the wallet balance + credit limit is less than the order value.
                    </p>
                </div>
                <div className="modal-action">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => onSave({ creditLimit })}>Save</button>
                </div>
            </div>
        </div>
    );
};

const ActivityLogTable = ({ customerId }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["activityLogs", customerId],
        queryFn: () => getActivityLogs({ userId: customerId }),
        enabled: !!customerId
    });

    const [expandedLogId, setExpandedLogId] = useState(null);

    const toggleExpand = (id) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    const logs = data?.data?.result || [];

    if (isLoading) return <div className="p-4 text-center">Loading logs...</div>;
    if (error) return <div className="p-4 text-center text-red-500">Failed to load logs</div>;

    return (
        <div className="overflow-x-auto">
            <table className="table table-zebra w-full text-sm">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Date & Time</th>
                        <th>Actor Type</th>
                        <th>Actor Name</th>
                        <th>Action / Description</th>
                        <th>Entity Type</th>
                        <th>Entity ID</th>
                        <th>Changes</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.length === 0 ? (
                        <tr><td colSpan="8" className="text-center py-4">No activity found</td></tr>
                    ) : (
                        logs.map((log) => (
                            <>
                                <tr key={log._id} className="hover cursor-pointer" onClick={() => toggleExpand(log._id)}>
                                    <td className="font-mono text-xs">{log._id.slice(-6)}</td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="font-bold">{new Date(log.createdAt).toLocaleDateString('en-GB')}</span>
                                            <span className="text-xs opacity-70">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge badge-sm ${log.role === 'ADMIN' ? 'badge-primary' : 'badge-ghost'}`}>
                                            {log.role?.toLowerCase() || 'system'}
                                        </span>
                                    </td>
                                    <td>
                                        {/* Try to extract actor name from metadata or user field if populated differently */}
                                        {log.metadata?.changedBy || log.metadata?.actorName || (log.role === 'CUSTOMER' ? 'Customer' : 'System')}
                                    </td>
                                    <td>
                                        <div className="font-semibold text-xs mb-1 uppercase tracking-wide opacity-70">{log.action}</div>
                                        <div>{log.description}</div>
                                    </td>
                                    <td>{log.entityType || log.metadata?.entityType || "-"}</td>
                                    <td className="font-mono text-xs">{log.entityId || log.metadata?.entityId || log.metadata?.subscriptionId || log.metadata?.transactionId || "-"}</td>
                                    <td>
                                        <button className="btn btn-ghost btn-xs">
                                            {expandedLogId === log._id ? 'Hide Details' : 'View Details'}
                                        </button>
                                    </td>
                                </tr>
                                {expandedLogId === log._id && (
                                    <tr className="bg-base-100">
                                        <td colSpan="8" className="p-4">
                                            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                                <div className="p-2 border rounded bg-base-200">
                                                    <h4 className="font-bold mb-2">Metadata</h4>
                                                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.metadata, null, 2)}</pre>
                                                </div>
                                                {(log.oldData || log.newData) && (
                                                    <div className="p-2 border rounded bg-base-200">
                                                        <h4 className="font-bold mb-2">State Change</h4>
                                                        {log.oldData && (
                                                            <div className="mb-2">
                                                                <div className="font-bold text-error">Old Value:</div>
                                                                <pre>{JSON.stringify(log.oldData, null, 2)}</pre>
                                                            </div>
                                                        )}
                                                        {log.newData && (
                                                            <div>
                                                                <div className="font-bold text-success">New Value:</div>
                                                                <pre>{JSON.stringify(log.newData, null, 2)}</pre>
                                                            </div>
                                                        )}
                                                        {/* Fallback for 'changes' array in metadata if used */}
                                                        {log.metadata?.changes && (
                                                            <div className="mt-2">
                                                                <div className="font-bold text-info">Changes:</div>
                                                                <ul className="list-disc list-inside">
                                                                    {log.metadata.changes.map((c, i) => <li key={i}>{c}</li>)}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export const CustomerDetail = () => {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState("subscriptions");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [deliveryModalMode, setDeliveryModalMode] = useState("normal");
    const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState(false);
    const [changeModalConfig, setChangeModalConfig] = useState({ type: "status", status: "Active" });
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [isTempOtpModalOpen, setIsTempOtpModalOpen] = useState(false);
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
    const [isCreditLimitModalOpen, setIsCreditLimitModalOpen] = useState(false);
    const [isEditSubscriptionModalOpen, setIsEditSubscriptionModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ["customer", id],
        queryFn: () => getCustomerById(id),
    });

    const customer = data?.result;

    const { data: productsData } = useQuery({
        queryKey: ["products"],
        queryFn: getAllProducts,
    });
    const products = productsData?.result || [];

    // Fetch subscriptions for this customer (Admin view)
    // We must use customer._id (ObjectId) not the URL id (which might be customerId number)
    const { data: subscriptionsData } = useQuery({
        queryKey: ["customerSubscriptions", customer?._id],
        queryFn: () => getAdminCustomerSubscriptions(customer._id),
        enabled: !!customer?._id,
    });

    const customerSubscriptions = subscriptionsData?.result || [];

    // Fetch complaints/tickets for this customer
    const { data: complaintsData } = useQuery({
        queryKey: ["customerComplaints", customer?._id],
        queryFn: () => getCustomerComplaints(customer._id),
        enabled: !!customer?._id,
    });

    const customerComplaints = complaintsData?.data?.result || [];

    const updateCalendarMutation = useMutation({
        mutationFn: async ({ date, subscriptions }) => {
            const promises = subscriptions.map(sub => {
                if (sub.subscriptionId) {
                    return updateAdminDailyModification({
                        subscriptionId: sub.subscriptionId,
                        date: date,
                        quantity: sub.quantity
                    });
                }
                return Promise.resolve();
            });
            return Promise.all(promises);
        },
        onSuccess: () => {
            alert("Calendar updated successfully for the selected date!");
            setIsCalendarModalOpen(false);
        },
        onError: (err) => {
            console.error(err);
            alert("Failed to update calendar: " + err.message);
        }
    });

    const handleCalendarSave = (data) => {
        updateCalendarMutation.mutate(data);
    };

    const updateMutation = useMutation({
        mutationFn: (formData) => updateCustomer({ id, data: formData }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["customer", id] });
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            setIsEditModalOpen(false);
            setIsCreditLimitModalOpen(false);

            const riderName = data?.result?.deliveryBoy?.name || "None";
            toast.success(`Customer updated. Rider: ${riderName}`);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to update customer");
        },
    });

    const handleUpdateCustomer = (formData) => {
        updateMutation.mutate(formData);
    };

    const addPaymentMutation = useMutation({
        mutationFn: addPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", id] });
            queryClient.invalidateQueries({ queryKey: ["adminCalendar", customer?._id] });
            setIsPaymentModalOpen(false);
            alert("Payment added successfully!");
        },
        onError: (err) => {
            alert(err.response?.data?.message || "Failed to add payment");
        },
    });

    const handleAddPayment = (formData) => {
        addPaymentMutation.mutate({
            userId: customer._id,
            amount: formData.amount,
            type: formData.paymentType === 'Credit' ? 'CREDIT' : 'DEBIT',
            mode: formData.paymentMode.toUpperCase(),
            description: formData.note,
            adjustmentNote: formData.paymentType === 'Credit' ? formData.adjustmentPositiveNote : formData.adjustmentNegativeNote,
            invoice: formData.invoice
        });
    };

    const addSubscriptionMutation = useMutation({
        mutationFn: createSubscription,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", id] });
            queryClient.invalidateQueries({ queryKey: ["customerSubscriptions", customer?._id] });
            queryClient.invalidateQueries({ queryKey: ["adminCalendar", customer?._id] });
            setIsSubscriptionModalOpen(false);
            alert("Subscription created successfully!");
        },
        onError: (err) => {
            alert(err.response?.data?.message || "Failed to create subscription");
        },
    });

    const handleAddSubscription = (formData) => {
        addSubscriptionMutation.mutate({
            product: formData.product,
            quantity: formData.quantity,
            frequency: formData.frequency,
            startDate: formData.startDate,
            isTrial: formData.subscriptionType === 'Trial',
            customDays: formData.frequency === 'Custom' ? formData.customDays : [], // Assuming modal handles this
            userId: customer._id
            // Add other fields if needed
        });
    };

    const addDeliveryMutation = useMutation({
        mutationFn: createOrder,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["customer", id] });
            queryClient.invalidateQueries({ queryKey: ["adminCalendar", customer?._id] });
            setIsDeliveryModalOpen(false);
            if (variables._mode === "spot") {
                toast.success("Spot sale recorded successfully!");
            } else {
                toast.success("Order placed! Wallet will be debited on delivery.");
            }
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to save record");
        },
    });

    const handleAddDelivery = (formData) => {
        const selectedProduct = products.find((p) => p._id === formData.product);
        const isSpot = formData.mode === "spot";

        const payload = {
            customerId: customer._id,
            products: [{
                product: formData.product,
                name: selectedProduct?.name || "Unknown Product",
                quantity: Number(formData.quantity),
                price: Number(selectedProduct?.price || 0),
            }],
            totalAmount: Number(formData.price),
            deliveryDate: formData.date,
            paymentMode: formData.paymentMode,
            assignedRider: formData.deliveryBoy || null,
            deliveryBoy: formData.deliveryBoy || null,
            notes: formData.note || "",
            bottlesReturned: Number(formData.bottlesReturned || 0),
            // Internal flag used in onSuccess callback only — not sent to API
            _mode: formData.mode,
        };

        if (isSpot) {
            // Spot Sale: already happened — mark delivered immediately, payment collected on-spot (not wallet)
            payload.status = "delivered";
            payload.paymentStatus = "paid";
            payload.orderType = "spot_sale";
        } else {
            // One Time Order: scheduled, pending, deduct from wallet
            payload.status = "pending";
            payload.paymentStatus = "pending";
            payload.orderType = "one_time";
        }

        addDeliveryMutation.mutate(payload);
    };

    const updateSubscriptionMutation = useMutation({
        mutationFn: updateSubscription,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", id] });
            queryClient.invalidateQueries({ queryKey: ["customerSubscriptions", customer?._id] });
            queryClient.invalidateQueries({ queryKey: ["adminCalendar", customer?._id] });
            setIsEditSubscriptionModalOpen(false);
            alert("Subscription updated successfully!");
        },
        onError: (err) => {
            alert(err.response?.data?.message || "Failed to update subscription");
        },
    });

    const handleUpdateSubscription = (formData) => {
        updateSubscriptionMutation.mutate({
            id: formData.subscriptionId,
            data: {
                product: formData.product,
                startDate: formData.startDate,
                endDate: formData.endDate || null,
                frequency: formData.frequency,
                quantity: formData.quantity,
                alternateQuantity: formData.altQuantity,
                status: formData.status,
                note: formData.note
            }
        });
    };

    const changeRequestMutation = useMutation({
        mutationFn: async (data) => {
            const targetSubs = data.scope === 'All' ? customerSubscriptions :
                customerSubscriptions.filter(sub => Array.isArray(data.subscriptionIds) && data.subscriptionIds.includes(sub._id));

            if (data.changeType === 'status') {
                if (data.status === 'Vacation') {
                    // Adjust endDate: If they resume on the 25th, vacation ends on the 24th
                    let endDate = data.resumeFrom;
                    if (endDate) {
                        const d = new Date(endDate);
                        d.setDate(d.getDate() - 1);
                        endDate = d.toISOString().split('T')[0];
                    } else {
                        // If no resume date, set a far future date for now (backend currently requires it)
                        const d = new Date();
                        d.setFullYear(d.getFullYear() + 10);
                        endDate = d.toISOString().split('T')[0];
                    }

                    return updateVacation({
                        customerId: data.customerId,
                        startDate: data.effectFrom,
                        endDate: endDate,
                        reason: data.note
                    });
                } else {
                    const promises = targetSubs.map(sub =>
                        updateSubscription({
                            id: sub._id,
                            data: {
                                status: data.status.toLowerCase(),
                                note: data.note
                            }
                        })
                    );
                    return Promise.all(promises);
                }
            } else if (data.changeType === 'pattern') {
                const promises = targetSubs.map(sub =>
                    updateSubscription({
                        id: sub._id,
                        data: {
                            frequency: data.frequency || sub.frequency,
                            quantity: data.quantity || sub.quantity,
                            alternateQuantity: data.altQuantity || sub.alternateQuantity,
                            customSchedule: data.frequency === 'Custom' ? data.customSchedule : sub.customSchedule,
                            startDate: data.effectFrom || sub.startDate,
                            note: data.note
                        }
                    })
                );
                return Promise.all(promises);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", id] });
            queryClient.invalidateQueries({ queryKey: ["customerSubscriptions", customer?._id] });
            queryClient.invalidateQueries({ queryKey: ["adminCalendar", customer?._id] });
            setIsChangeRequestModalOpen(false);
            toast.success("Change request processed successfully!");
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to process request");
        }
    });

    const createTicketMutation = useMutation({
        mutationFn: createComplaint,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", id] });
            queryClient.invalidateQueries({ queryKey: ["customerComplaints", customer?._id] });
            setIsTicketModalOpen(false);
            toast.success("Ticket created successfully!");
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to create ticket");
        }
    });

    const handleCreateTicket = (data) => {
        createTicketMutation.mutate(data);
    };

    const handleChangeRequest = (data) => {
        changeRequestMutation.mutate(data);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (error || !customer) {
        return (
            <div className="p-6">
                <div className="alert alert-error">
                    <span>Customer not found</span>
                </div>
                <Link to="/administrator/dashboard/customers" className="btn btn-ghost mt-4">
                    ← Back to Customers
                </Link>
            </div>
        );
    }

    const tabs = [
        "Subscriptions",
        "Trials",
        "History",
        "Invoices",
        "Wallet",
        "PG Transaction",
        "Activity Log",
        "SMS Log",
        "Notification Log",
        "Tickets",
        "Discounts",
        "Call Logs",
    ];

    return (
        <div className="p-4 space-y-4">
            {/* Edit Modal */}
            <EditCustomerModal
                customer={customer}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onUpdate={handleUpdateCustomer}
            />

            {/* Edit Credit Limit Modal */}
            <EditCreditLimitModal
                customer={customer}
                isOpen={isCreditLimitModalOpen}
                onClose={() => setIsCreditLimitModalOpen(false)}
                onSave={handleUpdateCustomer}
            />

            {/* Create Ticket Modal */}
            <CreateTicketModal
                customer={customer}
                isOpen={isTicketModalOpen}
                onClose={() => setIsTicketModalOpen(false)}
                onSave={handleCreateTicket}
            />

            {/* Add Subscription Modal */}
            <AddSubscriptionModal
                customer={customer}
                products={products}
                isOpen={isSubscriptionModalOpen}
                onClose={() => setIsSubscriptionModalOpen(false)}
                onSave={handleAddSubscription}
            />

            {/* Edit Subscription Modal */}
            <EditSubscriptionModal
                customer={customer}
                products={products}
                subscription={selectedSubscription}
                isOpen={isEditSubscriptionModalOpen}
                onClose={() => setIsEditSubscriptionModalOpen(false)}
                onSave={handleUpdateSubscription}
            />

            {/* Add Delivery Modal */}
            <AddDeliveryModal
                customer={customer}
                products={products}
                isOpen={isDeliveryModalOpen}
                onClose={() => setIsDeliveryModalOpen(false)}
                onSave={handleAddDelivery}
                mode={deliveryModalMode}
            />


            {/* Change Request Modal */}
            <ChangeRequestModal
                customer={customer}
                subscriptions={customerSubscriptions}
                isOpen={isChangeRequestModalOpen}
                onClose={() => setIsChangeRequestModalOpen(false)}
                onSave={handleChangeRequest}
                initialType={changeModalConfig.type}
                initialStatus={changeModalConfig.status}
            />

            <AddPaymentModal
                customer={customer}
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSave={handleAddPayment}
            />

            <CreatePaymentLinkModal
                customer={customer}
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
            />

            <MergeCustomersModal
                sourceCustomer={customer}
                isOpen={isMergeModalOpen}
                onClose={() => setIsMergeModalOpen(false)}
            />

            <TempOtpModal
                target={customer}
                fetchFn={getTempOtp}
                isOpen={isTempOtpModalOpen}
                onClose={() => setIsTempOtpModalOpen(false)}
            />

            {/* Edit Calendar Modal */}
            <EditCalendarModal
                customer={{ ...customer, subscriptions: customerSubscriptions }}
                isOpen={isCalendarModalOpen}
                onClose={() => setIsCalendarModalOpen(false)}
                onSave={handleCalendarSave}
            />

            {/* Breadcrumb */}
            <div className="text-sm breadcrumbs">
                <ul>
                    <li><Link to="/administrator/dashboard">HOME</Link></li>
                    <li><Link to="/administrator/dashboard/customers">CUSTOMERS</Link></li>
                    <li className="font-semibold">{customer.name?.toUpperCase() || "CUSTOMER"}</li>
                </ul>
            </div>

            {/* Main Card */}
            <div className="card bg-base-100 shadow-lg">
                <div className="card-body p-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="avatar">
                                <div className="bg-neutral text-neutral-content rounded-full w-10 sm:w-12">
                                    {customer.profilePicture ? (
                                        <img src={customer.profilePicture} alt={customer.name} />
                                    ) : (
                                        <span className="text-lg sm:text-xl">{customer.name?.charAt(0) || "C"}</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold">{customer.name || "Unknown"}</h2>
                                <div className="flex gap-2">
                                    {customer.role === "LEAD" && (
                                        <span className="badge badge-sm badge-outline border-purple-400 text-purple-600 bg-purple-50">LEAD</span>
                                    )}
                                    <span className={`badge badge-sm ${customer.isActive !== false ? "badge-success" : "badge-error"}`}>
                                        {customer.isActive !== false ? "Active" : "Inactive"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            {customer.role === "LEAD" && (
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleUpdateCustomer({ role: 'CUSTOMER' })}
                                >
                                    Convert to Customer
                                </button>
                            )}
                            <button
                                className="btn btn-sm btn-info text-white"
                                onClick={() => setIsEditModalOpen(true)}
                            >
                                ✏️ Edit
                            </button>
                            <Link to="/administrator/dashboard/customers" className="btn btn-sm btn-ghost">✕</Link>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Left Column - Customer Info */}
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">📋</span>
                                <div>
                                    <div className="text-gray-500">Customer ID</div>
                                    <div className="font-medium">{customer.customerId || "-"}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">📱</span>
                                <div>
                                    <div className="text-gray-500">Mobile Number</div>
                                    <div className="font-medium flex items-center gap-2">
                                        {customer.mobile || "-"}
                                        <button className="btn btn-xs btn-ghost">💬</button>
                                        <button className="btn btn-xs btn-ghost">📞</button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">📍</span>
                                <div>
                                    <div className="text-gray-500">Address</div>
                                    <div className="font-medium">
                                        {customer.address?.fullAddress ||
                                            `${customer.address?.houseNo || ""} ${customer.address?.floor || ""} ${customer.address?.area || ""} ${customer.address?.landmark || ""} `.trim() ||
                                            "-"}
                                    </div>
                                    {customer.serviceArea && (
                                        <div className="mt-1">
                                            <span className="text-[10px] uppercase font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                                                {customer.serviceArea.name || customer.serviceArea}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">🏢</span>
                                <div>
                                    <div className="text-gray-500">Associated Hub</div>
                                    <div className="font-medium">{customer.hub?.name || customer.hub || "Not assigned"}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">📅</span>
                                <div>
                                    <div className="text-gray-500">Created At</div>
                                    <div className="font-medium">
                                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB') + ' ' + new Date(customer.createdAt).toLocaleTimeString() : "-"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Middle Column - Delivery Info */}
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">🚚</span>
                                <div>
                                    <div className="text-gray-500">Delivery Boy</div>
                                    <div className="font-medium">{customer.deliveryBoy?.name || customer.deliveryBoy?._id || customer.deliveryBoy || "Not assigned"}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">🔔</span>
                                <div>
                                    <div className="text-gray-500">Delivery Preference (Today)</div>
                                    <div className="font-medium badge badge-outline">
                                        {(() => {
                                            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                            const today = days[new Date().getDay()];
                                            return customer.deliveryPreferences?.[today] || customer.deliveryPreference || "Ring Bell";
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">👤</span>
                                <div>
                                    <div className="text-gray-500">CRM Agent</div>
                                    <div className="font-medium">{customer.crmAgent || "Not set"}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">⏸️</span>
                                <div>
                                    <div className="text-gray-500">Temporary Status</div>
                                    <div className="font-medium">{customer.temporaryStatus || "Not set"}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">💳</span>
                                <div>
                                    <div className="text-gray-500">Billing Type</div>
                                    <div className="font-medium">{customer.billingType || "Prepaid"}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">📱</span>
                                <div>
                                    <div className="text-gray-500">Device Type</div>
                                    <div className="font-medium">{customer.deviceType || "Unknown"}</div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Action Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                            <button className="btn btn-xs sm:btn-sm btn-info text-white" onClick={() => setIsCalendarModalOpen(true)}>📅 Calendar</button>
                            <button
                                className="btn btn-xs sm:btn-sm btn-warning text-white"
                                onClick={() => {
                                    setChangeModalConfig({ type: "status", status: "Active" });
                                    setIsChangeRequestModalOpen(true);
                                }}
                            >🔄 Change</button>
                            <button className="btn btn-xs sm:btn-sm btn-info text-white" onClick={() => { setDeliveryModalMode("normal"); setIsDeliveryModalOpen(true); }}>📦 One Time Order</button>
                            <button className="btn btn-xs sm:btn-sm btn-error text-white" onClick={() => { setDeliveryModalMode("spot"); setIsDeliveryModalOpen(true); }}>🏪 Spot Sale</button>
                            <button className="btn btn-xs sm:btn-sm btn-warning text-white" onClick={() => setIsPaymentModalOpen(true)}>💰 Payment</button>
                            <button className="btn btn-xs sm:btn-sm btn-primary text-white" onClick={() => setIsTicketModalOpen(true)}>🎫 Ticket</button>
                            <button className="btn btn-xs sm:btn-sm btn-success text-white" onClick={() => setIsSubscriptionModalOpen(true)}>📦 Subscribe</button>
                            <button className="btn btn-xs sm:btn-sm btn-info text-white" onClick={() => setIsTempOtpModalOpen(true)}>🔑 Temp OTP</button>
                            <button className="btn btn-xs sm:btn-sm btn-success text-white" onClick={() => setIsMergeModalOpen(true)}>🔀 Merge</button>
                            <button className="btn btn-xs sm:btn-sm btn-primary text-white" onClick={() => setIsLinkModalOpen(true)}>🔗 Link</button>
                            <button
                                className="btn btn-xs sm:btn-sm btn-success text-white"
                                onClick={() => {
                                    setChangeModalConfig({ type: "status", status: "Vacation" });
                                    setIsChangeRequestModalOpen(true);
                                }}
                            >🏖️ Vacation</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card bg-base-100 shadow">
                    <div className="card-body p-4">
                        <h3 className="text-2xl font-bold">₹ {customer.walletBalance?.toFixed(2) || "0.00"}</h3>
                        <p className="text-gray-500">Wallet</p>
                        <a href="#" className="link link-info text-sm">Voucher Bonus</a>
                    </div>
                </div>

                <div className="card bg-base-100 shadow">
                    <div className="card-body p-4">
                        <h3 className="text-2xl font-bold">₹ {customer.unbilledConsumption?.toFixed(2) || "0.00"}</h3>
                        <p className="text-gray-500">Unbilled Consumption</p>
                        <p className="text-xs text-gray-400">Delivery Charge: ₹ 0</p>
                        <div className="flex flex-col gap-1 mt-1">
                            <a href="#" className="link link-info text-sm">Show more</a>
                            <a href="#" className="link link-info text-sm">Download Interim Invoice</a>
                        </div>
                    </div>
                </div>

                <div className="card bg-warning shadow">
                    <div className="card-body p-4 text-white">
                        <h3 className="text-2xl font-bold">₹ {((customer.walletBalance || 0) + (customer.creditLimit || 0) - (customer.unbilledConsumption || 0)).toFixed(2)}</h3>
                        <p>Effective Balance</p>
                    </div>
                </div>

                <div className="card bg-base-100 shadow">
                    <div className="card-body p-4">
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            ₹ {customer.creditLimit?.toFixed(2) || "0.00"}
                            <button className="btn btn-xs btn-ghost" onClick={() => setIsCreditLimitModalOpen(true)}>✏️</button>
                        </h3>
                        <p className="text-gray-500">Credit Limit</p>
                    </div>
                </div>
            </div>

            {/* Notes & Follow Up Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card bg-base-100 shadow">
                    <div className="card-body p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-gray-500 text-sm">Follow Up Date:</label>
                                <div className="flex items-center gap-2">
                                    <span>{customer.followUpDate || "-"}</span>
                                    <button className="btn btn-xs btn-ghost">✏️</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-gray-500 text-sm">Open Tickets:</label>
                                <div className="flex items-center gap-2">
                                    <span>{customer.openTickets || 0}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-gray-500 text-sm">Notes:</label>
                                <div className="flex items-center gap-2">
                                    <span>{customer.notes || "-"}</span>
                                    <button className="btn btn-xs btn-ghost">✏️</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-gray-500 text-sm">Remaining Bottles:</label>
                                <div>{customer.remainingBottles || 0}</div>
                            </div>
                            <div className="col-span-2">
                                <label className="text-gray-500 text-sm">Adjustment So Far:</label>
                                <div>₹ {customer.adjustmentSoFar?.toFixed(2) || "0.00"}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="card bg-base-100 shadow">
                <div className="card-body p-4">
                    <div className="tabs tabs-boxed bg-base-200 flex-wrap">
                        {tabs.map((tab) => (
                            <a
                                key={tab}
                                className={`tab ${activeTab === tab.toLowerCase().replace(" ", "_") ? "tab-active" : ""} `}
                                onClick={() => setActiveTab(tab.toLowerCase().replace(" ", "_"))}
                            >
                                {tab}
                            </a>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="mt-4">
                        {activeTab === "subscriptions" && (
                            <div className="overflow-x-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <span>Show</span>
                                        <select className="select select-bordered select-sm">
                                            <option>10</option>
                                            <option>25</option>
                                            <option>100</option>
                                        </select>
                                        <span>entries</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn btn-sm btn-outline">Refresh</button>
                                        <button className="btn btn-sm btn-outline">Reset</button>
                                    </div>
                                </div>

                                <table className="table table-zebra w-full">
                                    <thead className="bg-base-200">
                                        <tr>
                                            <th>Sub. Id</th>
                                            <th>Product Name</th>
                                            <th>Frequency</th>
                                            <th>Quantity</th>
                                            <th>Alt Quantity</th>
                                            <th>Status</th>
                                            <th>Note</th>
                                            <th>Time Slot</th>
                                            <th>Delivery Boy</th>
                                            <th>Address</th>
                                            <th>Area</th>
                                            <th>Hub Name</th>
                                            <th>Start Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerSubscriptions.length === 0 ? (
                                            <tr>
                                                <td colSpan="13" className="text-center text-gray-500 py-8">
                                                    No subscriptions found
                                                </td>
                                            </tr>
                                        ) : (
                                            customerSubscriptions.map((sub) => (
                                                <tr key={sub._id}>
                                                    <td>{sub._id.slice(-6).toUpperCase()}</td>
                                                    <td>{sub.product?.name || "Unknown"}</td>
                                                    <td>{sub.frequency}</td>
                                                    <td>{sub.quantity}</td>
                                                    <td>{sub.alternateQuantity || "-"}</td>
                                                    <td>
                                                        <span className={`badge ${sub.status === 'active' ? 'badge-success' : 'badge-error'} badge-sm`}>
                                                            {sub.status}
                                                        </span>
                                                    </td>
                                                    <td>{sub.note || "-"}</td>
                                                    <td>{sub.timeSlot || "Morning"}</td>
                                                    <td>{customer.deliveryBoy?.name || customer.deliveryBoy?._id || customer.deliveryBoy || "-"}</td>
                                                    <td className="max-w-xs truncate" title={customer.address?.fullAddress}>{customer.address?.fullAddress}</td>
                                                    <td>{customer.area?.name || "-"}</td>
                                                    <td>{customer.hub?.name || "-"}</td>
                                                    <td>{new Date(sub.startDate).toLocaleDateString('en-GB')}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-ghost btn-xs text-info"
                                                            onClick={() => {
                                                                setSelectedSubscription(sub);
                                                                setIsEditSubscriptionModalOpen(true);
                                                            }}
                                                        >
                                                            ✏️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "activity_log" && (
                            <div className="overflow-x-auto">
                                <ActivityLogTable customerId={customer._id} />
                            </div>
                        )}

                        {activeTab === "trials" && (
                            <div className="overflow-x-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <span>Show</span>
                                        <select className="select select-bordered select-sm">
                                            <option>10</option>
                                            <option>25</option>
                                            <option>100</option>
                                        </select>
                                        <span>entries</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            className="btn btn-sm btn-warning"
                                            onClick={async () => {
                                                // Get unique subcategories from trial subscriptions
                                                const trialSubs = customerSubscriptions.filter(s => s.isTrial);
                                                if (trialSubs.length === 0) {
                                                    toast.error("No trial subscriptions to reset");
                                                    return;
                                                }
                                                // Get unique subcategory IDs from trial products
                                                const subcategoryIds = [...new Set(
                                                    trialSubs
                                                        .map(s => s.product?.subcategory?._id || s.product?.subcategory)
                                                        .filter(Boolean)
                                                )];
                                                if (subcategoryIds.length === 0) {
                                                    // Fallback: reset by first trial product's subcategory
                                                    toast.error("No subcategory found for trial products");
                                                    return;
                                                }
                                                try {
                                                    for (const subcatId of subcategoryIds) {
                                                        await resetTrialEligibility({ userId: customer._id, subcategoryId: subcatId });
                                                    }
                                                    queryClient.invalidateQueries({ queryKey: ["customerSubscriptions", customer._id] });
                                                    toast.success("Trial eligibility reset! Customer can now take new trials.");
                                                } catch (err) {
                                                    toast.error(err.response?.data?.message || "Failed to reset trial eligibility");
                                                }
                                            }}
                                        >
                                            🔄 Reset Trial Eligibility
                                        </button>
                                        <button className="btn btn-sm btn-outline">Refresh</button>
                                    </div>
                                </div>

                                <table className="table table-zebra w-full">
                                    <thead className="bg-base-200">
                                        <tr>
                                            <th>Trial ID</th>
                                            <th>Product Name</th>
                                            <th>Frequency</th>
                                            <th>Quantity</th>
                                            <th>Status</th>
                                            <th>Start Date</th>
                                            <th>End Date</th>
                                            <th>Amount Paid</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerSubscriptions.filter(sub => sub.isTrial).length === 0 ? (
                                            <tr>
                                                <td colSpan="9" className="text-center text-gray-500 py-8">
                                                    No trial subscriptions found
                                                </td>
                                            </tr>
                                        ) : (
                                            customerSubscriptions.filter(sub => sub.isTrial).map((sub) => (
                                                <tr key={sub._id}>
                                                    <td>{sub._id.slice(-6).toUpperCase()}</td>
                                                    <td>{sub.product?.name || "Unknown"}</td>
                                                    <td>{sub.frequency}</td>
                                                    <td>{sub.quantity}</td>
                                                    <td>
                                                        <span className={`badge ${sub.status === 'active' ? 'badge-success' : 'badge-error'} badge-sm`}>
                                                            {sub.status}
                                                        </span>
                                                    </td>
                                                    <td>{sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-GB') : "-"}</td>
                                                    <td>{sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-GB') : "-"}</td>
                                                    <td>₹{sub.trialPaidAmount || 0}</td>
                                                    <td>
                                                        <button className="btn btn-xs btn-ghost">View</button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "invoices" && (
                            <CustomerInvoicesTab customerId={customer._id} />
                        )}

                        {activeTab === "pg_transaction" && (
                            <div className="overflow-x-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <span>Show</span>
                                        <select className="select select-bordered select-sm">
                                            <option>10</option>
                                            <option>25</option>
                                            <option>100</option>
                                        </select>
                                        <span>entries</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn btn-sm btn-outline">Refresh</button>
                                        <button className="btn btn-sm btn-outline">Reset</button>
                                    </div>
                                </div>

                                <table className="table table-zebra w-full">
                                    <thead className="bg-base-200">
                                        <tr>
                                            <th>Transaction ID</th>
                                            <th>Date & Time</th>
                                            <th>Amount</th>
                                            <th>Type</th>
                                            <th>Mode</th>
                                            <th>Status</th>
                                            <th>Description</th>
                                            <th>Balance After</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td colSpan="9" className="text-center text-gray-500 py-8">
                                                No payment gateway transactions found
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "tickets" && (
                            <div className="overflow-x-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <span>Show</span>
                                        <select className="select select-bordered select-sm">
                                            <option>10</option>
                                            <option>25</option>
                                            <option>100</option>
                                        </select>
                                        <span>entries</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn btn-sm btn-outline">Refresh</button>
                                        <button className="btn btn-sm btn-outline">Reset</button>
                                    </div>
                                </div>

                                <table className="table table-zebra w-full">
                                    <thead className="bg-base-200">
                                        <tr>
                                            <th>Ticket ID</th>
                                            <th>Date Created</th>
                                            <th>Subject</th>
                                            <th>Category</th>
                                            <th>Priority</th>
                                            <th>Status</th>
                                            <th>Assigned To</th>
                                            <th>Last Updated</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerComplaints.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" className="text-center text-gray-500 py-8">
                                                    No tickets found
                                                </td>
                                            </tr>
                                        ) : (
                                            customerComplaints.map((complaint) => (
                                                <tr key={complaint._id}>
                                                    <td className="font-mono text-xs">{complaint._id.slice(-6).toUpperCase()}</td>
                                                    <td>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{new Date(complaint.createdAt).toLocaleDateString('en-GB')}</span>
                                                            <span className="text-xs opacity-70">{new Date(complaint.createdAt).toLocaleTimeString()}</span>
                                                        </div>
                                                    </td>
                                                    <td>{complaint.subject}</td>
                                                    <td>
                                                        <span className="badge badge-sm badge-outline">{complaint.category}</span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge badge-sm ${complaint.priority === 'High' ? 'badge-error' :
                                                            complaint.priority === 'Medium' ? 'badge-warning' :
                                                                'badge-info'
                                                            }`}>
                                                            {complaint.priority}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge badge-sm ${complaint.status === 'Open' ? 'badge-error' :
                                                            complaint.status === 'In Progress' ? 'badge-warning' :
                                                                complaint.status === 'Resolved' ? 'badge-success' :
                                                                    'badge-ghost'
                                                            }`}>
                                                            {complaint.status}
                                                        </span>
                                                    </td>
                                                    <td>{complaint.assignedTo?.name || "Unassigned"}</td>
                                                    <td>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{new Date(complaint.updatedAt).toLocaleDateString('en-GB')}</span>
                                                            <span className="text-xs opacity-70">{new Date(complaint.updatedAt).toLocaleTimeString()}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-xs btn-ghost">View</button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab !== "subscriptions" && activeTab !== "activity_log" && activeTab !== "trials" && activeTab !== "pg_transaction" && activeTab !== "tickets" && (
                            <div className="text-center text-gray-500 py-8">
                                {activeTab.replace("_", " ").charAt(0).toUpperCase() + activeTab.replace("_", " ").slice(1)} - Coming soon
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
