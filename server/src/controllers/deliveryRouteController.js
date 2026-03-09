const DeliveryRoute = require('../models/DeliveryRoute');
const Area = require('../models/Area');

// Get all delivery routes
exports.getDeliveryRoutes = async (req, res) => {
    try {
        const { area, isActive } = req.query;
        const query = {};

        if (area) query.area = area;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const routes = await DeliveryRoute.find(query)
            .populate({
                path: 'area',
                populate: {
                    path: 'hub',
                    populate: {
                        path: 'city',
                        populate: {
                            path: 'district',
                            populate: {
                                path: 'factory'
                            }
                        }
                    }
                }
            })
            .populate('createdBy', 'name')
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            result: routes,
            count: routes.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single delivery route
exports.getDeliveryRoute = async (req, res) => {
    try {
        const route = await DeliveryRoute.findById(req.params.id)
            .populate({
                path: 'area',
                populate: {
                    path: 'hub',
                    populate: {
                        path: 'city',
                        populate: {
                            path: 'district',
                            populate: {
                                path: 'factory'
                            }
                        }
                    }
                }
            })
            .populate('createdBy', 'name');

        if (!route) {
            return res.status(404).json({
                success: false,
                message: 'Delivery route not found'
            });
        }

        res.status(200).json({
            success: true,
            result: route
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create delivery route
exports.createDeliveryRoute = async (req, res) => {
    try {
        const { name, code, area, description, estimatedDeliveries, averageDeliveryTime, polygon, landmarks, isActive, notes } = req.body;

        // Verify area exists
        const areaExists = await Area.findById(area);
        if (!areaExists) {
            return res.status(404).json({
                success: false,
                message: 'Area not found'
            });
        }

        // Check for duplicate code
        if (code) {
            const existingRoute = await DeliveryRoute.findOne({ code });
            if (existingRoute) {
                return res.status(400).json({
                    success: false,
                    message: 'Route code already exists'
                });
            }
        }

        const route = await DeliveryRoute.create({
            name,
            code,
            area,
            description,
            estimatedDeliveries,
            averageDeliveryTime,
            polygon,
            landmarks,
            isActive,
            notes,
            createdBy: req.user._id
        });

        const populatedRoute = await DeliveryRoute.findById(route._id)
            .populate({
                path: 'area',
                populate: {
                    path: 'hub',
                    populate: {
                        path: 'city',
                        populate: {
                            path: 'district'
                        }
                    }
                }
            });

        res.status(201).json({
            success: true,
            message: 'Delivery route created successfully',
            result: populatedRoute
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update delivery route
exports.updateDeliveryRoute = async (req, res) => {
    try {
        const { name, code, area, description, estimatedDeliveries, averageDeliveryTime, polygon, landmarks, isActive, notes } = req.body;

        const route = await DeliveryRoute.findById(req.params.id);
        if (!route) {
            return res.status(404).json({
                success: false,
                message: 'Delivery route not found'
            });
        }

        // Check for duplicate code (if changing code)
        if (code && code !== route.code) {
            const existingRoute = await DeliveryRoute.findOne({ code });
            if (existingRoute) {
                return res.status(400).json({
                    success: false,
                    message: 'Route code already exists'
                });
            }
        }

        // Verify area exists (if changing area)
        if (area && area !== route.area.toString()) {
            const areaExists = await Area.findById(area);
            if (!areaExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Area not found'
                });
            }
        }

        // Update fields
        if (name) route.name = name;
        if (code !== undefined) route.code = code;
        if (area) route.area = area;
        if (description !== undefined) route.description = description;
        if (estimatedDeliveries !== undefined) route.estimatedDeliveries = estimatedDeliveries;
        if (averageDeliveryTime !== undefined) route.averageDeliveryTime = averageDeliveryTime;
        if (polygon !== undefined) route.polygon = polygon;
        if (landmarks !== undefined) route.landmarks = landmarks;
        if (isActive !== undefined) route.isActive = isActive;
        if (notes !== undefined) route.notes = notes;

        await route.save();

        const populatedRoute = await DeliveryRoute.findById(route._id)
            .populate({
                path: 'area',
                populate: {
                    path: 'hub',
                    populate: {
                        path: 'city',
                        populate: {
                            path: 'district'
                        }
                    }
                }
            });

        res.status(200).json({
            success: true,
            message: 'Delivery route updated successfully',
            result: populatedRoute
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete delivery route
exports.deleteDeliveryRoute = async (req, res) => {
    try {
        const route = await DeliveryRoute.findById(req.params.id);
        if (!route) {
            return res.status(404).json({
                success: false,
                message: 'Delivery route not found'
            });
        }

        // Check if any stock points are linked to this route
        const StockPoint = require('../models/StockPoint');
        const linkedStockPoints = await StockPoint.countDocuments({ deliveryRoute: req.params.id });

        if (linkedStockPoints > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete route. ${linkedStockPoints} stock point(s) are linked to this route.`
            });
        }

        await route.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Delivery route deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get routes by area
exports.getRoutesByArea = async (req, res) => {
    try {
        const routes = await DeliveryRoute.find({ area: req.params.areaId, isActive: true })
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            result: routes,
            count: routes.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
