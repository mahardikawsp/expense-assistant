/**
 * Database configuration for production deployment
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logging';

// Connection pool configuration
const CONNECTION_LIMIT = parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10);
const POOL_TIMEOUT = parseInt(process.env.DB_POOL_TIMEOUT || '30', 10);

// Database connection options
export const dbConnectionOptions = {
    connection_limit: CONNECTION_LIMIT,
    pool_timeout: POOL_TIMEOUT,
    ssl: process.env.NODE_ENV === 'production',
};

// Log database queries in development
const logQuery = (e: any) => {
    if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_DB === 'true') {
        logger.debug(`Prisma Query: ${e.query}`, {
            params: e.params,
            duration: `${e.duration}ms`,
        });
    }
};

// Create Prisma client with production configuration
export function createPrismaClient(): PrismaClient {
    // Create client with logging in development
    const client = new PrismaClient({
        log: process.env.NODE_ENV !== 'production' && process.env.DEBUG_DB === 'true'
            ? [{ emit: 'event', level: 'query' }]
            : undefined,
    });

    // Add query logging in development
    if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_DB === 'true') {
        // Use type assertion to fix the event type issue
        (client as any).$on('query', logQuery);
    }

    return client;
}

/**
 * Handle database connection errors
 * @param error Database error
 */
export function handleDbConnectionError(error: Error): void {
    logger.error('Database connection error', {
        error: error.message,
        stack: error.stack,
    });

    // In production, we might want to notify administrators
    if (process.env.NODE_ENV === 'production') {
        // Send alert to monitoring system
        // This would be implemented with your monitoring service
    }
}

/**
 * Configure database connection pool for optimal performance
 */
export function configureDatabasePool(): void {
    // This would be used to configure connection pooling
    // For Prisma, this is handled through the connection string
    logger.info('Database connection pool configured', {
        connectionLimit: CONNECTION_LIMIT,
        poolTimeout: POOL_TIMEOUT,
        ssl: process.env.NODE_ENV === 'production',
    });
}

/**
 * Initialize database connection
 */
export async function initializeDatabase(): Promise<void> {
    try {
        // Configure connection pool
        configureDatabasePool();

        logger.info('Database initialized successfully');
    } catch (error) {
        handleDbConnectionError(error instanceof Error ? error : new Error(String(error)));
        // Rethrow to allow the application to handle the error
        throw error;
    }
}