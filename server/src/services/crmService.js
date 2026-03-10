/**
 * Advanced CRM Service
 * Lead management, scoring, pipeline tracking, and analytics
 */

const Lead = require('../models/Lead');
const User = require('../models/User');
const Order = require('../models/Order');

class CRMService {
    constructor() {
        this.leadScoreWeights = {
            source: {
                'Referral': 30,
                'Website': 20,
                'Social Media': 15,
                'Walk-in': 25,
                'Other': 10
            },
            engagement: {
                'high': 30,
                'medium': 20,
                'low': 10
            },
            budget: {
                'high': 25,
                'medium': 15,
                'low': 5
            }
        };
    }

    /**
     * Calculate lead score (0-100)
     */
    calculateLeadScore(lead) {
        let score = 0;

        // Source score
        score += this.leadScoreWeights.source[lead.source] || 10;

        // Engagement score
        if (lead.lastContactedAt) {
            const daysSinceContact = (Date.now() - new Date(lead.lastContactedAt)) / (1000 * 60 * 60 * 24);
            if (daysSinceContact < 3) score += 30;
            else if (daysSinceContact < 7) score += 20;
            else if (daysSinceContact < 14) score += 10;
        }

        // Status score
        const statusScores = {
            'New': 10,
            'Contacted': 20,
            'Interested': 40,
            'Qualified': 60,
            'Proposal': 70,
            'Negotiation': 80,
            'Converted': 100,
            'Lost': 0
        };
        score += statusScores[lead.status] || 10;

        // Follow-up score
        if (lead.followUpDate) {
            const daysUntilFollowUp = (new Date(lead.followUpDate) - Date.now()) / (1000 * 60 * 60 * 24);
            if (daysUntilFollowUp >= 0 && daysUntilFollowUp <= 2) score += 15;
        }

        // Notes/interaction score
        if (lead.notes && lead.notes.length > 50) score += 10;
        if (lead.interactionCount > 3) score += 10;

        return Math.min(100, Math.round(score));
    }

    /**
     * Get lead priority based on score
     */
    getLeadPriority(score) {
        if (score >= 80) return 'hot';
        if (score >= 60) return 'warm';
        if (score >= 40) return 'cold';
        return 'ice';
    }

    /**
     * Get leads requiring follow-up
     */
    async getFollowUpLeads() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Leads with follow-up today or overdue
            const leads = await Lead.find({
                followUpDate: { $lte: tomorrow },
                status: { $nin: ['Converted', 'Lost'] }
            })
                .populate('assignedTo', 'name email')
                .sort({ followUpDate: 1 });

            const categorized = {
                overdue: [],
                today: [],
                upcoming: []
            };

            leads.forEach(lead => {
                const followUpDate = new Date(lead.followUpDate);
                const score = this.calculateLeadScore(lead);
                const enrichedLead = {
                    ...lead.toObject(),
                    score,
                    priority: this.getLeadPriority(score)
                };

                if (followUpDate < today) {
                    categorized.overdue.push(enrichedLead);
                } else if (followUpDate >= today && followUpDate < tomorrow) {
                    categorized.today.push(enrichedLead);
                } else {
                    categorized.upcoming.push(enrichedLead);
                }
            });

            return {
                success: true,
                followUps: categorized,
                totalCount: leads.length
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get pipeline analytics
     */
    async getPipelineAnalytics() {
        try {
            const pipeline = await Lead.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        leads: { $push: '$$ROOT' }
                    }
                }
            ]);

            const statusOrder = ['New', 'Contacted', 'Interested', 'Qualified', 'Proposal', 'Negotiation', 'Converted', 'Lost'];
            const pipelineData = statusOrder.map(status => {
                const stage = pipeline.find(p => p._id === status);
                return {
                    status,
                    count: stage ? stage.count : 0,
                    leads: stage ? stage.leads : []
                };
            });

            // Calculate conversion metrics
            const totalLeads = await Lead.countDocuments();
            const convertedLeads = await Lead.countDocuments({ status: 'Converted' });
            const lostLeads = await Lead.countDocuments({ status: 'Lost' });
            const activeLeads = totalLeads - convertedLeads - lostLeads;

            const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0;
            const lossRate = totalLeads > 0 ? ((lostLeads / totalLeads) * 100).toFixed(2) : 0;

            return {
                success: true,
                pipeline: pipelineData,
                metrics: {
                    totalLeads,
                    activeLeads,
                    convertedLeads,
                    lostLeads,
                    conversionRate: `${conversionRate}%`,
                    lossRate: `${lossRate}%`
                }
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get lead source analytics
     */
    async getSourceAnalytics() {
        try {
            const sourceData = await Lead.aggregate([
                {
                    $group: {
                        _id: '$source',
                        count: { $sum: 1 },
                        converted: {
                            $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] }
                        }
                    }
                },
                {
                    $project: {
                        source: '$_id',
                        count: 1,
                        converted: 1,
                        conversionRate: {
                            $multiply: [
                                { $divide: ['$converted', '$count'] },
                                100
                            ]
                        }
                    }
                }
            ]);

            return {
                success: true,
                sources: sourceData.map(s => ({
                    source: s.source,
                    totalLeads: s.count,
                    converted: s.converted,
                    conversionRate: `${s.conversionRate.toFixed(2)}%`
                }))
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get team performance
     */
    async getTeamPerformance() {
        try {
            const performance = await Lead.aggregate([
                {
                    $match: { assignedTo: { $exists: true, $ne: null } }
                },
                {
                    $group: {
                        _id: '$assignedTo',
                        totalLeads: { $sum: 1 },
                        converted: {
                            $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] }
                        },
                        lost: {
                            $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $unwind: '$user'
                },
                {
                    $project: {
                        name: '$user.name',
                        email: '$user.email',
                        totalLeads: 1,
                        converted: 1,
                        lost: 1,
                        active: { $subtract: ['$totalLeads', { $add: ['$converted', '$lost'] }] },
                        conversionRate: {
                            $multiply: [
                                { $divide: ['$converted', '$totalLeads'] },
                                100
                            ]
                        }
                    }
                },
                {
                    $sort: { converted: -1 }
                }
            ]);

            return {
                success: true,
                team: performance.map(p => ({
                    userId: p._id,
                    name: p.name,
                    email: p.email,
                    totalLeads: p.totalLeads,
                    activeLeads: p.active,
                    converted: p.converted,
                    lost: p.lost,
                    conversionRate: `${p.conversionRate.toFixed(2)}%`
                }))
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Auto-assign leads to team members
     */
    async autoAssignLead(leadId) {
        try {
            // Get all sales team members
            const salesTeam = await User.find({
                role: { $in: ['CUSTOMER_RELATIONS', 'FIELD_MARKETING', 'ONLINE_MARKETING'] },
                isActive: true
            });

            if (salesTeam.length === 0) {
                return { success: false, message: 'No sales team members available' };
            }

            // Get current lead count for each team member
            const teamLeadCounts = await Promise.all(
                salesTeam.map(async (member) => {
                    const count = await Lead.countDocuments({
                        assignedTo: member._id,
                        status: { $nin: ['Converted', 'Lost'] }
                    });
                    return { member, count };
                })
            );

            // Assign to member with least leads
            teamLeadCounts.sort((a, b) => a.count - b.count);
            const assignedMember = teamLeadCounts[0].member;

            const lead = await Lead.findByIdAndUpdate(
                leadId,
                { assignedTo: assignedMember._id },
                { new: true }
            ).populate('assignedTo', 'name email');

            return {
                success: true,
                lead,
                message: `Lead assigned to ${assignedMember.name}`
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get lead activity timeline
     */
    async getLeadTimeline(leadId) {
        try {
            const lead = await Lead.findById(leadId)
                .populate('assignedTo', 'name')
                .populate('interactions.by', 'name');

            if (!lead) {
                return { success: false, message: 'Lead not found' };
            }

            const timeline = [
                {
                    type: 'created',
                    date: lead.createdAt,
                    description: 'Lead created',
                    by: 'System'
                }
            ];

            // Add interactions
            if (lead.interactions) {
                lead.interactions.forEach(interaction => {
                    timeline.push({
                        type: interaction.type,
                        date: interaction.date,
                        description: interaction.notes,
                        by: interaction.by?.name || 'Unknown'
                    });
                });
            }

            // Add status changes
            if (lead.statusHistory) {
                lead.statusHistory.forEach(change => {
                    timeline.push({
                        type: 'status_change',
                        date: change.date,
                        description: `Status changed to ${change.status}`,
                        by: change.by?.name || 'System'
                    });
                });
            }

            // Sort by date
            timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

            return {
                success: true,
                lead,
                timeline
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get hot leads (high priority)
     */
    async getHotLeads() {
        try {
            const leads = await Lead.find({
                status: { $in: ['Interested', 'Qualified', 'Proposal', 'Negotiation'] }
            })
                .populate('assignedTo', 'name')
                .sort({ updatedAt: -1 });

            const hotLeads = leads.map(lead => {
                const score = this.calculateLeadScore(lead);
                return {
                    ...lead.toObject(),
                    score,
                    priority: this.getLeadPriority(score)
                };
            }).filter(lead => lead.priority === 'hot' || lead.priority === 'warm');

            return {
                success: true,
                hotLeads: hotLeads.sort((a, b) => b.score - a.score)
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Predict lead conversion probability
     */
    predictConversion(lead) {
        const score = this.calculateLeadScore(lead);

        // Simple probability based on score
        let probability = 0;
        if (score >= 80) probability = 85;
        else if (score >= 60) probability = 65;
        else if (score >= 40) probability = 40;
        else if (score >= 20) probability = 20;
        else probability = 10;

        return {
            probability: `${probability}%`,
            score,
            priority: this.getLeadPriority(score),
            recommendation: this.getRecommendation(score, lead)
        };
    }

    /**
     * Get recommendation based on lead score
     */
    getRecommendation(score, lead) {
        if (score >= 80) {
            return 'High priority! Schedule demo or send proposal immediately.';
        } else if (score >= 60) {
            return 'Warm lead. Follow up within 24 hours with personalized offer.';
        } else if (score >= 40) {
            return 'Nurture with email campaign and schedule follow-up call.';
        } else {
            return 'Low priority. Add to drip campaign for long-term nurturing.';
        }
    }
}

// Singleton instance
const crmService = new CRMService();

module.exports = crmService;
