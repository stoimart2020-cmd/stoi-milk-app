import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { axiosInstance } from '../../shared/api/axios';
import { Eye, Download, Plus, FileText, Calendar, AlertTriangle, X } from 'lucide-react';
import { InvoiceViewModal } from './InvoiceViewModal';
import { queryClient } from '../../shared/utils/queryClient';
import { toast } from 'react-hot-toast';

export const CustomerInvoicesTab = ({ customerId }) => {
    const [viewInvoice, setViewInvoice] = useState(null);
    const [isAutoDownload, setIsAutoDownload] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);

    const { data: invoices, isLoading, error } = useQuery({
        queryKey: ['customerInvoices', customerId],
        queryFn: async () => {
            const response = await axiosInstance.get(`/api/invoices/customer/${customerId}`);
            return response.data;
        },
        enabled: !!customerId
    });

    const generateMutation = useMutation({
        mutationFn: async ({ startDate, endDate }) => {
            const response = await axiosInstance.post('/api/invoices/generate-single', {
                customerId,
                startDate,
                endDate
            });
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Invoice generated successfully');
            queryClient.invalidateQueries({ queryKey: ['customerInvoices', customerId] });
            setShowGenerateModal(false);
        },
        onError: (err) => {
            const msg = err.response?.data?.message || 'Failed to generate invoice';
            toast.error(msg);
        }
    });

    if (isLoading) return <div className="text-center py-8">Loading invoices...</div>;
    if (error) return <div className="alert alert-error">Error: {error.message}</div>;

    return (
        <div>
            {/* Header with Generate Button */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600" />
                    <h3 className="font-bold text-gray-700">Invoices</h3>
                    <span className="badge badge-sm badge-ghost">{invoices?.length || 0}</span>
                </div>
                <button
                    className="btn btn-sm btn-teal text-white gap-2 normal-case"
                    onClick={() => setShowGenerateModal(true)}
                >
                    <Plus className="w-4 h-4" /> Generate Invoice
                </button>
            </div>

            {/* Invoice Table */}
            <div className="overflow-x-auto">
                <table className="table table-zebra w-full text-sm">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Statement No</th>
                            <th>Period</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices && invoices.length > 0 ? (
                            invoices.map((inv) => (
                                <tr key={inv._id}>
                                    <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                                    <td className="font-mono text-xs">{inv.statementNo}</td>
                                    <td>{inv.period?.display}</td>
                                    <td className="font-bold">₹{inv.totalPayable}</td>
                                    <td>
                                        <span className="badge badge-success badge-sm badge-outline">Paid</span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                className="btn btn-ghost btn-xs"
                                                onClick={() => { setViewInvoice(inv); setIsAutoDownload(false); }}
                                                title="View"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-xs text-primary"
                                                onClick={() => { setViewInvoice(inv); setIsAutoDownload(true); }}
                                                title="Download"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center py-8 text-gray-500">
                                    No invoices found for this customer.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Invoice View Modal */}
            {viewInvoice && (
                <InvoiceViewModal
                    invoice={viewInvoice}
                    onClose={() => setViewInvoice(null)}
                    autoDownload={isAutoDownload}
                />
            )}

            {/* Generate Invoice Modal */}
            {showGenerateModal && (
                <GenerateInvoiceModal
                    existingInvoices={invoices || []}
                    onGenerate={(startDate, endDate) => generateMutation.mutate({ startDate, endDate })}
                    onClose={() => setShowGenerateModal(false)}
                    isLoading={generateMutation.isPending}
                />
            )}
        </div>
    );
};

// --- Generate Invoice Modal ---
const GenerateInvoiceModal = ({ existingInvoices, onGenerate, onClose, isLoading }) => {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(formatDateInput(firstOfMonth));
    const [endDate, setEndDate] = useState(formatDateInput(today));
    const [error, setError] = useState('');

    function formatDateInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Check for overlaps when dates change
    const checkOverlap = (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        for (const inv of existingInvoices) {
            const invStart = new Date(inv.period?.startDate);
            const invEnd = new Date(inv.period?.endDate);
            if (s <= invEnd && e >= invStart) {
                return `Overlaps with existing invoice: ${inv.period?.display || inv.statementNo}`;
            }
        }
        return '';
    };

    const handleStartChange = (val) => {
        setStartDate(val);
        setError(checkOverlap(val, endDate));
    };

    const handleEndChange = (val) => {
        setEndDate(val);
        setError(checkOverlap(startDate, val));
    };

    const handleSubmit = () => {
        if (!startDate || !endDate) {
            setError('Please select both dates');
            return;
        }
        if (new Date(startDate) >= new Date(endDate)) {
            setError('Start date must be before end date');
            return;
        }
        const overlapMsg = checkOverlap(startDate, endDate);
        if (overlapMsg) {
            setError(overlapMsg);
            return;
        }
        setError('');
        onGenerate(startDate, endDate);
    };

    // Get month coverage summary from existing invoices
    const coverageSummary = existingInvoices.map(inv => ({
        display: inv.period?.display,
        start: new Date(inv.period?.startDate),
        end: new Date(inv.period?.endDate),
        statementNo: inv.statementNo
    })).sort((a, b) => b.start - a.start);

    // Quick presets
    const presets = [
        {
            label: 'This Month (1st to today)',
            start: formatDateInput(firstOfMonth),
            end: formatDateInput(today)
        },
        {
            label: 'Previous Month',
            start: formatDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
            end: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 0))
        },
        {
            label: 'First Half (1-15)',
            start: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
            end: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 15))
        },
        {
            label: 'Last 7 Days',
            start: formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
            end: formatDateInput(today)
        }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">Generate Invoice</h3>
                            <p className="text-xs text-gray-400">Select date range for the invoice</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Quick Presets */}
                    <div>
                        <label className="label text-xs font-bold text-gray-500 uppercase tracking-wider py-1">Quick Presets</label>
                        <div className="grid grid-cols-2 gap-2">
                            {presets.map((preset, idx) => (
                                <button
                                    key={idx}
                                    className="btn btn-xs btn-outline normal-case text-gray-600 hover:btn-teal hover:text-white"
                                    onClick={() => {
                                        setStartDate(preset.start);
                                        setEndDate(preset.end);
                                        setError(checkOverlap(preset.start, preset.end));
                                    }}
                                >
                                    <Calendar className="w-3 h-3" /> {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label text-xs font-bold text-gray-500 uppercase tracking-wider py-1">Start Date</label>
                            <input
                                type="date"
                                className="input input-bordered input-sm w-full"
                                value={startDate}
                                onChange={(e) => handleStartChange(e.target.value)}
                            />
                        </div>
                        <div className="form-control">
                            <label className="label text-xs font-bold text-gray-500 uppercase tracking-wider py-1">End Date</label>
                            <input
                                type="date"
                                className="input input-bordered input-sm w-full"
                                value={endDate}
                                onChange={(e) => handleEndChange(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Period Preview */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p className="text-xs text-gray-500 font-medium">Invoice will cover:</p>
                        <p className="text-sm font-bold text-gray-800 mt-1">
                            {startDate && endDate
                                ? `${new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} to ${new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                : 'Select dates above'
                            }
                        </p>
                        {startDate && endDate && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                {Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1} days
                            </p>
                        )}
                    </div>

                    {/* Error/Overlap Warning */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Existing Coverage */}
                    {coverageSummary.length > 0 && (
                        <div>
                            <label className="label text-xs font-bold text-gray-500 uppercase tracking-wider py-1">
                                Existing Invoices ({coverageSummary.length})
                            </label>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {coverageSummary.map((inv, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100 text-xs">
                                        <span className="text-blue-700 font-medium">{inv.display}</span>
                                        <span className="font-mono text-blue-500">{inv.statementNo}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                    <button className="btn btn-sm btn-ghost normal-case" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-sm btn-teal text-white gap-2 normal-case"
                        onClick={handleSubmit}
                        disabled={isLoading || !!error}
                    >
                        {isLoading ? (
                            <><span className="loading loading-spinner loading-xs"></span> Generating...</>
                        ) : (
                            <><FileText className="w-4 h-4" /> Generate Invoice</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
