/**
 * Data Scope Middleware & Utility
 *
 * Computes the logged-in user's data scope based on their assigned
 * hub, factory, and areas. Controllers use `req.scope` to filter queries.
 *
 * Scope Rules:
 *  - SUPERADMIN / ADMIN → full access (no filters)
 *  - HUB_INCHARGE → sees data from their assigned hub + areas under that hub
 *  - FACTORY_INCHARGE → sees data from their assigned factory + vendors under it
 *  - DELIVERY_MANAGER → sees data from their assigned hub/areas
 *  - MILK_COLLECTION_PERSON → sees data from their assigned factory
 *  - Other roles with hub/factory → scoped accordingly
 *  - Custom roles with hub/factory on Employee → scoped accordingly
 */

const Area = require("../models/Area");
const ServiceArea = require("../models/ServiceArea");

/**
 * Middleware: Attaches `req.scope` with the user's accessible IDs.
 * Must be called AFTER `protect` middleware.
 */
const attachScope = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) return next();

        // Full access roles — no scoping
        const fullAccessRoles = ["SUPERADMIN", "ADMIN", "FIELD_MARKETING", "CUSTOMER_RELATIONS"];
        if (fullAccessRoles.includes(user.role)) {
            req.scope = { fullAccess: true };
            return next();
        }

        const scope = {
            fullAccess: false,
            hubIds: [],
            factoryIds: [],
            areaIds: [],
            serviceAreaIds: [],
        };

        // ─── Hub scope ─────────────────────────────────────
        if (user.hub) {
            const hubId = user.hub._id || user.hub;
            scope.hubIds.push(hubId.toString());

            // Find all areas under this hub
            const hubAreas = await Area.find({ hub: hubId, isActive: true }).select("_id").lean();
            const hubAreaIds = hubAreas.map(a => a._id.toString());
            scope.areaIds.push(...hubAreaIds);

            // Find all service areas linked to these areas
            const serviceAreas = await ServiceArea.find({
                area: { $in: hubAreaIds },
                isActive: true
            }).select("_id").lean();
            scope.serviceAreaIds.push(...serviceAreas.map(sa => sa._id.toString()));
        }

        // ─── Explicit area assignments (riders, delivery managers) ──
        if (user.areas && user.areas.length > 0) {
            const explicitAreaIds = user.areas.map(a => (a._id || a).toString());
            // Merge without duplicates
            explicitAreaIds.forEach(id => {
                if (!scope.areaIds.includes(id)) scope.areaIds.push(id);
            });

            // Also find service areas for these explicit areas
            const serviceAreas = await ServiceArea.find({
                area: { $in: explicitAreaIds },
                isActive: true
            }).select("_id").lean();
            serviceAreas.forEach(sa => {
                const saId = sa._id.toString();
                if (!scope.serviceAreaIds.includes(saId)) scope.serviceAreaIds.push(saId);
            });
        }

        // ─── Factory scope ─────────────────────────────────
        if (user.factory) {
            scope.factoryIds.push((user.factory._id || user.factory).toString());
        }

        req.scope = scope;
        next();
    } catch (error) {
        console.error("Scope middleware error:", error.message);
        // Don't block request; fall back to no scope (will show empty data)
        req.scope = { fullAccess: false, hubIds: [], factoryIds: [], areaIds: [], serviceAreaIds: [] };
        next();
    }
};

/**
 * Utility: Build a MongoDB filter for customers based on the user's scope.
 * Customers are scoped by their `serviceArea` field.
 *
 * @param {Object} scope - req.scope
 * @param {Object} existingFilter - any existing mongo filter to merge with
 * @returns {Object} merged filter
 */
const scopeCustomerFilter = (scope, existingFilter = {}) => {
    if (!scope || scope.fullAccess) return existingFilter;

    if (scope.serviceAreaIds.length > 0) {
        return { ...existingFilter, serviceArea: { $in: scope.serviceAreaIds } };
    }

    // If no service areas resolved, return impossible filter (no data)
    return { ...existingFilter, _id: null };
};

/**
 * Utility: Build a filter for orders based on scope.
 * Orders are filtered by fetching scoped customer IDs first,
 * or by assignedRider if the user is a rider.
 *
 * @param {Object} scope - req.scope
 * @param {Object} existingFilter - existing filter
 * @param {Array} scopedCustomerIds - pre-fetched customer IDs (optional)
 * @returns {Object} merged filter
 */
const scopeOrderFilter = (scope, existingFilter = {}, scopedCustomerIds = null) => {
    if (!scope || scope.fullAccess) return existingFilter;

    if (scopedCustomerIds && scopedCustomerIds.length > 0) {
        return { ...existingFilter, customer: { $in: scopedCustomerIds } };
    }

    return { ...existingFilter, _id: null };
};

/**
 * Utility: Build a filter for employees based on scope.
 * Employees are scoped by hub, factory, or areas.
 *
 * @param {Object} scope - req.scope
 * @param {Object} existingFilter - existing filter
 * @returns {Object} merged filter
 */
const scopeEmployeeFilter = (scope, existingFilter = {}) => {
    if (!scope || scope.fullAccess) return existingFilter;

    const conditions = [];

    if (scope.hubIds.length > 0) {
        conditions.push({ hub: { $in: scope.hubIds } });
    }

    if (scope.factoryIds.length > 0) {
        conditions.push({ factory: { $in: scope.factoryIds } });
    }

    if (scope.areaIds.length > 0) {
        conditions.push({ areas: { $in: scope.areaIds } });
    }

    if (conditions.length === 0) {
        return { ...existingFilter, _id: null };
    }

    return { ...existingFilter, $or: conditions };
};

/**
 * Utility: Build a filter for vendors based on scope.
 * Vendors are scoped by factory.
 *
 * @param {Object} scope - req.scope
 * @param {Object} existingFilter - existing filter
 * @returns {Object} merged filter
 */
const scopeVendorFilter = (scope, existingFilter = {}) => {
    if (!scope || scope.fullAccess) return existingFilter;

    if (scope.factoryIds.length > 0) {
        return { ...existingFilter, factory: { $in: scope.factoryIds } };
    }

    return { ...existingFilter, _id: null };
};

/**
 * Utility: Build a filter for milk collections based on scope.
 * Collections are scoped through vendor → factory.
 *
 * @param {Object} scope - req.scope
 * @param {Object} existingFilter - existing filter
 * @param {Array} scopedVendorIds - pre-fetched vendor IDs (optional)
 * @returns {Object} merged filter
 */
const scopeCollectionFilter = (scope, existingFilter = {}, scopedVendorIds = null) => {
    if (!scope || scope.fullAccess) return existingFilter;

    if (scopedVendorIds && scopedVendorIds.length > 0) {
        return { ...existingFilter, vendor: { $in: scopedVendorIds } };
    }

    return { ...existingFilter, _id: null };
};

module.exports = {
    attachScope,
    scopeCustomerFilter,
    scopeOrderFilter,
    scopeEmployeeFilter,
    scopeVendorFilter,
    scopeCollectionFilter,
};
