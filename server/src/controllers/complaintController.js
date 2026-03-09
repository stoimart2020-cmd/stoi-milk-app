const Complaint = require("../models/Complaint");
const { createNotification } = require("./notificationController");
const { logAction } = require("./activityLogController");
const User = require("../models/User");

exports.getComplaints = async (req, res) => {
    try {
        const { status, priority, category, user, page = 1, limit = 20 } = req.query;
        const query = {};

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (category) query.category = category;

        // If customer, only show their complaints
        if (req.user.role === "CUSTOMER") {
            query.user = req.user._id;
        } else if (user) {
            // Admin can filter by specific user
            query.user = user;
        }

        const complaints = await Complaint.find(query)
            .populate("user", "name mobile")
            .populate("assignedTo", "name")
            .populate("history.by", "name role") // Populate history to show who made updates
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Complaint.countDocuments(query);

        res.status(200).json({
            success: true,
            result: complaints,
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

exports.createComplaint = async (req, res) => {
    try {
        const { subject, description, category, priority } = req.body;

        // Handle uploaded images
        const attachments = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                attachments.push({
                    url: `/uploads/${file.filename}`,
                    filename: file.originalname,
                    uploadedBy: req.user._id
                });
            }
        }

        const complaint = await Complaint.create({
            user: (req.user.role !== "CUSTOMER" && req.body.user) ? req.body.user : req.user._id,
            subject,
            description,
            category,
            priority,
            attachments,
            history: [{
                action: "Created",
                by: req.user._id,
                comment: "Complaint created",
                attachments: attachments.map(a => a.url)
            }]
        });

        // Notify Admins
        const admins = await User.find({ role: { $in: ["SUPERADMIN", "ADMIN", "SUPPORT_TEAM"] } });
        for (const admin of admins) {
            await createNotification({
                recipient: admin._id,
                title: "New Support Ticket",
                message: `New ticket created: ${subject}`,
                type: "info",
                link: "/administrator/dashboard/complaints"
            });
        }

        // Log Activity
        await logAction(
            complaint.user,
            req.user.role === "CUSTOMER" ? "CUSTOMER" : "ADMIN",
            "CREATE_TICKET",
            `Ticket created: ${subject}`,
            {
                complaintId: complaint._id,
                category,
                priority,
                hasAttachments: attachments.length > 0
            },
            req
        );

        res.status(201).json({ success: true, message: "Complaint created", result: complaint });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateComplaint = async (req, res) => {
    try {
        const { status, assignedTo, resolution, comment } = req.body;
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });

        // Handle uploaded images
        const newAttachments = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const attachment = {
                    url: `/uploads/${file.filename}`,
                    filename: file.originalname,
                    uploadedBy: req.user._id
                };
                complaint.attachments.push(attachment);
                newAttachments.push(attachment.url);
            }
        }

        if (status) complaint.status = status;
        if (assignedTo) complaint.assignedTo = assignedTo;
        if (resolution) complaint.resolution = resolution;

        if (comment || status || assignedTo || newAttachments.length > 0) {
            complaint.history.push({
                action: "Updated",
                by: req.user._id,
                comment: comment || `Status: ${status || 'unchanged'}${assignedTo ? ', Assigned to staff' : ''}${newAttachments.length > 0 ? ', Added ' + newAttachments.length + ' image(s)' : ''}`,
                attachments: newAttachments
            });
        }

        await complaint.save();

        // Populate history with user details for response
        await complaint.populate('history.by', 'name role');

        // Notify customer if admin updated
        if (req.user.role !== "CUSTOMER") {
            await createNotification({
                recipient: complaint.user,
                title: "Ticket Updated",
                message: `Your ticket "${complaint.subject}" has been updated`,
                type: "info",
                link: "/customer/support"
            });
        }

        // Log Activity
        await logAction(
            complaint.user,
            req.user.role === "CUSTOMER" ? "CUSTOMER" : "ADMIN",
            "UPDATE_TICKET",
            `Ticket updated: Status ${status || 'unchanged'}`,
            {
                complaintId: complaint._id,
                status,
                assignedTo,
                resolution,
                hasNewAttachments: newAttachments.length > 0
            },
            req
        );

        res.status(200).json({ success: true, message: "Complaint updated", result: complaint });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
