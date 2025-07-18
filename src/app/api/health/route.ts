import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging';

/**
 * Health check endpoint for monitoring services
 * Returns system health status and basic metrics
 */
export async function GET() {
    const startTime = performance.now();

    try {
        // Check database connection
        const dbStatus = await checkDatabaseConnection();

        // Get system metrics
        const metrics = getSystemMetrics();

        // Calculate response time
        const responseTime = Math.round(performance.now() - startTime);

        // Log health check
        logger.info('Health check completed', {
            dbStatus: dbStatus.status,
            responseTime: `${responseTime}ms`,
        });

        // Return health status
        return NextResponse.json({
            status: dbStatus.status === 'healthy' ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '0.1.0',
            environment: process.env.NODE_ENV,
            uptime: process.uptime(),
            responseTime,
            services: {
                database: dbStatus,
            },
            metrics,
        }, {
            status: dbStatus.status === 'healthy' ? 200 : 503,
        });
    } catch (error) {
        // Log error
        logger.error('Health check failed', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });

        // Return error status
        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '0.1.0',
            environment: process.env.NODE_ENV,
            error: 'Health check failed',
        }, {
            status: 503,
        });
    }
}

/**
 * Check database connection status
 */
async function checkDatabaseConnection() {
    try {
        // Simple query to check database connection
        const startTime = performance.now();
        await prisma.$queryRaw`SELECT 1`;
        const responseTime = Math.round(performance.now() - startTime);

        return {
            status: 'healthy',
            responseTime: `${responseTime}ms`,
        };
    } catch (error) {
        logger.error('Database health check failed', {
            error: error instanceof Error ? error.message : String(error),
        });

        return {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown database error',
        };
    }
}

/**
 * Get basic system metrics
 */
function getSystemMetrics() {
    const memoryUsage = process.memoryUsage();

    return {
        memory: {
            rss: formatBytes(memoryUsage.rss),
            heapTotal: formatBytes(memoryUsage.heapTotal),
            heapUsed: formatBytes(memoryUsage.heapUsed),
            external: formatBytes(memoryUsage.external),
        },
        cpu: {
            user: process.cpuUsage().user,
            system: process.cpuUsage().system,
        },
    };
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}