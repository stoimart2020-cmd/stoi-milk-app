const District = require("../models/District");
const City = require("../models/City");
const Area = require("../models/Area");
const Hub = require("../models/Hub");

/**
 * Resolves logistical filters into a list of Hub IDs.
 * Since customers are primarily linked only to Hubs, this allows filtering by higher hierarchy levels.
 */
exports.resolveHubs = async ({ factory, district, city, area, hub }) => {
    // If hub is specifically provided, we just use it
    if (hub) return [hub];

    let areaIds = [];

    if (area) {
        areaIds = [area];
    } else if (city) {
        const areas = await Area.find({ city, isActive: true }).select("_id");
        areaIds = areas.map(a => a._id);
    } else if (district) {
        const cities = await City.find({ district, isActive: true }).select("_id");
        const areas = await Area.find({ city: { $in: cities.map(c => c._id) }, isActive: true }).select("_id");
        areaIds = areas.map(a => a._id);
    } else if (factory) {
        const districts = await District.find({ factory, isActive: true }).select("_id");
        const cities = await City.find({ district: { $in: districts.map(d => d._id) }, isActive: true }).select("_id");
        const areas = await Area.find({ city: { $in: cities.map(c => c._id) }, isActive: true }).select("_id");
        areaIds = areas.map(a => a._id);
    }

    if (areaIds.length > 0) {
        const hubs = await Hub.find({ areas: { $in: areaIds }, isActive: true }).select("_id");
        return hubs.map(h => h._id);
    }

    // If any higher level filter was provided but no areas/hubs found, return empty array to force 0 results
    if (factory || district || city || area) {
        return [];
    }

    return null; // No filtering needed
};
