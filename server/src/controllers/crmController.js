const Lead = require("../models/Lead");
const crmService = require("../services/crmService");

// Get all leads with filters
exports.getLeads = async (req, res) => {
    try {
        const { status, priority, assignedTo, search, page = 1, limit = 20 } = req.query;
        const query = {};

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (assignedTo) query.assignedTo = assignedTo;

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { mobile: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { company: { $regex: search, $options: "i" } }
            ];
        }

        const leads = await Lead.find(query)
            .populate("assignedTo", "name email")
            .populate("interestedProducts", "name")
            .sort({ score: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        // Calculate score for each lead
        const enrichedLeads = leads.map(lead => {
            const score = crmService.calculateLeadScore(lead);
            const priority = crmService.getLeadPriority(score);
            return {
                ...lead.toObject(),
                score,
                priority
            };
        });

        const total = await Lead.countDocuments(query);

        res.status(200).json({
            success: true,
            result: enrichedLeads,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create new lead
exports.createLead = async (req, res) => {
    try {
        const lead = await Lead.create(req.body);

        // Auto-assign if not assigned
        if (!lead.assignedTo) {
            await crmService.autoAssignLead(lead._id);
        }

        const populatedLead = await Lead.findById(lead._id)
            .populate("assignedTo", "name email");

        res.status(201).json({
            success: true,
            message: "Lead created successfully",
            result: populatedLead
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update lead
exports.updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        // Track status changes
        if (updateData.status && updateData.status !== lead.status) {
            if (!lead.statusHistory) lead.statusHistory = [];
            lead.statusHistory.push({
                status: updateData.status,
                date: new Date(),
                by: req.user._id
            });
        }

        // Update fields
        Object.assign(lead, updateData);

        // Update score
        lead.score = crmService.calculateLeadScore(lead);
        lead.priority = crmService.getLeadPriority(lead.score);

        await lead.save();

        const populatedLead = await Lead.findById(id)
            .populate("assignedTo", "name email")
            .populate("interestedProducts", "name");

        res.status(200).json({
            success: true,
            message: "Lead updated successfully",
            result: populatedLead
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete lead
exports.deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        res.status(200).json({ success: true, message: "Lead deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single lead with timeline
exports.getLeadById = async (req, res) => {
    try {
        const result = await crmService.getLeadTimeline(req.params.id);

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add interaction to lead
exports.addInteraction = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, notes } = req.body;

        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        if (!lead.interactions) lead.interactions = [];
        lead.interactions.push({
            type,
            notes,
            date: new Date(),
            by: req.user._id
        });

        lead.lastContactedAt = new Date();
        lead.score = crmService.calculateLeadScore(lead);
        lead.priority = crmService.getLeadPriority(lead.score);

        await lead.save();

        const populatedLead = await Lead.findById(id)
            .populate("assignedTo", "name email")
            .populate("interactions.by", "name");

        res.status(200).json({
            success: true,
            message: "Interaction added successfully",
            result: populatedLead
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get follow-up leads
exports.getFollowUpLeads = async (req, res) => {
    try {
        const result = await crmService.getFollowUpLeads();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get pipeline analytics
exports.getPipelineAnalytics = async (req, res) => {
    try {
        const result = await crmService.getPipelineAnalytics();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get source analytics
exports.getSourceAnalytics = async (req, res) => {
    try {
        const result = await crmService.getSourceAnalytics();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get team performance
exports.getTeamPerformance = async (req, res) => {
    try {
        const result = await crmService.getTeamPerformance();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get hot leads
exports.getHotLeads = async (req, res) => {
    try {
        const result = await crmService.getHotLeads();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Convert lead to customer
exports.convertLead = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerId } = req.body;

        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        lead.status = "Converted";
        lead.convertedToCustomer = customerId;
        lead.conversionDate = new Date();
        lead.score = 100;
        lead.priority = "hot";

        if (!lead.statusHistory) lead.statusHistory = [];
        lead.statusHistory.push({
            status: "Converted",
            date: new Date(),
            by: req.user._id
        });

        await lead.save();

        res.status(200).json({
            success: true,
            message: "Lead converted successfully",
            result: lead
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mark lead as lost
exports.markAsLost = async (req, res) => {
    try {
        const { id } = req.params;
        const { lostReason, lostNotes } = req.body;

        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        lead.status = "Lost";
        lead.lostReason = lostReason;
        lead.lostNotes = lostNotes;
        lead.score = 0;
        lead.priority = "ice";

        if (!lead.statusHistory) lead.statusHistory = [];
        lead.statusHistory.push({
            status: "Lost",
            date: new Date(),
            by: req.user._id
        });

        await lead.save();

        res.status(200).json({
            success: true,
            message: "Lead marked as lost",
            result: lead
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get lead conversion prediction
exports.getConversionPrediction = async (req, res) => {
    try {
        const { id } = req.params;

        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        const prediction = crmService.predictConversion(lead);

        res.status(200).json({
            success: true,
            lead: {
                id: lead._id,
                name: lead.name,
                status: lead.status
            },
            prediction
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Bulk assign leads
exports.bulkAssignLeads = async (req, res) => {
    try {
        const { leadIds, assignedTo } = req.body;

        await Lead.updateMany(
            { _id: { $in: leadIds } },
            { assignedTo }
        );

        res.status(200).json({
            success: true,
            message: `${leadIds.length} leads assigned successfully`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get CRM dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const totalLeads = await Lead.countDocuments();
        const newLeads = await Lead.countDocuments({ status: "New" });
        const hotLeads = await Lead.countDocuments({ priority: "hot" });
        const convertedLeads = await Lead.countDocuments({ status: "Converted" });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const leadsToday = await Lead.countDocuments({
            createdAt: { $gte: today }
        });

        const followUpsToday = await Lead.countDocuments({
            followUpDate: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            },
            status: { $nin: ["Converted", "Lost"] }
        });

        res.status(200).json({
            success: true,
            stats: {
                totalLeads,
                newLeads,
                hotLeads,
                convertedLeads,
                leadsToday,
                followUpsToday
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
