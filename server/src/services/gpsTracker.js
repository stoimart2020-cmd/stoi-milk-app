/**
 * Real-Time GPS Tracking Service
 * Manages driver location tracking and customer tracking
 */

const EventEmitter = require('events');

class GPSTracker extends EventEmitter {
    constructor() {
        super();
        this.activeTracking = new Map(); // riderId -> location data
        this.orderTracking = new Map();  // orderId -> riderId
        this.locationHistory = new Map(); // riderId -> array of locations
        this.maxHistorySize = 100; // Keep last 100 locations
    }

    /**
     * Update rider location
     * @param {String} riderId - Rider ID
     * @param {Object} location - { lat, lng, accuracy, timestamp, speed, heading }
     */
    updateLocation(riderId, location) {
        const locationData = {
            riderId,
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy || 0,
            speed: location.speed || 0,
            heading: location.heading || 0,
            timestamp: location.timestamp || new Date(),
            battery: location.battery || null
        };

        // Update active tracking
        this.activeTracking.set(riderId, locationData);

        // Update location history
        if (!this.locationHistory.has(riderId)) {
            this.locationHistory.set(riderId, []);
        }
        const history = this.locationHistory.get(riderId);
        history.push(locationData);

        // Keep only recent history
        if (history.length > this.maxHistorySize) {
            history.shift();
        }

        // Emit location update event
        this.emit('locationUpdate', locationData);

        // Update all orders assigned to this rider
        const affectedOrders = this.getOrdersByRider(riderId);
        affectedOrders.forEach(orderId => {
            this.emit('orderLocationUpdate', { orderId, location: locationData });
        });

        return { success: true, location: locationData };
    }

    /**
     * Get current location of a rider
     */
    getRiderLocation(riderId) {
        const location = this.activeTracking.get(riderId);
        if (!location) {
            return { success: false, message: 'Rider location not available' };
        }

        // Check if location is stale (older than 5 minutes)
        const age = Date.now() - new Date(location.timestamp).getTime();
        const isStale = age > 5 * 60 * 1000;

        return {
            success: true,
            location,
            isStale,
            ageMinutes: Math.round(age / 60000)
        };
    }

    /**
     * Get location history for a rider
     */
    getRiderHistory(riderId, limit = 50) {
        const history = this.locationHistory.get(riderId) || [];
        return {
            success: true,
            history: history.slice(-limit),
            count: history.length
        };
    }

    /**
     * Associate order with rider for tracking
     */
    assignOrderToRider(orderId, riderId) {
        this.orderTracking.set(orderId, riderId);
        this.emit('orderAssigned', { orderId, riderId });
        return { success: true };
    }

    /**
     * Remove order from tracking
     */
    completeOrder(orderId) {
        this.orderTracking.delete(orderId);
        this.emit('orderCompleted', { orderId });
        return { success: true };
    }

    /**
     * Get location for an order
     */
    getOrderLocation(orderId) {
        const riderId = this.orderTracking.get(orderId);
        if (!riderId) {
            return { success: false, message: 'Order not assigned to any rider' };
        }

        return this.getRiderLocation(riderId);
    }

    /**
     * Get all orders being tracked by a rider
     */
    getOrdersByRider(riderId) {
        const orders = [];
        for (const [orderId, rId] of this.orderTracking.entries()) {
            if (rId === riderId) {
                orders.push(orderId);
            }
        }
        return orders;
    }

    /**
     * Calculate ETA based on current location and destination
     */
    calculateETA(riderId, destination) {
        const riderLocation = this.getRiderLocation(riderId);
        if (!riderLocation.success) {
            return { success: false, message: 'Rider location not available' };
        }

        const location = riderLocation.location;
        const distance = this.calculateDistance(
            location.lat,
            location.lng,
            destination.lat,
            destination.lng
        );

        // Estimate speed (use actual speed if available, otherwise assume 30 km/h)
        const speedKmh = location.speed > 0 ? location.speed * 3.6 : 30;
        const etaMinutes = (distance / speedKmh) * 60;

        return {
            success: true,
            eta: Math.round(etaMinutes),
            distance: distance.toFixed(2),
            estimatedArrival: new Date(Date.now() + etaMinutes * 60000)
        };
    }

    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Get all active riders
     */
    getActiveRiders() {
        const riders = [];
        const now = Date.now();

        for (const [riderId, location] of this.activeTracking.entries()) {
            const age = now - new Date(location.timestamp).getTime();
            const isActive = age < 5 * 60 * 1000; // Active if updated in last 5 minutes

            if (isActive) {
                riders.push({
                    riderId,
                    location,
                    ordersCount: this.getOrdersByRider(riderId).length
                });
            }
        }

        return {
            success: true,
            riders,
            count: riders.length
        };
    }

    /**
     * Get tracking summary for admin dashboard
     */
    getTrackingSummary() {
        const activeRiders = this.getActiveRiders();
        const totalOrders = this.orderTracking.size;

        return {
            success: true,
            activeRiders: activeRiders.count,
            ordersInTransit: totalOrders,
            riders: activeRiders.riders
        };
    }

    /**
     * Clear stale data (run periodically)
     */
    cleanup() {
        const now = Date.now();
        const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours

        // Remove stale active tracking
        for (const [riderId, location] of this.activeTracking.entries()) {
            const age = now - new Date(location.timestamp).getTime();
            if (age > staleThreshold) {
                this.activeTracking.delete(riderId);
            }
        }

        // Clear old history
        for (const [riderId, history] of this.locationHistory.entries()) {
            const recentHistory = history.filter(loc => {
                const age = now - new Date(loc.timestamp).getTime();
                return age < staleThreshold;
            });

            if (recentHistory.length === 0) {
                this.locationHistory.delete(riderId);
            } else {
                this.locationHistory.set(riderId, recentHistory);
            }
        }

        return {
            success: true,
            message: 'Cleanup completed',
            activeRiders: this.activeTracking.size,
            ridersWithHistory: this.locationHistory.size
        };
    }

    /**
     * Start tracking session for rider
     */
    startTracking(riderId) {
        this.emit('trackingStarted', { riderId, timestamp: new Date() });
        return { success: true, message: 'Tracking started' };
    }

    /**
     * Stop tracking session for rider
     */
    stopTracking(riderId) {
        this.activeTracking.delete(riderId);
        this.emit('trackingStopped', { riderId, timestamp: new Date() });
        return { success: true, message: 'Tracking stopped' };
    }

    /**
     * Get geofence status (check if rider is within delivery area)
     */
    checkGeofence(riderId, geofencePolygon) {
        const riderLocation = this.getRiderLocation(riderId);
        if (!riderLocation.success) {
            return { success: false, message: 'Rider location not available' };
        }

        const location = riderLocation.location;
        const isInside = this.isPointInPolygon(
            { lat: location.lat, lng: location.lng },
            geofencePolygon
        );

        return {
            success: true,
            isInside,
            location
        };
    }

    /**
     * Point in polygon algorithm (Ray casting)
     */
    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];

            const intersect = ((yi > point.lat) !== (yj > point.lat))
                && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}

// Singleton instance
const gpsTracker = new GPSTracker();

// Auto cleanup every hour
setInterval(() => {
    gpsTracker.cleanup();
}, 60 * 60 * 1000);

module.exports = gpsTracker;
