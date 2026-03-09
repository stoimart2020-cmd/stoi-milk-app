import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransactions, exportTransactions } from '../lib/api';
import { Download, RefreshCw, RotateCcw } from 'lucide-react';

export const PaymentTransactions = () => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(100);
    const [filters, setFilters] = useState({
        pgOrderId: '',
        pgPaymentId: '',
        customerName: '',
        gateway: '',
        status: '',
        date: ''
    });
    const [debouncedFilters, setDebouncedFilters] = useState(filters);
    const [isExporting, setIsExporting] = useState(false);

    // Debounce filters
    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFilters(filters);
            setPage(1); // Reset to page 1 on filter change
        }, 500);
        return () => clearTimeout(handler);
    }, [filters]);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['transactions', page, limit, debouncedFilters],
        queryFn: () => getTransactions({ page, limit, ...debouncedFilters })
    });

    const transactions = data?.result || [];
    const total = data?.pagination?.total || 0;
    const totalPages = data?.pagination?.pages || 1;

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const blob = await exportTransactions(debouncedFilters);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Export failed", error);
            // toast.error("Export failed"); // If toast is available
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="p-6 bg-base-100 min-h-screen">
            <div className="text-sm breadcrumbs mb-4">
                <ul>
                    <li>Home</li>
                    <li>Payment Gateway Transaction</li>
                </ul>
            </div>

            <div className="card bg-base-100 shadow-md">
                <div className="card-body p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="card-title text-sm font-bold uppercase text-gray-500">Payment Gateway Transactions</h2>
                        <button
                            className="btn btn-sm btn-info text-white"
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            <Download size={16} /> {isExporting ? 'Exporting...' : 'Export'}
                        </button>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm">Show</span>
                            <select
                                className="select select-bordered select-xs"
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm">entries</span>
                        </div>
                        <div className="flex gap-2">
                            <button className="btn btn-xs btn-outline btn-success" onClick={() => refetch()}>
                                <RefreshCw size={12} /> Refresh
                            </button>
                            <button
                                className="btn btn-xs btn-outline btn-error"
                                onClick={() => setFilters({ pgOrderId: '', pgPaymentId: '', customerName: '', gateway: '', status: '', date: '' })}
                            >
                                <RotateCcw size={12} /> Reset
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table table-xs w-full border">
                            <thead>
                                <tr className="bg-base-200">
                                    <th className="border">Id</th>
                                    <th className="border">Order Id</th>
                                    <th className="border">PG Order Id</th>
                                    <th className="border">Hub name</th>
                                    <th className="border">Customer Id</th>
                                    <th className="border">Customer Name</th>
                                    <th className="border">Payment Gateway</th>
                                    <th className="border">Amount</th>
                                    <th className="border">Refund Amount</th>
                                    <th className="border">Type</th>
                                    <th className="border">Status</th>
                                    <th className="border w-64">Response Text</th>
                                    <th className="border">Transaction Ref Id</th>
                                    <th className="border">Created</th>
                                </tr>
                                {/* Search Row */}
                                <tr>
                                    <th className="border"></th>
                                    <th className="border"></th>
                                    <th className="border">
                                        <input
                                            type="text"
                                            className="input input-xs w-full"
                                            placeholder="Search PG Order"
                                            value={filters.pgOrderId}
                                            onChange={(e) => handleFilterChange('pgOrderId', e.target.value)}
                                        />
                                    </th>
                                    <th className="border"></th>
                                    <th className="border"></th>
                                    <th className="border">
                                        <input
                                            type="text"
                                            className="input input-xs w-full"
                                            placeholder="Search Name"
                                            value={filters.customerName}
                                            onChange={(e) => handleFilterChange('customerName', e.target.value)}
                                        />
                                    </th>
                                    <th className="border">
                                        <input
                                            type="text"
                                            className="input input-xs w-full"
                                            placeholder="Search Gateway"
                                            value={filters.gateway}
                                            onChange={(e) => handleFilterChange('gateway', e.target.value)}
                                        />
                                    </th>
                                    <th className="border"></th>
                                    <th className="border"></th>
                                    <th className="border"></th>
                                    <th className="border">
                                        <select
                                            className="select select-xs w-full"
                                            value={filters.status}
                                            onChange={(e) => handleFilterChange('status', e.target.value)}
                                        >
                                            <option value="">All</option>
                                            <option value="SUCCESS">Success</option>
                                            <option value="FAILED">Failed</option>
                                        </select>
                                    </th>
                                    <th className="border"></th>
                                    <th className="border">
                                        <input
                                            type="text"
                                            className="input input-xs w-full"
                                            placeholder="Search Ref ID"
                                            value={filters.pgPaymentId}
                                            onChange={(e) => handleFilterChange('pgPaymentId', e.target.value)}
                                        />
                                    </th>
                                    <th className="border">
                                        <input
                                            type="date"
                                            className="input input-xs w-full"
                                            value={filters.date}
                                            onChange={(e) => handleFilterChange('date', e.target.value)}
                                        />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="14" className="text-center py-4">Loading...</td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan="14" className="text-center py-4">No data available in table</td></tr>
                                ) : (
                                    transactions.map((tx, index) => (
                                        <tr key={tx._id} className="hover">
                                            <td className="border">{tx._id.slice(-4)}</td> {/* Mock ID */}
                                            <td className="border">{tx.order || '-'}</td>
                                            <td className="border">{tx.pgOrderId || '-'}</td>
                                            <td className="border text-primary">{tx.user?.hub?.name || '-'}</td>
                                            <td className="border">{tx.user?.customerId || '-'}</td>
                                            <td className="border text-info">{tx.user?.name || '-'}</td>
                                            <td className="border">{tx.gateway || '-'}</td>
                                            <td className="border">{tx.amount}</td>
                                            <td className="border">{tx.refundAmount || 0}</td>
                                            <td className="border">{tx.type === 'CREDIT' ? 'payment' : 'refund'}</td>
                                            <td className="border">{tx.status?.toLowerCase()}</td>
                                            <td className="border max-w-xs truncate" title={tx.responseText}>
                                                {tx.responseText || '-'}
                                            </td>
                                            <td className="border text-info">{tx.pgPaymentId || '-'}</td>
                                            <td className="border">{new Date(tx.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center mt-4 text-xs">
                        <span>Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries</span>
                        <div className="join">
                            <button
                                className="join-item btn btn-xs"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                Previous
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    className={`join-item btn btn-xs ${page === i + 1 ? 'btn-active' : ''}`}
                                    onClick={() => setPage(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                className="join-item btn btn-xs"
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            >
                                Next
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
