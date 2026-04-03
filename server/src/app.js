// Server Entry Point - Force Restart 1
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

// Security and Monitoring
const { securityHeaders, sanitizeInput, preventParameterPollution } = require("./middleware/security");
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");
const { errorMonitoringMiddleware, requestTimingMiddleware } = require("./utils/errorMonitor");

dotenv.config();

const app = express();

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security Headers - Apply first
app.use(securityHeaders);

// Request timing and monitoring
app.use(requestTimingMiddleware);

// CORS Configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost',
            'http://127.0.0.1',
            'http://172.232.115.60',
            'https://stoimilk.com',
            'http://stoimilk.com',
            'https://www.stoimilk.com',
            'http://www.stoimilk.com',
            'https://hub.stoimilk.com',
            'http://hub.stoimilk.com',
        ];
        
        const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
        if (isAllowed) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Input sanitization - Prevent NoSQL injection
app.use(sanitizeInput);

// Prevent parameter pollution
app.use(preventParameterPollution);

// Serve static files from uploads directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
console.log('📁 Static files served from /uploads');

// Database Connection
connectDB();

// API Documentation (Swagger)
if (process.env.NODE_ENV !== 'production') {
    try {
        const swaggerUi = require('swagger-ui-express');
        const swaggerSpec = require('./config/swagger');

        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
            explorer: true,
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'Milk Delivery API Docs'
        }));

        // Serve swagger spec as JSON
        app.get('/api-docs.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(swaggerSpec);
        });

        console.log('📚 API Documentation available at http://localhost:4000/api-docs');
    } catch (err) {
        console.warn('⚠️  Swagger documentation not available:', err.message);
    }
}

// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        status: 'running',
        message: 'Stoi Milk API is running...',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Health check with database status
app.get("/health", async (req, res) => {
    const mongoose = require('mongoose');
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Routes with rate limiting
const dashboardRoutes = require("./routes/dashboardRoutes");
const logisticsRoutes = require("./routes/logisticsRoutes");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const serviceAreaRoutes = require("./routes/serviceAreaRoutes");

// Auth routes (rate limiting disabled for development)
app.use("/api/auth", authRoutes);

// General API routes with standard rate limiting
app.use("/api/categories", apiLimiter, categoryRoutes);
app.use("/api/products", apiLimiter, productRoutes);
app.use("/api/customers", apiLimiter, customerRoutes);
app.use("/api/service-areas", apiLimiter, serviceAreaRoutes);
app.use("/api/dashboard", apiLimiter, dashboardRoutes);
app.use("/api/analytics", apiLimiter, require("./routes/analyticsRoutes"));
app.use("/api/logs", apiLimiter, require("./routes/activityLogRoutes"));
app.use("/api/logistics", apiLimiter, logisticsRoutes);
app.use("/api/upload", apiLimiter, require("./routes/uploadRoutes"));
app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));
app.use("/api/users", apiLimiter, require("./routes/userRoutes"));
app.use("/api/roles", apiLimiter, require("./routes/roleRoutes"));
app.use("/api/payments", apiLimiter, require("./routes/paymentRoutes"));
app.use("/api/wallet", apiLimiter, require("./routes/walletRoutes"));
app.use("/api/crm", apiLimiter, require("./routes/crmRoutes"));
app.use("/api/distributors", apiLimiter, require("./routes/distributorRoutes"));
app.use("/api/complaints", apiLimiter, require("./routes/complaintRoutes"));
app.use("/api/notifications", apiLimiter, require("./routes/notificationRoutes"));
app.use("/api/orders", apiLimiter, require("./routes/orderRoutes"));
app.use("/api/riders", apiLimiter, require("./routes/riderRoutes"));
app.use("/api/bottles", apiLimiter, require("./routes/bottleRoutes"));
app.use("/api/vacation", apiLimiter, require("./routes/vacationRoutes"));
app.use("/api/subscriptions", require("./routes/subscriptionRoutes")); // Rate limiter temporarily disabled for debugging
app.use("/api/referrals", apiLimiter, require("./routes/referralRoutes"));
app.use("/api/settings", apiLimiter, settingsRoutes);
app.use("/api/delivery/history", apiLimiter, require("./routes/deliveryHistory"));
app.use("/api/invoices", apiLimiter, require("./routes/invoiceRoutes"));
app.use("/api/delivery", apiLimiter, require("./routes/deliveryRoutes"));
app.use("/api/vendors", apiLimiter, require("./routes/vendorRoutes"));
app.use("/api/inventory", apiLimiter, require("./routes/inventoryRoutes"));
app.use("/api/backup", require("./routes/backupRoutes")); // No rate limiter - large file transfers

// Geolocation Hierarchy Routes (consolidated into /api/logistics)
// Districts, Cities, Areas, Delivery Routes are all under logisticsRoutes now

// New Advanced Feature Routes
app.use("/api/admin", require("./routes/adminUtilRoutes")); // Admin utilities (rate limit management)
app.use("/api/crm", apiLimiter, require("./routes/crmRoutes")); // CRM and lead management
app.use("/api/routes", apiLimiter, require("./routes/routeRoutes")); // Route optimization
app.use("/api/tracking", apiLimiter, require("./routes/trackingRoutes")); // GPS tracking
app.use("/api/ai", apiLimiter, require("./routes/aiRoutes")); // AI Assistant

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Global Error Handler - Must be last
app.use(errorMonitoringMiddleware);

module.exports = app;
