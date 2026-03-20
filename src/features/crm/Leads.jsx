import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getLeads, createLead, updateLead, deleteLead,
    getPipelineAnalytics, getCrmDashboardStats, addInteraction,
    getLeadTimeline, getConversionPrediction
} from '../../shared/api/crm';
import {
    Plus, Search, Edit, Trash2, Phone, Mail,
    List, BarChart3, X, Zap as Lightning,
    PieChart, Award, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- Subcomponents ---

// Status Badge Component
const StatusBadge = ({ status }) => {
    const styles = {
        'New': 'bg-blue-100 text-blue-800',
        'Contacted': 'bg-purple-100 text-purple-800',
        'Interested': 'bg-indigo-100 text-indigo-800',
        'Qualified': 'bg-teal-100 text-teal-800',
        'Proposal': 'bg-orange-100 text-orange-800',
        'Negotiation': 'bg-amber-100 text-amber-800',
        'Converted': 'bg-green-100 text-green-800',
        'Lost': 'bg-red-100 text-red-800'
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
};

// Kanban Board Column
const KanbanColumn = ({ status, leads, onDragOver, onDrop, onLeadClick }) => {
    return (
        <div
            className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-3 min-h-[calc(100vh-250px)]"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, status)}
        >
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-sm text-gray-500">({leads.length})</span>
                </h3>
            </div>
            <div className="space-y-3">
                {leads.map(lead => (
                    <div
                        key={lead._id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('leadId', lead._id)}
                        onClick={() => onLeadClick(lead)}
                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-move hover:shadow-md transition-shadow group"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">{lead.name}</h4>
                            {lead.priority === 'hot' && <Lightning size={16} className="text-orange-500 fill-orange-500" />}
                        </div>
                        <div className="text-sm text-gray-500 mb-3 line-clamp-2">{lead.notes || 'No notes available'}</div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                            <div className="flex items-center gap-2">
                                <span>Score: {lead.score || 0}</span>
                            </div>
                            <span>{new Date(lead.updatedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Analytics Dashboard
const CRMDashboard = () => {
    const { data: stats } = useQuery({
        queryKey: ['crm-stats'],
        queryFn: getCrmDashboardStats
    });

    const { data: pipeline } = useQuery({
        queryKey: ['crm-pipeline'],
        queryFn: getPipelineAnalytics
    });

    if (!stats || !pipeline) return <div className="p-8 text-center">Loading analytics...</div>;

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="stat bg-white shadow rounded-lg p-4">
                    <div className="stat-figure text-primary"><Award size={24} /></div>
                    <div className="stat-title">Conversion Rate</div>
                    <div className="stat-value text-primary">{pipeline.metrics?.conversionRate || '0%'}</div>
                    <div className="stat-desc">Target: 20%</div>
                </div>
                <div className="stat bg-white shadow rounded-lg p-4">
                    <div className="stat-figure text-secondary"><Lightning size={24} /></div>
                    <div className="stat-title">Active Leads</div>
                    <div className="stat-value text-secondary">{pipeline.metrics?.activeLeads || 0}</div>
                    <div className="stat-desc">{stats.stats?.newLeads || 0} new this week</div>
                </div>
                <div className="stat bg-white shadow rounded-lg p-4">
                    <div className="stat-figure text-accent"><Clock size={24} /></div>
                    <div className="stat-title">Avg. Closure</div>
                    <div className="stat-value text-accent">12d</div>
                    <div className="stat-desc">From first contact</div>
                </div>
                <div className="stat bg-white shadow rounded-lg p-4">
                    <div className="stat-figure text-info"><BarChart3 size={24} /></div>
                    <div className="stat-title">Pipeline Value</div>
                    <div className="stat-value text-info">₹2.4L</div>
                    <div className="stat-desc">Est. revenue</div>
                </div>
            </div>

            {/* Pipeline Visual */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-lg mb-4">Pipeline Health</h3>
                <div className="flex items-end gap-2 h-40">
                    {pipeline.pipeline?.map((stage, i) => (
                        <div key={stage.status} className="flex-1 flex flex-col items-center gap-2 group relative">
                            <div className="text-xs font-semibold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6">
                                {stage.count} leads
                            </div>
                            <div
                                className={`w-full rounded-t-lg transition-all hover:bg-opacity-80 ${i === pipeline.pipeline.length - 1 ? 'bg-green-500' :
                                    i === pipeline.pipeline.length - 2 ? 'bg-red-500' : 'bg-blue-500'
                                    }`}
                                style={{ height: `${Math.max(10, (stage.count / (stats.stats?.totalLeads || 1)) * 100)}%`, opacity: 0.7 + (i * 0.05) }}
                            ></div>
                            <div className="text-xs text-gray-500 text-center truncate w-full" title={stage.status}>
                                {stage.status}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Lead Detail Slide-over
const LeadDetailPanel = ({ lead, onClose, onUpdate }) => {
    const [note, setNote] = useState('');
    const queryClient = useQueryClient();

    const { data: timelineData } = useQuery({
        queryKey: ['lead-timeline', lead._id],
        queryFn: () => getLeadTimeline(lead._id),
        enabled: !!lead
    });

    const { data: prediction } = useQuery({
        queryKey: ['lead-prediction', lead._id],
        queryFn: () => getConversionPrediction(lead._id),
        enabled: !!lead
    });

    const addInteractionMutation = useMutation({
        mutationFn: (data) => addInteraction(lead._id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['lead-timeline', lead._id]);
            queryClient.invalidateQueries(['leads']);
            toast.success('Interaction recorded');
            setNote('');
        }
    });

    if (!lead) return null;

    const timeline = timelineData?.timeline || [];

    return (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 ease-in-out border-l border-gray-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{lead.name}</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            {lead.company && <span>{lead.company} •</span>}
                            <span>{lead.source}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        className="select select-sm select-bordered w-full max-w-xs"
                        value={lead.status}
                        onChange={(e) => onUpdate({ ...lead, status: e.target.value })}
                    >
                        {['New', 'Contacted', 'Interested', 'Qualified', 'Proposal', 'Negotiation', 'Converted', 'Lost'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <div className="flex-1 text-right">
                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Score</div>
                        <div className={`text-xl font-bold ${lead.score >= 80 ? 'text-green-600' : lead.score >= 50 ? 'text-yellow-600' : 'text-gray-600'}`}>
                            {lead.score || 0}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* AI Insight */}
                {prediction?.prediction && (
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightning size={16} className="text-indigo-600" />
                            <h3 className="font-bold text-indigo-900 text-sm">AI Prediction</h3>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Convert Probability</span>
                            <span className="font-bold text-indigo-700">{prediction.prediction.probability}</span>
                        </div>
                        <p className="text-xs text-indigo-800 leading-relaxed bg-white/50 p-2 rounded">
                            {prediction.prediction.recommendation}
                        </p>
                    </div>
                )}

                {/* Contact Info */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Details</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <Phone size={14} />
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">Mobile</div>
                                <div className="font-medium">{lead.mobile}</div>
                            </div>
                        </div>
                        {lead.email && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Mail size={14} />
                                </div>
                                <div>
                                    <div className="text-gray-500 text-xs">Email</div>
                                    <div className="font-medium">{lead.email}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Interaction */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Add Note / Interaction</h3>
                    <div className="flex gap-2 mb-2">
                        {['call', 'email', 'meeting', 'note'].map(type => (
                            <button
                                key={type}
                                className="btn btn-xs btn-outline capitalize"
                                onClick={() => addInteractionMutation.mutate({ type, notes: 'Quick ' + type + ' logged' })}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (note.trim()) addInteractionMutation.mutate({ type: 'note', notes: note });
                        }}
                        className="relative"
                    >
                        <textarea
                            className="textarea textarea-bordered w-full h-24 text-sm"
                            placeholder="Type a note about your interaction..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        ></textarea>
                        <button
                            type="submit"
                            className="btn btn-sm btn-primary absolute bottom-2 right-2"
                            disabled={!note.trim() || addInteractionMutation.isPending}
                        >
                            Save
                        </button>
                    </form>
                </div>

                {/* Timeline */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Activity Timeline</h3>
                    <div className="space-y-6 border-l-2 border-gray-100 ml-3 pl-6 relative">
                        {timeline.map((event, i) => (
                            <div key={i} className="relative">
                                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-gray-300"></div>
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-semibold text-gray-800 capitalize">{event.type.replace('_', ' ')}</span>
                                    <span className="text-xs text-gray-400">{new Date(event.date).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {event.description}
                                </p>
                                <div className="text-xs text-gray-400 mt-1 pl-1">by {event.by}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Leads Component ---

export const Leads = () => {
    const [viewMode, setViewMode] = useState('kanban'); // 'list', 'kanban', 'analytics'
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedLead, setSelectedLead] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const queryClient = useQueryClient();

    const { data: leadsData, isLoading } = useQuery({
        queryKey: ['leads', page, search, statusFilter],
        queryFn: () => getLeads({ page, limit: 100, search, status: statusFilter }) // Increase limit for Kanban
    });

    const createMutation = useMutation({
        mutationFn: createLead,
        onSuccess: () => {
            queryClient.invalidateQueries(['leads']);
            toast.success('Lead created');
            setIsCreateModalOpen(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateLead(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['leads']);
            toast.success('Lead updated');
            if (selectedLead) setSelectedLead(prev => ({ ...prev, ...updateMutation.variables.data }));
        }
    });

    // Compute Kanban Columns
    const kanbanStages = ['New', 'Contacted', 'Interested', 'Qualified', 'Proposal', 'Negotiation', 'Converted', 'Lost'];
    const leads = leadsData?.result || [];

    const handleDrop = (e, newStatus) => {
        const leadId = e.dataTransfer.getData('leadId');
        if (leadId) {
            updateMutation.mutate({ id: leadId, data: { status: newStatus } });
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b px-6 py-4 flex justify-between items-center shrink-0 z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            Sales Pipeline
                            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {leads.length} leads
                            </span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Switcher */}
                        <div className="join bg-gray-100 rounded-lg p-1">
                            <button
                                className={`join-item btn btn-sm border-0 ${viewMode === 'kanban' ? 'bg-white shadow text-primary' : 'bg-transparent text-gray-500'}`}
                                onClick={() => setViewMode('kanban')}
                            >
                                <List size={16} className="rotate-90" /> Kanban
                            </button>
                            <button
                                className={`join-item btn btn-sm border-0 ${viewMode === 'list' ? 'bg-white shadow text-primary' : 'bg-transparent text-gray-500'}`}
                                onClick={() => setViewMode('list')}
                            >
                                <List size={16} /> List
                            </button>
                            <button
                                className={`join-item btn btn-sm border-0 ${viewMode === 'analytics' ? 'bg-white shadow text-primary' : 'bg-transparent text-gray-500'}`}
                                onClick={() => setViewMode('analytics')}
                            >
                                <BarChart3 size={16} /> Analytics
                            </button>
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-2"></div>

                        <button
                            className="btn btn-primary btn-sm gap-2 shadow-lg shadow-primary/20"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <Plus size={16} /> New Lead
                        </button>
                    </div>
                </header>

                {/* Filters Bar */}
                {viewMode !== 'analytics' && (
                    <div className="bg-white border-b px-6 py-3 flex items-center gap-4 shrink-0">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search leads..."
                                className="input input-sm input-bordered w-full pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="select select-bordered select-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            {kanbanStages.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}

                {/* Content Body */}
                <main className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    ) : viewMode === 'kanban' ? (
                        <div className="flex gap-4 h-full pb-4 min-w-max">
                            {kanbanStages.map(stage => (
                                <KanbanColumn
                                    key={stage}
                                    status={stage}
                                    leads={leads.filter(l => l.status === stage)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onLeadClick={setSelectedLead}
                                />
                            ))}
                        </div>
                    ) : viewMode === 'analytics' ? (
                        <div className="max-w-6xl mx-auto overflow-y-auto h-full pb-20">
                            <CRMDashboard />
                        </div>
                    ) : (
                        // List View
                        <div className="bg-white rounded-lg shadow-sm border overflow-hidden h-full overflow-y-auto">
                            <table className="table table-zebra w-full header-sticky">
                                <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase tracking-wider sticky top-0 z-10">
                                    <tr>
                                        <th>Name</th>
                                        <th>Contact</th>
                                        <th>Score</th>
                                        <th>Status</th>
                                        <th>Source</th>
                                        <th>Last Updated</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {leads.map(lead => (
                                        <tr key={lead._id} className="hover cursor-pointer" onClick={() => setSelectedLead(lead)}>
                                            <td className="font-semibold text-gray-900">{lead.name}</td>
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="text-gray-900">{lead.mobile}</span>
                                                    <span className="text-gray-500 text-xs">{lead.email}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <div className={`w-2 h-2 rounded-full ${lead.score > 70 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                    {lead.score || 0}
                                                </div>
                                            </td>
                                            <td><StatusBadge status={lead.status} /></td>
                                            <td>{lead.source}</td>
                                            <td className="text-gray-500">{new Date(lead.updatedAt).toLocaleDateString()}</td>
                                            <td className="text-right">
                                                <button className="btn btn-ghost btn-xs text-primary">View</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>

            {/* Slide-over Detail Panel */}
            {selectedLead && (
                <LeadDetailPanel
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onUpdate={(updatedData) => updateMutation.mutate({ id: selectedLead._id, data: updatedData })}
                />
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Add New Lead</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            createMutation.mutate(Object.fromEntries(formData.entries()));
                        }} className="flex flex-col gap-4">
                            <div className="form-control">
                                <label className="label">Name</label>
                                <input name="name" required className="input input-bordered" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">Mobile</label>
                                    <input name="mobile" required className="input input-bordered" />
                                </div>
                                <div className="form-control">
                                    <label className="label">Email</label>
                                    <input name="email" type="email" className="input input-bordered" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">Source</label>
                                    <select name="source" className="select select-bordered">
                                        <option value="Website">Website</option>
                                        <option value="Referral">Referral</option>
                                        <option value="Walk-in">Walk-in</option>
                                        <option value="Social Media">Social Media</option>
                                        <option value="Cold Call">Cold Call</option>
                                    </select>
                                </div>
                                <div className="form-control">
                                    <label className="label">Priority</label>
                                    <select name="priority" className="select select-bordered">
                                        <option value="cold">Low</option>
                                        <option value="warm">Medium</option>
                                        <option value="hot">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-control">
                                <label className="label">Initial Notes</label>
                                <textarea name="notes" className="textarea textarea-bordered"></textarea>
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Lead</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
