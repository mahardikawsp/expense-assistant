/**
 * Logging utility for production environment
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
    requestId?: string;
    userId?: string;
}

// Get the configured log level from environment variables
const getConfiguredLogLevel = (): LogLevel => {
    const configuredLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    return ['debug', 'info', 'warn', 'error'].includes(configuredLevel)
        ? configuredLevel
        : 'info';
};

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * Determine if a log entry should be processed based on configured log level
 */
const shouldLog = (level: LogLevel): boolean => {
    const configuredLevel = getConfiguredLogLevel();
    return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
};

/**
 * Format a log entry for output
 */
const formatLogEntry = (entry: LogEntry): string => {
    const { timestamp, level, message, context, requestId, userId } = entry;

    // Basic log format
    let logString = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // Add request ID if available
    if (requestId) {
        logString += ` [requestId=${requestId}]`;
    }

    // Add user ID if available
    if (userId) {
        logString += ` [userId=${userId}]`;
    }

    // Add context if available
    if (context && Object.keys(context).length > 0) {
        try {
            logString += ` ${JSON.stringify(context)}`;
        } catch (error) {
            logString += ` [context serialization failed]`;
        }
    }

    return logString;
};

/**
 * Create a log entry
 */
const createLogEntry = (
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
): LogEntry => ({
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    requestId,
    userId,
});

/**
 * Process a log entry based on environment
 */
const processLogEntry = (entry: LogEntry): void => {
    // Skip logging if level is below configured threshold
    if (!shouldLog(entry.level)) {
        return;
    }

    const formattedLog = formatLogEntry(entry);

    // In production, we might send logs to a service like Sentry or CloudWatch
    if (process.env.NODE_ENV === 'production') {
        // For critical errors, we might want to send to an error tracking service
        if (entry.level === 'error' && process.env.SENTRY_DSN) {
            // This would be replaced with actual Sentry integration
            console.error(formattedLog);

            // Example of how Sentry integration might look:
            // Sentry.captureMessage(entry.message, {
            //   level: entry.level,
            //   extra: {
            //     ...entry.context,
            //     requestId: entry.requestId,
            //     userId: entry.userId,
            //   },
            // });
        } else {
            // Use appropriate console method based on level
            switch (entry.level) {
                case 'debug':
                    console.debug(formattedLog);
                    break;
                case 'info':
                    console.info(formattedLog);
                    break;
                case 'warn':
                    console.warn(formattedLog);
                    break;
                case 'error':
                    console.error(formattedLog);
                    break;
            }
        }
    } else {
        // In development, just use console with colors
        switch (entry.level) {
            case 'debug':
                console.debug('\x1b[36m%s\x1b[0m', formattedLog); // Cyan
                break;
            case 'info':
                console.info('\x1b[32m%s\x1b[0m', formattedLog); // Green
                break;
            case 'warn':
                console.warn('\x1b[33m%s\x1b[0m', formattedLog); // Yellow
                break;
            case 'error':
                console.error('\x1b[31m%s\x1b[0m', formattedLog); // Red
                break;
        }
    }
};

/**
 * Logger interface
 */
export const logger = {
    debug: (message: string, context?: Record<string, any>, requestId?: string, userId?: string): void => {
        processLogEntry(createLogEntry('debug', message, context, requestId, userId));
    },

    info: (message: string, context?: Record<string, any>, requestId?: string, userId?: string): void => {
        processLogEntry(createLogEntry('info', message, context, requestId, userId));
    },

    warn: (message: string, context?: Record<string, any>, requestId?: string, userId?: string): void => {
        processLogEntry(createLogEntry('warn', message, context, requestId, userId));
    },

    error: (message: string, context?: Record<string, any>, requestId?: string, userId?: string): void => {
        processLogEntry(createLogEntry('error', message, context, requestId, userId));
    },
};

/**
 * Create a logger instance with pre-filled context
 */
export const createContextLogger = (
    baseContext: Record<string, any> = {},
    requestId?: string,
    userId?: string
) => ({
    debug: (message: string, context?: Record<string, any>): void => {
        logger.debug(message, { ...baseContext, ...context }, requestId, userId);
    },

    info: (message: string, context?: Record<string, any>): void => {
        logger.info(message, { ...baseContext, ...context }, requestId, userId);
    },

    warn: (message: string, context?: Record<string, any>): void => {
        logger.warn(message, { ...baseContext, ...context }, requestId, userId);
    },

    error: (message: string, context?: Record<string, any>): void => {
        logger.error(message, { ...baseContext, ...context }, requestId, userId);
    },
});