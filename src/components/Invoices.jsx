import React, { useState } from 'react';
import { FileText, Download, Eye, Search, Filter, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { InvoiceViewModal } from './modals/InvoiceViewModal';

export const Invoices = () => {
    const [statusFilter, setStatusFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const [viewInvoice, setViewInvoice] = useState(null);
    const [isAutoDownload, setIsAutoDownload] = useState(false);

    // Fetch Invoices
    const { data: invoicesData, isLoading, error } = useQuery({
        queryKey: ['invoices', statusFilter, searchQuery],
        queryFn: async () => {
            // In a real app, pass filters to API. For now, fetch all and client-side filter or simple API
            const response = await axiosInstance.get('/api/invoices');
            return response.data.invoices;
        }
    });

    const invoices = invoicesData || [];

    const filteredInvoices = invoices.filter(inv => {
        const matchesStatus = statusFilter === 'All' || (inv.dueDate === 'IMMEDIATE' ? 'Pending' : 'Paid'); // Simple mapping
        // Search by customer name (nested) or invoice ID (statementNo)
        const matchesSearch = (inv.customerDetails?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.statementNo || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getStatusBadge = (status) => {
        switch (status) { // Map backend status or derive it
            case 'Paid': return 'badge-success';
            case 'Pending': return 'badge-warning';
            case 'Overdue': return 'badge-error';
            default: return 'badge-ghost';
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading invoices...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error loading invoices: {error.message}</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Invoices</h1>
                    <p className="text-gray-500 text-sm">Manage and view customer invoices</p>
                </div>
                <button className="btn btn-primary btn-sm gap-2">
                    <Download size={16} /> Download Report
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-base-100 p-4 rounded-lg shadow-sm">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by customer or invoice ID..."
                        className="input input-bordered input-sm w-full pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select
                    className="select select-bordered select-sm w-full sm:w-48"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="All">All Status</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                </select>
            </div>

            {/* Table */}
            <div className="card bg-base-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>Invoice ID</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.map((invoice) => (
                                <tr key={invoice._id} className="hover">
                                    <td className="font-mono font-medium">{invoice.statementNo}</td>
                                    <td>{invoice.customerDetails?.name || 'Unknown'}</td>
                                    <td>{invoice.period?.display || new Date(invoice.createdAt).toLocaleDateString('en-GB')}</td>
                                    <td className="font-bold">₹{invoice.totalPayable}</td>
                                    <td>
                                        {/* Simple status logic for now */}
                                        <span className={`badge badge-sm badge-warning`}>
                                            Pending
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button className="btn btn-ghost btn-xs" title="View" onClick={() => setViewInvoice(invoice)}>
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-xs"
                                                title="Download"
                                                onClick={() => { setViewInvoice(invoice); setIsAutoDownload(true); }}
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-500">
                                        No invoices found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewInvoice && (
                <InvoiceViewModal
                    invoice={viewInvoice}
                    onClose={() => { setViewInvoice(null); setIsAutoDownload(false); }}
                    autoDownload={isAutoDownload}
                />
            )}
        </div>
    );
};
