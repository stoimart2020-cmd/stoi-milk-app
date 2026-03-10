const ServiceArea = require("../models/ServiceArea");

// Get all service areas
exports.getAllServiceAreas = async (req, res) => {
    try {
        const { active } = req.query;
        let query = {};
        if (active === "true") query.isActive = true;

        const areas = await ServiceArea.find(query)
            .populate("area", "name")
            .sort({ priority: -1, name: 1 });

        res.status(200).json({ success: true, result: areas });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single service area
exports.getServiceAreaById = async (req, res) => {
    try {
        const area = await ServiceArea.findById(req.params.id).populate("area");
        if (!area) {
            return res.status(404).json({ success: false, message: "Service area not found" });
        }
        res.status(200).json({ success: true, result: area });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create service area
exports.createServiceArea = async (req, res) => {
    try {
        console.log("Create Service Area Request Body:", JSON.stringify(req.body, null, 2));
        const { name, polygon, ...rest } = req.body;

        // Validate polygon
        if (!polygon?.coordinates || polygon.coordinates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Valid polygon coordinates are required"
            });
        }

        // Ensure polygon is closed (first and last point should be same)
        const coords = polygon.coordinates[0];
        if (coords[0][0] !== coords[coords.length - 1][0] ||
            coords[0][1] !== coords[coords.length - 1][1]) {
            coords.push(coords[0]); // Close the polygon
        }

        // Calculate center
        let centerLat = 0, centerLng = 0;
        coords.forEach(coord => {
            centerLng += coord[0];
            centerLat += coord[1];
        });
        const center = {
            lat: centerLat / coords.length,
            lng: centerLng / coords.length,
        };

        // Check for overlaps with existing polygons
        // Using $geoIntersects to see if the new polygon intersects with any already saved polygon
        const overlap = await ServiceArea.findOne({
            polygon: {
                $geoIntersects: {
                    $geometry: {
                        type: "Polygon",
                        coordinates: [coords]
                    }
                }
            }
        });

        if (overlap) {
            return res.status(400).json({
                success: false,
                message: `This area overlaps with an existing service area: ${overlap.name}. Please draw it without overlapping.`
            });
        }

        console.log("Creating ServiceArea with data:", {
            name,
            polygon: { type: "Polygon", coordinates: [coords] },
            center,
            ...rest,
        });

        const area = await ServiceArea.create({
            name,
            polygon: { type: "Polygon", coordinates: [coords] },
            center,
            ...rest,
        });

        console.log("ServiceArea.create completed:", area._id);

        res.status(201).json({ success: true, result: area });
    } catch (error) {
        console.error("Create Service Area Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update service area
exports.updateServiceArea = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // If updating polygon, recalculate center
        if (updateData.polygon?.coordinates) {
            const coords = updateData.polygon.coordinates[0];
            let centerLat = 0, centerLng = 0;
            coords.forEach(coord => {
                centerLng += coord[0];
                centerLat += coord[1];
            });
            updateData.center = {
                lat: centerLat / coords.length,
                lng: centerLng / coords.length,
            };

            // Check for overlaps with existing polygons, excluding the current service area itself
            const overlap = await ServiceArea.findOne({
                _id: { $ne: id },
                polygon: {
                    $geoIntersects: {
                        $geometry: {
                            type: "Polygon",
                            coordinates: updateData.polygon.coordinates
                        }
                    }
                }
            });

            if (overlap) {
                return res.status(400).json({
                    success: false,
                    message: `This updated area overlaps with existing service area: ${overlap.name}. Please draw it without overlapping.`
                });
            }
        }

        const area = await ServiceArea.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!area) {
            return res.status(404).json({ success: false, message: "Service area not found" });
        }

        res.status(200).json({ success: true, result: area });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete service area
exports.deleteServiceArea = async (req, res) => {
    try {
        const area = await ServiceArea.findByIdAndDelete(req.params.id);
        if (!area) {
            return res.status(404).json({ success: false, message: "Service area not found" });
        }
        res.status(200).json({ success: true, message: "Service area deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Check if location is serviceable (public endpoint)
exports.checkServiceability = async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: "Latitude and longitude are required"
            });
        }

        const area = await ServiceArea.isPointInServiceArea(
            parseFloat(lat),
            parseFloat(lng)
        );

        if (area) {
            res.status(200).json({
                success: true,
                serviceable: true,
                area: {
                    name: area.name,
                    deliveryCharge: area.deliveryCharge,
                    minimumOrderValue: area.minimumOrderValue,
                    estimatedDeliveryTime: area.estimatedDeliveryTime,
                    freeDeliveryAbove: area.freeDeliveryAbove,
                },
            });
        } else {
            res.status(200).json({
                success: true,
                serviceable: false,
                message: "Sorry, we don't deliver to this location yet",
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get service area for a location
exports.getAreaForLocation = async (req, res) => {
    try {
        const { lat, lng } = req.query;

        const area = await ServiceArea.isPointInServiceArea(
            parseFloat(lat),
            parseFloat(lng)
        );

        res.status(200).json({ success: true, result: area });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle service area status
exports.toggleServiceAreaStatus = async (req, res) => {
    try {
        const area = await ServiceArea.findById(req.params.id);
        if (!area) {
            return res.status(404).json({ success: false, message: "Service area not found" });
        }

        area.isActive = !area.isActive;
        await area.save();

        res.status(200).json({ success: true, result: area });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
