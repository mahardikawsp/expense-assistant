import { Budget, Expense, Notification } from '@/types';
import { calculateBudgetUsage, getCurrentBudgetPeriod, formatCurrency } from './budget-utils';
import { prisma } from './prisma';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { sanitizeHtml, sanitizeInput } from './security-utils';

/**
 * Utility functions for notification management
 */

export type NotificationType = 'budget_exceeded' | 'budget_warning';

// Email configuration
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@expense-assistant.com';

/**
 * Check if an expense exceeds any budget limits and create notifications if needed
 * @param expense The expense to check
 * @param userId The user ID
 * @returns Promise with created notifications (if any)
 */
/**
 * Check if an expense exceeds any budget limits and create notifications if needed
 * @param expense The expense to check
 * @param userId The user ID
 * @returns Promise with created notifications (if any) and budget status
 */
export async function checkBudgetLimitsAndNotify(
    expense: Expense | any,
    userId: string
): Promise<{ notifications: Notification[]; budgetStatus: any[] }> {
    // Get all active budgets for the user and this expense category
    const budgets = await prisma.budget.findMany({
        where: {
            userId,
            category: expense.category,
        },
    });

    if (!budgets.length) {
        return { notifications: [], budgetStatus: [] };
    }

    const createdNotifications: Notification[] = [];
    const budgetStatus = [];

    // Get user for email notifications
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
    });

    // For each budget, check if this expense causes an overrun
    for (const budget of budgets) {
        // Convert Prisma budget to our Budget type
        const typedBudget: Budget = {
            id: budget.id,
            userId: budget.userId,
            category: budget.category,
            limit: parseFloat(budget.limit.toString()),
            period: budget.period.toLowerCase() as 'monthly' | 'weekly' | 'daily',
            startDate: budget.startDate,
            endDate: budget.endDate || undefined,
            createdAt: budget.createdAt,
            updatedAt: budget.updatedAt
        };

        // Get current period for this budget
        const { startDate, endDate } = getCurrentBudgetPeriod(typedBudget);

        // Get all expenses in this category and period
        const periodExpenses = await prisma.expense.findMany({
            where: {
                userId,
                category: budget.category,
                date: {
                    gte: startDate,
                    lt: endDate,
                },
            },
        });

        // Convert Prisma expenses to our Expense type
        const typedExpenses: Expense[] = periodExpenses.map(exp => ({
            id: exp.id,
            userId: exp.userId,
            amount: parseFloat(exp.amount.toString()),
            description: exp.description,
            date: exp.date,
            category: exp.category,
            createdAt: exp.createdAt,
            updatedAt: exp.updatedAt
        }));

        // Add the current expense to the list if it's not already included
        // (it might be if we're checking an existing expense that was just updated)
        const currentExpenseId = expense.id;
        const isExpenseInPeriod = typedExpenses.some(e => e.id === currentExpenseId);

        // Create a properly typed expense object
        const typedCurrentExpense: Expense = {
            id: expense.id,
            userId: expense.userId,
            amount: parseFloat(expense.amount.toString()),
            description: expense.description,
            date: expense.date,
            category: expense.category,
            createdAt: expense.createdAt,
            updatedAt: expense.updatedAt
        };

        // Only add the current expense if it's not already in the list
        const expensesToCheck = isExpenseInPeriod
            ? typedExpenses
            : [...typedExpenses, typedCurrentExpense];

        // Calculate budget usage including the new expense
        const usage = calculateBudgetUsage(typedBudget, expensesToCheck);
        budgetStatus.push(usage);

        // Check if budget is exceeded
        if (usage.isOverBudget) {
            const message = `Your ${budget.category} budget has been exceeded by ${formatCurrency(
                usage.spent - usage.limit
            )}. You've spent ${formatCurrency(usage.spent)} of your ${formatCurrency(
                usage.limit
            )} ${budget.period.toLowerCase()} budget.`;

            // Create budget exceeded notification
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type: 'budget_exceeded',
                    message,
                    isRead: false,
                },
            });

            // Convert Prisma notification to our Notification type
            createdNotifications.push({
                id: notification.id,
                userId: notification.userId,
                type: notification.type as 'budget_exceeded' | 'budget_warning',
                message: notification.message,
                isRead: notification.isRead,
                createdAt: notification.createdAt
            });

            // Send email notification if enabled
            if (EMAIL_ENABLED && user?.email) {
                await sendEmailNotification(
                    user.email,
                    'Budget Alert: Limit Exceeded',
                    createEmailTemplate({
                        title: 'Budget Exceeded',
                        message,
                        userName: user.name || 'User',
                        type: 'error'
                    })
                );
            }
        }
        // Check if budget is approaching limit (80% or more)
        else if (usage.percentage >= 80 && usage.percentage < 100) {
            const message = `You've used ${usage.percentage.toFixed(
                0
            )}% of your ${budget.category} budget. You have ${formatCurrency(
                usage.remaining
            )} remaining for this ${budget.period.toLowerCase()} period.`;

            // Create budget warning notification
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type: 'budget_warning',
                    message,
                    isRead: false,
                },
            });

            // Convert Prisma notification to our Notification type
            createdNotifications.push({
                id: notification.id,
                userId: notification.userId,
                type: notification.type as 'budget_exceeded' | 'budget_warning',
                message: notification.message,
                isRead: notification.isRead,
                createdAt: notification.createdAt
            });

            // Send email notification if enabled
            if (EMAIL_ENABLED && user?.email) {
                await sendEmailNotification(
                    user.email,
                    'Budget Alert: Approaching Limit',
                    createEmailTemplate({
                        title: 'Budget Warning',
                        message,
                        userName: user.name || 'User',
                        type: 'warning'
                    })
                );
            }
        }
    }

    return { notifications: createdNotifications, budgetStatus };
}

/**
 * Send email notification using Mailgun
 * @param to Recipient email address
 * @param subject Email subject
 * @param html Email HTML content
 */
export async function sendEmailNotification(to: string, subject: string, html: string): Promise<void> {
    try {
        // Mailgun configuration
        const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || 'your-mailgun-api-key';
        const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'your-domain.mailgun.org';

        // Initialize Mailgun client
        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({ username: 'api', key: MAILGUN_API_KEY });

        // Prepare email data
        const messageData = {
            from: `Expense Assistant <${EMAIL_FROM}>`,
            to: [to],
            subject: subject,
            html: html
        };

        // Send email
        const response = await mg.messages.create(MAILGUN_DOMAIN, messageData);

        console.log(`Email notification sent to ${to}`, response);
    } catch (error) {
        // Simple error logging without error-utils dependency
        console.error('Error sending email notification:', error);
    }
}

/**
 * Create email template for notifications
 */
function createEmailTemplate({ title, message, userName, type }: {
    title: string;
    message: string;
    userName: string;
    type: 'error' | 'warning' | 'info';
}): string {
    const colors = {
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background-color: ${colors[type]};
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
            }
            .content {
                background-color: #f9f9f9;
                padding: 20px;
                border-radius: 0 0 5px 5px;
                border: 1px solid #ddd;
                border-top: none;
            }
            .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
            }
            .button {
                display: inline-block;
                background-color: ${colors[type]};
                color: white;
                text-decoration: none;
                padding: 10px 20px;
                border-radius: 5px;
                margin-top: 15px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${title}</h1>
            </div>
            <div class="content">
                <p>Hello ${userName},</p>
                <p>${message}</p>
                <p>Log in to your Expense Assistant dashboard to review your budget and expenses.</p>
                <div style="text-align: center;">
                    <a href="#" class="button">View Budget Details</a>
                </div>
            </div>
            <div class="footer">
                <p>This is an automated message from Expense Assistant. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Mark a notification as read
 * @param notificationId The notification ID
 * @param userId The user ID
 * @returns Promise with updated notification
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
    return prisma.notification.update({
        where: {
            id: notificationId,
            userId,
        },
        data: {
            isRead: true,
        },
    });
}

/**
 * Get unread notification count for a user
 * @param userId The user ID
 * @returns Promise with unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
    return prisma.notification.count({
        where: {
            userId,
            isRead: false,
        },
    });
}

/**
 * Format notification for display
 * @param notification The notification to format
 * @returns Formatted notification with type-specific properties
 */
export function formatNotification(notification: any) {
    const baseNotification = {
        id: notification.id,
        message: notification.message,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        type: notification.type,
    };

    // Add type-specific properties
    switch (notification.type) {
        case 'budget_exceeded':
            return {
                ...baseNotification,
                severity: 'error',
                icon: 'alert-circle',
                title: 'Budget Exceeded',
            };
        case 'budget_warning':
            return {
                ...baseNotification,
                severity: 'warning',
                icon: 'alert-triangle',
                title: 'Budget Warning',
            };
        default:
            return {
                ...baseNotification,
                severity: 'info',
                icon: 'info',
                title: 'Notification',
            };
    }
}