const Factory = require("../models/Factory");
const District = require("../models/District");
const City = require("../models/City");
const Area = require("../models/Area");
const Hub = require("../models/Hub");
const DeliveryPoint = require("../models/DeliveryPoint");
const DeliveryRoute = require("../models/DeliveryRoute");
const Employee = require("../models/Employee");
const Vehicle = require("../models/Vehicle");
const TruckTrip = require("../models/TruckTrip");
const User = require("../models/User");
const inventoryController = require("./inventoryController");

// ========================
// FACTORY Controllers
// ========================
exports.createFactory = async (req, res) => {
    try {
        const factory = await Factory.create(req.body);
        res.status(201).json({ success: true, result: factory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFactories = async (req, res) => {
    try {
        const factories = await Factory.find({ isActive: true });
        res.status(200).json({ success: true, result: factories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateFactory = async (req, res) => {
    try {
        const factory = await Factory.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, result: factory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteFactory = async (req, res) => {
    try {
        await Factory.findByIdAndUpdate(req.params.id, { isActive: false });
        res.status(200).json({ success: true, message: "Factory deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// DISTRICT Controllers
// ========================
exports.createDistrict = async (req, res) => {
    try {
        const district = await District.create(req.body);
        res.status(201).json({ success: true, result: district });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDistricts = async (req, res) => {
    try {
        const filter = { isActive: true };
        if (req.query.factory) filter.factory = req.query.factory;
        const districts = await District.find(filter).populate("factory", "name");
        res.status(200).json({ success: true, result: districts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateDistrict = async (req, res) => {
    try {
        const district = await District.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, result: district });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteDistrict = async (req, res) => {
    try {
        await District.findByIdAndUpdate(req.params.id, { isActive: false });
        res.status(200).json({ success: true, message: "District deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// CITY Controllers
// ========================
exports.createCity = async (req, res) => {
    try {
        const city = await City.create(req.body);
        res.status(201).json({ success: true, result: city });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCities = async (req, res) => {
    try {
        const filter = { isActive: true };
        if (req.query.district) filter.district = req.query.district;
        const cities = await City.find(filter).populate({
            path: "district",
            select: "name factory",
            populate: { path: "factory", select: "name" }
        });
        res.status(200).json({ success: true, result: cities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateCity = async (req, res) => {
    try {
        const city = await City.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, result: city });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteCity = async (req, res) => {
    try {
        await City.findByIdAndUpdate(req.params.id, { isActive: false });
        res.status(200).json({ success: true, message: "City deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// AREA Controllers
// ========================
exports.createArea = async (req, res) => {
    try {
        const area = await Area.create(req.body);
        res.status(201).json({ success: true, result: area });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAreas = async (req, res) => {
    try {
        const filter = { isActive: true };
        if (req.query.hub) filter.hub = req.query.hub;
        const areas = await Area.find(filter).populate({
            path: "hub",
            select: "name city",
            populate: {
                path: "city",
                select: "name district",
                populate: { path: "district", select: "name factory", populate: { path: "factory", select: "name" } }
            }
        });
        res.status(200).json({ success: true, result: areas });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateArea = async (req, res) => {
    try {
        const area = await Area.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, result: area });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteArea = async (req, res) => {
    try {
        await Area.findByIdAndUpdate(req.params.id, { isActive: false });
        res.status(200).json({ success: true, message: "Area deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// HUB Controllers (Hub manages multiple Areas)
// ========================
exports.createHub = async (req, res) => {
    try {
        const hub = await Hub.create(req.body);
        res.status(201).json({ success: true, result: hub });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getHubs = async (req, res) => {
    try {
        const filter = { isActive: true };
        if (req.query.city) filter.city = req.query.city;
        const hubs = await Hub.find(filter)
            .populate({
                path: "city",
                select: "name district",
                populate: {
                    path: "district",
                    select: "name factory",
                    populate: { path: "factory", select: "name" }
                }
            });
        res.status(200).json({ success: true, result: hubs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateHub = async (req, res) => {
    try {
        const hub = await Hub.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, result: hub });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteHub = async (req, res) => {
    try {
        await Hub.findByIdAndUpdate(req.params.id, { isActive: false });
        res.status(200).json({ success: true, message: "Hub deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// DELIVERY POINT Controllers (DeliveryPoint belongs to Hub)
// ========================
exports.createDeliveryPoint = async (req, res) => {
    try {
        const deliveryPoint = await DeliveryPoint.create(req.body);
        res.status(201).json({ success: true, result: deliveryPoint });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDeliveryPoints = async (req, res) => {
    try {
        const filter = { isActive: true };
        if (req.query.hub) filter.hub = req.query.hub;
        const deliveryPoints = await DeliveryPoint.find(filter).populate({
            path: "hub",
            select: "name areas",
            populate: {
                path: "areas",
                select: "name city",
                populate: {
                    path: "city",
                    select: "name"
                }
            }
        });
        res.status(200).json({ success: true, result: deliveryPoints });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateDeliveryPoint = async (req, res) => {
    try {
        const deliveryPoint = await DeliveryPoint.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, result: deliveryPoint });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteDeliveryPoint = async (req, res) => {
    try {
        await DeliveryPoint.findByIdAndUpdate(req.params.id, { isActive: false });
        res.status(200).json({ success: true, message: "Delivery Point deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// DELIVERY ROUTE Controllers
// ========================
exports.createDeliveryRoute = async (req, res) => {
    try {
        const route = await DeliveryRoute.create(req.body);
        res.status(201).json({ success: true, result: route });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDeliveryRoutes = async (req, res) => {
    try {
        const filter = { isActive: true };
        if (req.query.area) filter.area = req.query.area;
        const routes = await DeliveryRoute.find(filter).populate({
            path: "area",
            select: "name hub",
            populate: {
                path: "hub",
                select: "name city",
                populate: { path: "city", select: "name" }
            }
        });
        res.status(200).json({ success: true, result: routes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateDeliveryRoute = async (req, res) => {
    try {
        const route = await DeliveryRoute.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, result: route });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteDeliveryRoute = async (req, res) => {
    try {
        await DeliveryRoute.findByIdAndUpdate(req.params.id, { isActive: false });
        res.status(200).json({ success: true, message: "Delivery Route deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// HIERARCHY VIEW - Full tree structure
// ========================
exports.getHierarchy = async (req, res) => {
    try {
        const factories = await Factory.find({ isActive: true }).lean();

        const hierarchy = [];
        for (const factory of factories) {
            const districts = await District.find({ factory: factory._id, isActive: true }).lean();

            const districtTree = [];
            for (const district of districts) {
                const cities = await City.find({ district: district._id, isActive: true }).lean();

                const cityTree = [];
                for (const city of cities) {
                    const hubs = await Hub.find({ city: city._id, isActive: true }).lean();

                    const hubTree = [];
                    for (const hub of hubs) {
                        const areas = await Area.find({ hub: hub._id, isActive: true }).lean();
                        const deliveryPoints = await DeliveryPoint.find({ hub: hub._id, isActive: true }).lean();

                        const areaTree = [];
                        for (const area of areas) {
                            areaTree.push({ ...area });
                        }

                        hubTree.push({ ...hub, areas: areaTree, deliveryPoints });
                    }
                    cityTree.push({ ...city, hubs: hubTree });
                }
                districtTree.push({ ...district, cities: cityTree });
            }
            hierarchy.push({ ...factory, districts: districtTree });
        }

        res.status(200).json({ success: true, result: hierarchy });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// ========================
// TRUCK DRIVER Hub Mapping
// ========================
exports.getTruckDrivers = async (req, res) => {
    try {
        const drivers = await Employee.find({ role: "TRUCK_DRIVER", isActive: true })
            .select("name email mobile hubs isActive")
            .populate("hubs", "name code city");
        res.status(200).json({ success: true, result: drivers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateTruckDriverHubs = async (req, res) => {
    try {
        const { hubs } = req.body; 
        const driver = await Employee.findByIdAndUpdate(
            req.params.id, 
            { hubs }, 
            { new: true }
        ).populate("hubs", "name code");
        
        res.status(200).json({ success: true, result: driver });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ====================
// FLEET MANAGEMENT (VEHICLES)
// ====================
exports.getVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find().sort({ plateNumber: 1 });
        res.status(200).json({ success: true, result: vehicles });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.create(req.body);
        res.status(201).json({ success: true, result: vehicle });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, result: vehicle });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteVehicle = async (req, res) => {
    try {
        await Vehicle.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Vehicle deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ====================
// TRUCK TRIP OPERATIONS
// ====================
exports.getTruckTrips = async (req, res) => {
    try {
        const { date, driverId } = req.query;
        const filter = {};
        if (date) {
            const d = new Date(date);
            filter.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
        }
        if (driverId) filter.driver = driverId;

        const trips = await TruckTrip.find(filter)
            .populate("driver", "name mobile")
            .populate("vehicle", "plateNumber model")
            .sort({ date: -1, createdAt: -1 });

        res.status(200).json({ success: true, result: trips });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createTruckTrip = async (req, res) => {
    try {
        const trip = await TruckTrip.create(req.body);
        res.status(201).json({ success: true, result: trip });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.startTruckTrip = async (req, res) => {
    try {
        const { startKm } = req.body;
        const trip = await TruckTrip.findByIdAndUpdate(
            req.params.id, 
            { 
                startKm, 
                status: "LOADING", 
                startTime: new Date() 
            }, 
            { new: true }
        );
        res.status(200).json({ success: true, result: trip });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.confirmPickup = async (req, res) => {
    try {
        const { manifest } = req.body; // Array of { product, confirmedUnits }
        const trip = await TruckTrip.findByIdAndUpdate(
            req.params.id,
            {
                manifest,
                isConfirmed: true,
                confirmedAt: new Date(),
                status: "IN_TRANSIT"
            },
            { new: true }
        );
        res.status(200).json({ success: true, result: trip });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.endTruckTrip = async (req, res) => {
    try {
        const { endKm } = req.body;
        const trip = await TruckTrip.findById(req.params.id);
        
        trip.endKm = endKm;
        trip.status = "COMPLETED";
        trip.endTime = new Date();
        await trip.save(); // pre-save will calc distance

        // Update vehicle KM too
        if (trip.vehicle) {
            await Vehicle.findByIdAndUpdate(trip.vehicle, { currentKm: endKm });
        }

        res.status(200).json({ success: true, result: trip });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTripManifest = async (req, res) => {
    try {
        const { date, driverId } = req.query;
        // Fetch the 4-tier forecast for the requested date
        const forecast = await inventoryController.getLogisticsForecastInternal(date);
        
        // Find the specific driver's truck in the hierarchy
        let truckNode = null;
        if (forecast.hierarchy && forecast.hierarchy.trucks) {
            truckNode = forecast.hierarchy.trucks[driverId];
        }

        res.status(200).json({ 
            success: true, 
            result: truckNode || { name: "Not Assigned", hubs: {}, products: {} } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
