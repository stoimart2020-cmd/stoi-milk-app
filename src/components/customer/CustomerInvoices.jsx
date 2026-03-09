import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Eye, Calendar } from 'lucide-react';
import { axiosInstance } from '../../lib/axios';
import { InvoiceViewModal } from '../modals/InvoiceViewModal';

export const CustomerInvoices = () => {
    const [viewInvoice, setViewInvoice] = useState(null);
    const [isAutoDownload, setIsAutoDownload] = useState(false);

    const { data: invoices, isLoading, error } = useQuery({
        queryKey: ['my-invoices'],
        queryFn: async () => {
            const response = await axiosInstance.get('/api/invoices/my-invoices');
            return response.data;
        }
    });

    const handleView = (invoice) => {
        setViewInvoice(invoice);
        setIsAutoDownload(false);
    };

    const handleDownload = (invoice) => {
        setViewInvoice(invoice);
        setIsAutoDownload(true);
    };

    if (isLoading) return (
        <div className="flex justify-center items-center h-48">
            <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
    );

    if (error) return (
        <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Error loading invoices: {error.message}</span>
        </div>
    );

    return (
        <div className="space-y-4 pb-20">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="text-primary" />
                My Invoices
            </h2>

            {!invoices || invoices.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                    <FileText className="mx-auto text-gray-300 mb-2" size={48} />
                    <p className="text-gray-500">No invoices found.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {invoices.map((invoice) => (
                        <div key={invoice._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="bg-primary/10 p-3 rounded-lg">
                                    <FileText className="text-primary" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{invoice.period?.display || invoice.month}</h3>
                                    <p className="text-xs text-gray-500 font-mono mb-1">{invoice.statementNo}</p>
                                    <div className="flex gap-2 text-xs">
                                        <span className="badge badge-sm badge-success badge-outline">Paid</span>
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <Calendar size={10} />
                                            {new Date(invoice.createdAt).toLocaleDateString('en-GB')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                <span className="font-bold text-lg">₹{invoice.totalPayable}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleView(invoice)}
                                        className="btn btn-sm btn-ghost btn-circle"
                                        title="View"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDownload(invoice)}
                                        className="btn btn-sm btn-ghost btn-circle text-primary"
                                        title="Download PDF"
                                    >
                                        <Download size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewInvoice && (
                <InvoiceViewModal
                    invoice={viewInvoice}
                    onClose={() => setViewInvoice(null)}
                    autoDownload={isAutoDownload}
                />
            )}
        </div>
    );
};
