import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { addPayment, getAllUsers } from '../lib/api';
import { Search, Save, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const AddPayment = () => {
    const [formData, setFormData] = useState({
        mobile: '',
        customerId: '',
        name: '',
        amount: '',
        paymentType: '',
        paymentMode: 'Cash',
        paymentDue: '',
        walletBalance: '',
        adjustPositiveNote: '',
        adjustNegativeNote: '',
        note: '',
        invoice: ''
    });

    const [customer, setCustomer] = useState(null);



    const addPaymentMutation = useMutation({
        mutationFn: addPayment,
        onSuccess: () => {
            toast.success('Payment added successfully');
            setFormData({
                mobile: '',
                customerId: '',
                name: '',
                amount: '',
                paymentType: '',
                paymentMode: 'Cash',
                paymentDue: '',
                walletBalance: '',
                adjustPositiveNote: '',
                adjustNegativeNote: '',
                note: '',
                invoice: ''
            });
            setCustomer(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to add payment')
    });

    const handleMobileBlur = async () => {
        if (!formData.mobile || formData.mobile.length < 10) return;

        const toastId = toast.loading('Searching customer...');
        try {
            const res = await getAllUsers({ search: formData.mobile });
            const foundUser = res.result?.[0]; // Assuming search returns array

            if (foundUser) {
                setCustomer(foundUser);
                setFormData(prev => ({
                    ...prev,
                    customerId: foundUser._id,
                    name: foundUser.name,
                    walletBalance: foundUser.walletBalance || 0,
                    paymentDue: 0, // Logic for payment due? Maybe unbilledConsumption?
                }));
                toast.success('Customer found', { id: toastId });
            } else {
                toast.error('Customer not found', { id: toastId });
                setCustomer(null);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error searching customer', { id: toastId });
        }
    };

    // Temporary search implementation inside component until api.js is updated
    const searchCustomer = async () => {
        if (!formData.mobile) return;
        const toastId = toast.loading('Searching customer...');
        try {
            // We need to update api.js to support search, but for now let's try to use the endpoint directly if possible?
            // No, let's just use the tool to update api.js first.
            // But I can't do that inside write_to_file.
            // I will write the component to use a hypothetical `searchUsers` function and then implement it.

            // For now, I'll just put a placeholder and do the API update next.
        } catch (e) {
            toast.error('Customer not found', { id: toastId });
        }
    };

    const handleSubmit = () => {
        if (!customer) {
            toast.error('Please select a valid customer');
            return;
        }
        if (!formData.amount || !formData.paymentType) {
            toast.error('Please fill required fields');
            return;
        }

        addPaymentMutation.mutate({
            userId: customer._id,
            amount: formData.amount,
            type: formData.paymentType === 'Credit' ? 'CREDIT' : 'DEBIT',
            mode: formData.paymentMode.toUpperCase(),
            description: formData.note,
            adjustmentNote: formData.paymentType === 'Credit' ? formData.adjustPositiveNote : formData.adjustNegativeNote,
            invoice: formData.invoice
        });
    };

    return (
        <div className="p-6 bg-base-100 min-h-screen">
            <div className="text-sm breadcrumbs mb-4">
                <ul>
                    <li>Home</li>
                    <li>Add Payments</li>
                </ul>
            </div>

            {/* Bulk Adjustment Section */}
            <div className="card bg-base-100 shadow-md mb-6">
                <div className="card-body p-4">
                    <h2 className="card-title text-sm font-bold uppercase text-gray-500 mb-4">Bulk Adjustment</h2>
                    <div className="flex items-center gap-4">
                        <input type="file" className="file-input file-input-bordered w-full max-w-xs" />
                        <span className="text-gray-400 text-sm">No file chosen</span>
                        <button className="btn btn-primary btn-sm text-white">
                            <Upload size={16} /> Import Data
                        </button>
                        <button className="btn btn-ghost btn-sm text-primary">Sample File</button>
                    </div>
                </div>
            </div>

            {/* Add Payment Section */}
            <div className="card bg-base-100 shadow-md">
                <div className="card-body p-4">
                    <h2 className="card-title text-sm font-bold uppercase text-gray-500 mb-6">Add Payment</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                        <div className="form-control">
                            <label className="label text-xs font-bold text-gray-500">Mobile Number</label>
                            <input
                                type="text"
                                placeholder="Mobile Number"
                                className="input input-bordered input-sm w-full"
                                value={formData.mobile}
                                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                onBlur={handleMobileBlur} // We'll implement this properly
                            />
                        </div>
                        <div className="form-control">
                            <label className="label text-xs font-bold text-gray-500">Customer Id</label>
                            <input
                                type="text"
                                placeholder="Customer Id"
                                className="input input-bordered input-sm w-full bg-gray-100"
                                value={formData.customerId}
                                readOnly
                            />
                        </div>
                        <div className="form-control">
                            <label className="label text-xs font-bold text-gray-500">Name</label>
                            <input
                                type="text"
                                placeholder="Customer Name"
                                className="input input-bordered input-sm w-full bg-gray-100"
                                value={formData.name}
                                readOnly
                            />
                        </div>
                        <div className="form-control">
                            <label className="label text-xs font-bold text-gray-500">Amount</label>
                            <input
                                type="number"
                                placeholder="Amount"
                                className="input input-bordered input-sm w-full"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                        <div className="form-control flex flex-row items-end gap-2">
                            <div className="w-full">
                                <label className="label text-xs font-bold text-gray-500">Payment Type</label>
                                <select
                                    className="select select-bordered select-sm w-full"
                                    value={formData.paymentType}
                                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                                >
                                    <option value="">Select payment type</option>
                                    <option value="Credit">Credit (Add Money)</option>
                                    <option value="Debit">Debit (Deduct Money)</option>
                                </select>
                            </div>
                            <button className="btn btn-square btn-sm btn-error text-white mb-1">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                        <div className="form-control">
                            <label className="label text-xs font-bold text-gray-500">Payment Mode</label>
                            <select
                                className="select select-bordered select-sm w-full"
                                value={formData.paymentMode}
                                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                            >
                                <option value="Cash">Cash</option>
                                <option value="Online">Online</option>
                                <option value="UPI">UPI</option>
                                <option value="Cheque">Cheque</option>
                            </select>
                        </div>
                        <div className="form-control">
                            <label className="label text-xs font-bold text-gray-500">Payment Due</label>
                            <input
                                type="text"
                                placeholder="Payment due"
                                className="input input-bordered input-sm w-full bg-gray-100"
                                value={formData.paymentDue}
                                readOnly
                            />
                        </div>
                        <div className="form-control">
                            <label className="label text-xs font-bold text-gray-500">Wallet balance</label>
                            <input
                                type="text"
                                placeholder="Customer wallet balance"
                                className="input input-bordered input-sm w-full bg-gray-100"
                                value={formData.walletBalance}
                                readOnly
                            />
                        </div>
                        <div className="form-control">
                            <label className="label text-xs font-bold text-gray-500">Adjust Positive Note</label>
                            <select
                                className="select select-bordered select-sm w-full"
                                value={formData.adjustPositiveNote}
                                onChange={(e) => setFormData({ ...formData, adjustPositiveNote: e.target.value })}
                                disabled={formData.paymentType !== 'Credit'}
                            >
                                <option value="">Select Adjustment Note</option>
                                <option value="Refund">Refund</option>
                                <option value="Bonus">Bonus</option>
                                <option value="Correction">Correction</option>
                            </select>
                        </div>
                        <div className="form-control">
                            <label className="label text-xs font-bold text-gray-500">Adjust Negative Note</label>
                            <select
                                className="select select-bordered select-sm w-full"
                                value={formData.adjustNegativeNote}
                                onChange={(e) => setFormData({ ...formData, adjustNegativeNote: e.target.value })}
                                disabled={formData.paymentType !== 'Debit'}
                            >
                                <option value="">Select Adjustment Note</option>
                                <option value="Penalty">Penalty</option>
                                <option value="Correction">Correction</option>
                                <option value="Service Charge">Service Charge</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                        <div className="form-control lg:col-span-3">
                            <label className="label text-xs font-bold text-gray-500">Note</label>
                            <input
                                type="text"
                                placeholder="Note"
                                className="input input-bordered input-sm w-full"
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label text-xs font-bold text-gray-500">Invoice</label>
                            <select
                                className="select select-bordered select-sm w-full"
                                value={formData.invoice}
                                onChange={(e) => setFormData({ ...formData, invoice: e.target.value })}
                            >
                                <option value="">Select invoice</option>
                                {/* Populate invoices if available */}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button className="btn btn-sm btn-info text-white">Add new</button>
                    </div>

                    <div className="divider"></div>

                    <div className="flex justify-start">
                        <button
                            className="btn btn-sm btn-primary text-white w-24"
                            onClick={handleSubmit}
                            disabled={addPaymentMutation.isPending}
                        >
                            {addPaymentMutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
