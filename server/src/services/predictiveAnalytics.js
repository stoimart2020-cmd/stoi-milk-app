/**
 * Predictive Analytics Service
 * Machine learning-based predictions for demand forecasting, churn prediction, etc.
 */

class PredictiveAnalytics {
    constructor() {
        this.models = {
            demandForecast: null,
            churnPrediction: null,
            inventoryOptimization: null
        };
    }

    /**
     * Demand Forecasting
     * Predicts future demand based on historical data
     */
    async forecastDemand(productId, days = 7) {
        try {
            const Order = require('../models/Order');
            const Product = require('../models/Product');

            // Get historical data (last 90 days)
            const historicalOrders = await Order.find({
                'products.product': productId,
                createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
            }).sort({ createdAt: 1 });

            if (historicalOrders.length < 7) {
                return {
                    success: false,
                    message: 'Insufficient historical data for forecasting'
                };
            }

            // Aggregate daily quantities
            const dailyDemand = this.aggregateDailyDemand(historicalOrders, productId);

            // Calculate trends
            const trend = this.calculateTrend(dailyDemand);
            const seasonality = this.detectSeasonality(dailyDemand);

            // Generate forecast
            const forecast = this.generateForecast(dailyDemand, trend, seasonality, days);

            return {
                success: true,
                productId,
                forecast,
                confidence: this.calculateConfidence(dailyDemand),
                trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
                averageDailyDemand: this.calculateAverage(dailyDemand)
            };
        } catch (error) {
            console.error('Demand forecasting error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Aggregate daily demand from orders
     */
    aggregateDailyDemand(orders, productId) {
        const dailyMap = new Map();

        orders.forEach(order => {
            const date = new Date(order.createdAt).toISOString().split('T')[0];
            const product = order.products.find(p => p.product.toString() === productId);

            if (product) {
                const current = dailyMap.get(date) || 0;
                dailyMap.set(date, current + product.quantity);
            }
        });

        return Array.from(dailyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, quantity]) => ({ date, quantity }));
    }

    /**
     * Calculate trend using linear regression
     */
    calculateTrend(data) {
        if (data.length < 2) return 0;

        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        data.forEach((point, index) => {
            sumX += index;
            sumY += point.quantity;
            sumXY += index * point.quantity;
            sumX2 += index * index;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    }

    /**
     * Detect weekly seasonality
     */
    detectSeasonality(data) {
        if (data.length < 14) return null;

        const weeklyPattern = new Array(7).fill(0);
        const weeklyCount = new Array(7).fill(0);

        data.forEach((point, index) => {
            const dayOfWeek = new Date(point.date).getDay();
            weeklyPattern[dayOfWeek] += point.quantity;
            weeklyCount[dayOfWeek]++;
        });

        return weeklyPattern.map((sum, index) =>
            weeklyCount[index] > 0 ? sum / weeklyCount[index] : 0
        );
    }

    /**
     * Generate forecast using trend and seasonality
     */
    generateForecast(historicalData, trend, seasonality, days) {
        const lastValue = historicalData[historicalData.length - 1].quantity;
        const lastDate = new Date(historicalData[historicalData.length - 1].date);
        const forecast = [];

        for (let i = 1; i <= days; i++) {
            const forecastDate = new Date(lastDate);
            forecastDate.setDate(forecastDate.getDate() + i);

            let predictedValue = lastValue + (trend * i);

            // Apply seasonality if detected
            if (seasonality) {
                const dayOfWeek = forecastDate.getDay();
                const avgDemand = this.calculateAverage(historicalData);
                const seasonalFactor = seasonality[dayOfWeek] / avgDemand;
                predictedValue *= seasonalFactor;
            }

            forecast.push({
                date: forecastDate.toISOString().split('T')[0],
                predictedQuantity: Math.max(0, Math.round(predictedValue)),
                confidence: this.calculateDayConfidence(i, days)
            });
        }

        return forecast;
    }

    /**
     * Calculate forecast confidence
     */
    calculateConfidence(data) {
        if (data.length < 7) return 'low';
        if (data.length < 30) return 'medium';
        return 'high';
    }

    /**
     * Calculate confidence for specific forecast day
     */
    calculateDayConfidence(day, totalDays) {
        const confidence = 100 - (day / totalDays) * 30; // Decreases over time
        return Math.round(confidence);
    }

    /**
     * Calculate average
     */
    calculateAverage(data) {
        if (data.length === 0) return 0;
        const sum = data.reduce((acc, point) => acc + point.quantity, 0);
        return sum / data.length;
    }

    /**
     * Churn Prediction
     * Predicts likelihood of customer churn
     */
    async predictChurn(userId) {
        try {
            const User = require('../models/User');
            const Order = require('../models/Order');
            const Subscription = require('../models/Subscription');

            const user = await User.findById(userId);
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            // Get user activity data
            const recentOrders = await Order.find({
                customer: userId,
                createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
            });

            const subscriptions = await Subscription.find({ user: userId });

            // Calculate churn indicators
            const indicators = {
                daysSinceLastOrder: this.getDaysSinceLastOrder(recentOrders),
                orderFrequency: recentOrders.length / 90,
                hasActiveSubscription: subscriptions.some(s => s.status === 'active'),
                walletBalance: user.walletBalance || 0,
                complaintCount: user.complaintCount || 0,
                orderCancellationRate: this.calculateCancellationRate(recentOrders)
            };

            // Simple rule-based churn prediction
            const churnScore = this.calculateChurnScore(indicators);
            const churnRisk = this.classifyChurnRisk(churnScore);

            return {
                success: true,
                userId,
                churnScore,
                churnRisk,
                indicators,
                recommendations: this.getRetentionRecommendations(churnRisk, indicators)
            };
        } catch (error) {
            console.error('Churn prediction error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get days since last order
     */
    getDaysSinceLastOrder(orders) {
        if (orders.length === 0) return 999;
        const lastOrder = orders.sort((a, b) => b.createdAt - a.createdAt)[0];
        const daysDiff = (Date.now() - lastOrder.createdAt) / (1000 * 60 * 60 * 24);
        return Math.floor(daysDiff);
    }

    /**
     * Calculate order cancellation rate
     */
    calculateCancellationRate(orders) {
        if (orders.length === 0) return 0;
        const cancelled = orders.filter(o => o.status === 'cancelled').length;
        return (cancelled / orders.length) * 100;
    }

    /**
     * Calculate churn score (0-100)
     */
    calculateChurnScore(indicators) {
        let score = 0;

        // Days since last order (0-30 points)
        if (indicators.daysSinceLastOrder > 30) score += 30;
        else if (indicators.daysSinceLastOrder > 14) score += 20;
        else if (indicators.daysSinceLastOrder > 7) score += 10;

        // Order frequency (0-20 points)
        if (indicators.orderFrequency < 0.1) score += 20; // Less than 9 orders in 90 days
        else if (indicators.orderFrequency < 0.3) score += 10;

        // No active subscription (0-15 points)
        if (!indicators.hasActiveSubscription) score += 15;

        // Low wallet balance (0-15 points)
        if (indicators.walletBalance < 100) score += 15;
        else if (indicators.walletBalance < 500) score += 7;

        // High complaint count (0-10 points)
        if (indicators.complaintCount > 3) score += 10;
        else if (indicators.complaintCount > 1) score += 5;

        // High cancellation rate (0-10 points)
        if (indicators.orderCancellationRate > 20) score += 10;
        else if (indicators.orderCancellationRate > 10) score += 5;

        return Math.min(100, score);
    }

    /**
     * Classify churn risk
     */
    classifyChurnRisk(score) {
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }

    /**
     * Get retention recommendations
     */
    getRetentionRecommendations(risk, indicators) {
        const recommendations = [];

        if (risk === 'high' || risk === 'medium') {
            if (indicators.daysSinceLastOrder > 14) {
                recommendations.push('Send re-engagement offer');
            }
            if (!indicators.hasActiveSubscription) {
                recommendations.push('Offer subscription trial');
            }
            if (indicators.walletBalance < 100) {
                recommendations.push('Provide wallet recharge bonus');
            }
            if (indicators.complaintCount > 1) {
                recommendations.push('Proactive customer support outreach');
            }
        }

        return recommendations;
    }

    /**
     * Inventory Optimization
     * Suggests optimal stock levels
     */
    async optimizeInventory(productId) {
        try {
            const forecast = await this.forecastDemand(productId, 7);
            if (!forecast.success) {
                return forecast;
            }

            const Product = require('../models/Product');
            const product = await Product.findById(productId);

            if (!product) {
                return { success: false, message: 'Product not found' };
            }

            // Calculate recommended stock levels
            const avgDailyDemand = forecast.averageDailyDemand;
            const maxDailyDemand = Math.max(...forecast.forecast.map(f => f.predictedQuantity));

            const recommendations = {
                currentStock: product.stock,
                averageDailyDemand: Math.round(avgDailyDemand),
                maxDailyDemand: Math.round(maxDailyDemand),
                recommendedMinStock: Math.round(avgDailyDemand * 3), // 3 days buffer
                recommendedMaxStock: Math.round(maxDailyDemand * 7), // 7 days max demand
                reorderPoint: Math.round(avgDailyDemand * 2), // Reorder at 2 days supply
                reorderQuantity: Math.round(avgDailyDemand * 5), // Order 5 days supply
                stockStatus: this.getStockStatus(product.stock, avgDailyDemand)
            };

            return {
                success: true,
                productId,
                recommendations,
                forecast: forecast.forecast
            };
        } catch (error) {
            console.error('Inventory optimization error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get stock status
     */
    getStockStatus(currentStock, avgDailyDemand) {
        const daysOfStock = currentStock / avgDailyDemand;

        if (daysOfStock < 2) return 'critical';
        if (daysOfStock < 3) return 'low';
        if (daysOfStock > 10) return 'overstocked';
        return 'optimal';
    }

    /**
     * Customer Lifetime Value Prediction
     */
    async predictLTV(userId) {
        try {
            const Order = require('../models/Order');
            const User = require('../models/User');

            const user = await User.findById(userId);
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            const orders = await Order.find({ customer: userId });

            if (orders.length === 0) {
                return {
                    success: true,
                    predictedLTV: 0,
                    confidence: 'low'
                };
            }

            // Calculate metrics
            const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
            const avgOrderValue = totalSpent / orders.length;
            const daysSinceFirstOrder = (Date.now() - user.createdAt) / (1000 * 60 * 60 * 24);
            const orderFrequency = orders.length / (daysSinceFirstOrder / 30); // Orders per month

            // Simple LTV calculation: AOV * Orders/Month * Expected Lifetime (months)
            const expectedLifetimeMonths = 24; // Assume 2 years
            const predictedLTV = avgOrderValue * orderFrequency * expectedLifetimeMonths;

            return {
                success: true,
                userId,
                predictedLTV: Math.round(predictedLTV),
                metrics: {
                    totalSpent: Math.round(totalSpent),
                    avgOrderValue: Math.round(avgOrderValue),
                    orderFrequency: orderFrequency.toFixed(2),
                    totalOrders: orders.length
                },
                confidence: orders.length > 10 ? 'high' : orders.length > 5 ? 'medium' : 'low'
            };
        } catch (error) {
            console.error('LTV prediction error:', error);
            return { success: false, message: error.message };
        }
    }
}

// Singleton instance
const predictiveAnalytics = new PredictiveAnalytics();

module.exports = predictiveAnalytics;
