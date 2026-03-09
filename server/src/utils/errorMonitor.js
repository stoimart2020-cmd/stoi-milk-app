/**
 * Error Monitoring and Logging Service
 * Centralized error handling and logging
 */

const fs = require('fs');
const path = require('path');

class ErrorMonitor {
    constructor() {
        this.logDir = path.join(__dirname, '../../logs');
        this.ensureLogDirectory();
        this.errorLog = path.join(this.logDir, 'error.log');
        this.accessLog = path.join(this.logDir, 'access.log');
        this.performanceLog = path.join(this.logDir, 'performance.log');
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Log error to file and console
     */
    logError(error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            context,
            level: 'ERROR'
        };

        // Console output
        console.error('❌ ERROR:', errorEntry);

        // File output
        this.writeToFile(this.errorLog, JSON.stringify(errorEntry) + '\n');

        // In production, you would send this to services like:
        // - Sentry
        // - LogRocket
        // - DataDog
        // - New Relic
        this.sendToExternalService(errorEntry);
    }

    /**
     * Log API access
     */
    logAccess(req, res, responseTime) {
        const accessEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            userId: req.user?._id
        };

        this.writeToFile(this.accessLog, JSON.stringify(accessEntry) + '\n');
    }

    /**
     * Log performance metrics
     */
    logPerformance(metric, value, context = {}) {
        const perfEntry = {
            timestamp: new Date().toISOString(),
            metric,
            value,
            context
        };

        this.writeToFile(this.performanceLog, JSON.stringify(perfEntry) + '\n');
    }

    /**
     * Write to log file
     */
    writeToFile(filePath, data) {
        try {
            fs.appendFileSync(filePath, data);
        } catch (err) {
            console.error('Failed to write to log file:', err);
        }
    }

    /**
     * Send error to external monitoring service
     * This is a placeholder - integrate with actual services
     */
    sendToExternalService(errorEntry) {
        // Example: Send to Sentry
        // if (process.env.SENTRY_DSN) {
        //     Sentry.captureException(new Error(errorEntry.message), {
        //         extra: errorEntry.context
        //     });
        // }

        // For now, just log that we would send it
        if (process.env.NODE_ENV === 'production') {
            console.log('📤 Would send to external monitoring service:', errorEntry.message);
        }
    }

    /**
     * Get error statistics
     */
    async getErrorStats(hours = 24) {
        try {
            const cutoff = Date.now() - (hours * 60 * 60 * 1000);
            const errors = this.readLogFile(this.errorLog);

            const recentErrors = errors
                .filter(e => new Date(e.timestamp).getTime() > cutoff)
                .reduce((acc, error) => {
                    const key = error.message || 'Unknown';
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {});

            return {
                totalErrors: Object.values(recentErrors).reduce((a, b) => a + b, 0),
                errorsByType: recentErrors,
                period: `${hours} hours`
            };
        } catch (err) {
            console.error('Failed to get error stats:', err);
            return { totalErrors: 0, errorsByType: {}, period: `${hours} hours` };
        }
    }

    /**
     * Read and parse log file
     */
    readLogFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) return [];

            const content = fs.readFileSync(filePath, 'utf-8');
            return content
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean);
        } catch (err) {
            console.error('Failed to read log file:', err);
            return [];
        }
    }

    /**
     * Clear old logs (keep last 30 days)
     */
    async cleanOldLogs(days = 30) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

        for (const logFile of [this.errorLog, this.accessLog, this.performanceLog]) {
            try {
                if (!fs.existsSync(logFile)) continue;

                const logs = this.readLogFile(logFile);
                const recentLogs = logs.filter(log =>
                    new Date(log.timestamp).getTime() > cutoff
                );

                const content = recentLogs.map(log => JSON.stringify(log)).join('\n') + '\n';
                fs.writeFileSync(logFile, content);

                console.log(`✅ Cleaned ${logFile}: Kept ${recentLogs.length}/${logs.length} entries`);
            } catch (err) {
                console.error(`Failed to clean ${logFile}:`, err);
            }
        }
    }
}

// Singleton instance
const errorMonitor = new ErrorMonitor();

/**
 * Express middleware for error monitoring
 */
const errorMonitoringMiddleware = (err, req, res, next) => {
    errorMonitor.logError(err, {
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        params: req.params,
        query: req.query,
        user: req.user?._id
    });

    // Don't expose internal errors in production
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(err.statusCode || 500).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

/**
 * Request timing middleware
 */
const requestTimingMiddleware = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        errorMonitor.logAccess(req, res, duration);

        // Log slow requests
        if (duration > 1000) {
            errorMonitor.logPerformance('slow_request', duration, {
                method: req.method,
                url: req.originalUrl
            });
        }
    });

    next();
};

module.exports = {
    errorMonitor,
    errorMonitoringMiddleware,
    requestTimingMiddleware
};
