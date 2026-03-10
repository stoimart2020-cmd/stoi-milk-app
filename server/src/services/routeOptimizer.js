/**
 * Route Optimization Service
 * Optimizes delivery routes using Google Maps Distance Matrix API
 */

const axios = require('axios');

class RouteOptimizer {
    constructor() {
        this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
        this.baseUrl = 'https://maps.googleapis.com/maps/api';
    }

    /**
     * Optimize route for multiple deliveries
     * @param {Object} depot - Starting point { lat, lng, address }
     * @param {Array} deliveries - Array of delivery points with { lat, lng, address, orderId, priority }
     * @returns {Object} Optimized route with order and estimated times
     */
    async optimizeRoute(depot, deliveries) {
        try {
            if (!deliveries || deliveries.length === 0) {
                return { success: false, message: 'No deliveries to optimize' };
            }

            // For single delivery, no optimization needed
            if (deliveries.length === 1) {
                return {
                    success: true,
                    optimizedRoute: [deliveries[0]],
                    totalDistance: 0,
                    totalDuration: 0,
                    routeOrder: [0]
                };
            }

            // Get distance matrix
            const distanceMatrix = await this.getDistanceMatrix(depot, deliveries);

            // Apply optimization algorithm
            const optimizedRoute = this.nearestNeighborAlgorithm(depot, deliveries, distanceMatrix);

            return optimizedRoute;
        } catch (error) {
            console.error('Route optimization error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get distance matrix from Google Maps API
     */
    async getDistanceMatrix(depot, deliveries) {
        if (!this.googleMapsApiKey) {
            // Fallback to simple calculation if no API key
            return this.calculateSimpleDistanceMatrix(depot, deliveries);
        }

        try {
            const origins = [depot, ...deliveries].map(point => `${point.lat},${point.lng}`).join('|');
            const destinations = origins;

            const response = await axios.get(`${this.baseUrl}/distancematrix/json`, {
                params: {
                    origins,
                    destinations,
                    key: this.googleMapsApiKey,
                    mode: 'driving',
                    units: 'metric'
                }
            });

            if (response.data.status !== 'OK') {
                throw new Error(`Google Maps API error: ${response.data.status}`);
            }

            return this.parseDistanceMatrix(response.data);
        } catch (error) {
            console.warn('Google Maps API failed, using fallback:', error.message);
            return this.calculateSimpleDistanceMatrix(depot, deliveries);
        }
    }

    /**
     * Parse Google Maps distance matrix response
     */
    parseDistanceMatrix(data) {
        const matrix = [];
        data.rows.forEach(row => {
            const distances = row.elements.map(element => ({
                distance: element.distance?.value || 999999, // meters
                duration: element.duration?.value || 999999  // seconds
            }));
            matrix.push(distances);
        });
        return matrix;
    }

    /**
     * Fallback: Calculate simple distance matrix using Haversine formula
     */
    calculateSimpleDistanceMatrix(depot, deliveries) {
        const points = [depot, ...deliveries];
        const matrix = [];

        for (let i = 0; i < points.length; i++) {
            const row = [];
            for (let j = 0; j < points.length; j++) {
                const distance = this.haversineDistance(points[i], points[j]);
                row.push({
                    distance: distance * 1000, // Convert to meters
                    duration: (distance / 40) * 3600 // Assume 40 km/h average speed
                });
            }
            matrix.push(row);
        }

        return matrix;
    }

    /**
     * Haversine formula for distance calculation
     */
    haversineDistance(point1, point2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(point2.lat - point1.lat);
        const dLon = this.toRad(point2.lng - point1.lng);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Nearest Neighbor Algorithm for route optimization
     * Simple but effective for most cases
     */
    nearestNeighborAlgorithm(depot, deliveries, distanceMatrix) {
        const n = deliveries.length;
        const visited = new Array(n).fill(false);
        const route = [];
        let currentIndex = 0; // Start from depot (index 0 in matrix)
        let totalDistance = 0;
        let totalDuration = 0;

        // Visit all deliveries
        for (let i = 0; i < n; i++) {
            let nearestIndex = -1;
            let nearestDistance = Infinity;

            // Find nearest unvisited delivery
            for (let j = 0; j < n; j++) {
                if (!visited[j]) {
                    const matrixIndex = j + 1; // +1 because depot is at index 0
                    const distance = distanceMatrix[currentIndex][matrixIndex].distance;

                    // Consider priority (higher priority = lower effective distance)
                    const priority = deliveries[j].priority || 1;
                    const effectiveDistance = distance / priority;

                    if (effectiveDistance < nearestDistance) {
                        nearestDistance = distance;
                        nearestIndex = j;
                    }
                }
            }

            if (nearestIndex !== -1) {
                visited[nearestIndex] = true;
                route.push(deliveries[nearestIndex]);

                const matrixIndex = nearestIndex + 1;
                totalDistance += distanceMatrix[currentIndex][matrixIndex].distance;
                totalDuration += distanceMatrix[currentIndex][matrixIndex].duration;
                currentIndex = matrixIndex;
            }
        }

        // Add return to depot
        totalDistance += distanceMatrix[currentIndex][0].distance;
        totalDuration += distanceMatrix[currentIndex][0].duration;

        return {
            success: true,
            optimizedRoute: route,
            totalDistance: Math.round(totalDistance), // meters
            totalDuration: Math.round(totalDuration), // seconds
            totalDistanceKm: (totalDistance / 1000).toFixed(2),
            totalDurationMinutes: Math.round(totalDuration / 60),
            routeOrder: route.map((_, idx) => idx),
            estimatedCompletionTime: new Date(Date.now() + totalDuration * 1000)
        };
    }

    /**
     * Get turn-by-turn directions
     */
    async getDirections(origin, destination) {
        if (!this.googleMapsApiKey) {
            return {
                success: false,
                message: 'Google Maps API key not configured'
            };
        }

        try {
            const response = await axios.get(`${this.baseUrl}/directions/json`, {
                params: {
                    origin: `${origin.lat},${origin.lng}`,
                    destination: `${destination.lat},${destination.lng}`,
                    key: this.googleMapsApiKey,
                    mode: 'driving'
                }
            });

            if (response.data.status !== 'OK') {
                throw new Error(`Directions API error: ${response.data.status}`);
            }

            const route = response.data.routes[0];
            return {
                success: true,
                distance: route.legs[0].distance.value,
                duration: route.legs[0].duration.value,
                steps: route.legs[0].steps.map(step => ({
                    instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
                    distance: step.distance.text,
                    duration: step.duration.text
                })),
                polyline: route.overview_polyline.points
            };
        } catch (error) {
            console.error('Directions API error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Optimize multiple routes for multiple riders
     */
    async optimizeMultipleRoutes(depot, deliveries, numberOfRiders) {
        try {
            // Cluster deliveries by location
            const clusters = this.clusterDeliveries(deliveries, numberOfRiders);

            // Optimize each cluster
            const optimizedRoutes = await Promise.all(
                clusters.map(cluster => this.optimizeRoute(depot, cluster))
            );

            return {
                success: true,
                routes: optimizedRoutes,
                totalDeliveries: deliveries.length,
                numberOfRiders
            };
        } catch (error) {
            console.error('Multiple route optimization error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Simple k-means clustering for delivery grouping
     */
    clusterDeliveries(deliveries, k) {
        if (deliveries.length <= k) {
            return deliveries.map(d => [d]);
        }

        // Simple geographic clustering
        const clusters = Array(k).fill(null).map(() => []);

        // Sort by latitude and divide into k groups
        const sorted = [...deliveries].sort((a, b) => a.lat - b.lat);
        const chunkSize = Math.ceil(sorted.length / k);

        for (let i = 0; i < k; i++) {
            clusters[i] = sorted.slice(i * chunkSize, (i + 1) * chunkSize);
        }

        return clusters.filter(cluster => cluster.length > 0);
    }
}

// Singleton instance
const routeOptimizer = new RouteOptimizer();

module.exports = routeOptimizer;
