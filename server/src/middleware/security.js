/**
 * Security Middleware
 * Implements various security best practices
 */

/**
 * Helmet-like security headers
 */
const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );

    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    next();
};

/**
 * Sanitize MongoDB queries to prevent NoSQL injection
 */
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;

        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            // Remove keys starting with $ or containing .
            if (key.startsWith('$') || key.includes('.')) {
                continue;
            }
            sanitized[key] = sanitize(value);
        }
        return sanitized;
    };

    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.query) {
        req.query = sanitize(req.query);
    }
    if (req.params) {
        req.params = sanitize(req.params);
    }

    next();
};

/**
 * CSRF Protection for state-changing operations
 */
const csrfProtection = (req, res, next) => {
    // Skip CSRF for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Check for CSRF token in header
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    // For now, we'll skip strict CSRF validation if no session
    // In production, you'd want to implement proper CSRF tokens
    if (!sessionToken) {
        return next();
    }

    if (token !== sessionToken) {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token'
        });
    }

    next();
};

/**
 * Request size limiter to prevent large payload attacks
 */
const requestSizeLimiter = (maxSize = '10mb') => {
    const maxBytes = parseSize(maxSize);

    return (req, res, next) => {
        let size = 0;

        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > maxBytes) {
                req.pause();
                res.status(413).json({
                    success: false,
                    message: 'Request entity too large'
                });
            }
        });

        next();
    };
};

/**
 * Parse size string to bytes
 */
function parseSize(size) {
    if (typeof size === 'number') return size;
    const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
    if (!match) return 10 * 1024 * 1024; // default 10MB
    return parseFloat(match[1]) * (units[match[2]] || 1);
}

/**
 * IP Whitelist/Blacklist
 */
const ipFilter = (options = {}) => {
    const { whitelist = [], blacklist = [], mode = 'blacklist' } = options;

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;

        if (mode === 'whitelist' && whitelist.length > 0) {
            if (!whitelist.includes(ip)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        if (mode === 'blacklist' && blacklist.includes(ip)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        next();
    };
};

/**
 * Prevent parameter pollution
 */
const preventParameterPollution = (req, res, next) => {
    // Convert array parameters to single values (take last)
    for (const key in req.query) {
        if (Array.isArray(req.query[key])) {
            req.query[key] = req.query[key][req.query[key].length - 1];
        }
    }
    next();
};

module.exports = {
    securityHeaders,
    sanitizeInput,
    csrfProtection,
    requestSizeLimiter,
    ipFilter,
    preventParameterPollution
};
