const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { protect, authorize } = require('../middleware/auth'); // Ensure middleware path is correct

// @desc    Get public settings (non-sensitive info - branding, contact, etc.)
// @route   GET /api/settings/public
// @access  Public
router.get('/public', async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        // Return only non-sensitive fields safe for public access
        const publicData = {
            businessName: settings?.header?.businessName || settings?.businessName,
            logo: settings?.header?.logo || settings?.logo,
            primaryColor: settings?.header?.primaryColor,
            tagline: settings?.header?.tagline,
            contactEmail: settings?.contact?.email,
            contactPhone: settings?.contact?.phone,
            address: settings?.contact?.address,
        };
        res.json({ status: 'success', result: publicData });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// @desc    Get current settings (Public/Private unified for this use case)
// @route   GET /api/settings
// @access  Public (Allowed for getting contact info etc)
router.get('/', async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        res.json({
            status: 'success',
            result: settings
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// @desc    Update settings (Section based)
// @route   PUT /api/settings
// @access  Private/Admin
// Expected body: { section: 'header', data: { ... } }
router.put('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { section, data } = req.body;

        let settings = await Setting.findOne();
        if (!settings) {
            settings = new Setting();
        }

        if (section && data) {
            // Update specific section
            if (settings[section] && typeof settings[section] === 'object') {
                // Use Object.assign to update existing Mongoose object properties
                // This preserves the Mongoose object reference and handles change tracking better
                Object.assign(settings[section], data);
            } else {
                settings[section] = data;
            }
        } else {
            // Fallback for full update if needed, though frontend sends section
            // Not implemented to prevent accidental overwrite
        }

        settings.updatedBy = req.user._id;

        await settings.save();

        res.json({
            status: 'success',
            message: 'Settings updated successfully',
            result: settings
        });
    } catch (error) {
        console.error("Settings Update Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
