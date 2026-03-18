/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting the number of requests from a single IP
 */

const rateLimitStore = new Map();

// Clean up old entries every hour
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        if (now - value.resetTime > 3600000) { // 1 hour
            rateLimitStore.delete(key);
        }
    }
}, 3600000);

/**
 * Create a rate limiter
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per window
 * @param {string} options.message - Error message when limit is exceeded
 */
const rateLimit = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        max = 100, // limit each IP to 100 requests per windowMs
        message = 'Too many requests, please try again later.',
        skipSuccessfulRequests = false,
        skipFailedRequests = false
    } = options;

    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress;

        // Skip rate limiting for localhost during development
        if (key === '::1' || key === '127.0.0.1' || key === '::ffff:127.0.0.1') {
            return next();
        }

        // Skip rate limiting for authenticated users (have a valid session)
        if (req.cookies && req.cookies.token) {
            return next();
        }

        const now = Date.now();

        if (!rateLimitStore.has(key)) {
            rateLimitStore.set(key, {
                count: 1,
                resetTime: now + windowMs
            });
            return next();
        }

        const record = rateLimitStore.get(key);

        // Reset if window has passed
        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + windowMs;
            return next();
        }

        // Increment count
        record.count++;

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
        res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

        // Check if limit exceeded
        if (record.count > max) {
            return res.status(429).json({
                success: false,
                message,
                retryAfter: Math.ceil((record.resetTime - now) / 1000)
            });
        }

        next();
    };
};

// Preset rate limiters for different endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 min window (admin panels need higher limits)
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many login attempts, please try again after 15 minutes',
    skipSuccessfulRequests: true
});

const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 accounts per hour
    message: 'Too many accounts created from this IP, please try again after an hour'
});

const paymentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 payment requests per minute
    message: 'Too many payment requests, please slow down'
});

/**
 * Clear rate limit for a specific IP or all IPs
 * @param {string} ip - IP address to clear (optional, clears all if not provided)
 */
const clearRateLimit = (ip = null) => {
    if (ip) {
        rateLimitStore.delete(ip);
        console.log(`✅ Rate limit cleared for IP: ${ip}`);
    } else {
        rateLimitStore.clear();
        console.log('✅ All rate limits cleared');
    }
};

module.exports = {
    rateLimit,
    apiLimiter,
    authLimiter,
    createAccountLimiter,
    paymentLimiter,
    clearRateLimit,
    rateLimitStore
};
