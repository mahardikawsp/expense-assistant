import { z } from 'zod';
import { sanitizeObject } from './error-utils';
import { sanitizeInput } from './security-utils';
import { logger } from './logging';

/**
 * Utility functions for input validation and sanitization
 */

/**
 * Common validation schemas for reuse across the application
 */
export const ValidationSchemas = {
    /**
     * Email validation schema
     */
    email: z.string().email('Please enter a valid email address'),

    /**
     * Password validation schema with strength requirements
     */
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

    /**
     * Username validation schema
     */
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username cannot exceed 30 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),

    /**
     * Money amount validation schema
     */
    moneyAmount: z.number()
        .positive('Amount must be greater than zero')
        .or(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format').transform(val => parseFloat(val))),

    /**
     * Date validation schema
     */
    date: z.date()
        .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').transform(val => new Date(val)))
        .refine(date => !isNaN(date.getTime()), 'Invalid date'),

    /**
     * Category validation schema
     */
    category: z.string().min(1, 'Category is required'),

    /**
     * Description validation schema
     */
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),

    /**
     * ID validation schema
     */
    id: z.string().uuid('Invalid ID format'),

    /**
     * Period validation schema
     */
    period: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
        errorMap: () => ({ message: 'Period must be daily, weekly, monthly, or yearly' }),
    }),
};

/**
 * Validate and sanitize form input
 * @param input Input data to validate and sanitize
 * @param schema Zod schema for validation
 * @param options Options for validation and sanitization
 * @returns Validated and sanitized data or validation errors
 */
export function validateAndSanitize<T>(
    input: unknown,
    schema: z.ZodSchema<T>,
    options: {
        sanitize?: boolean;
        stripUnknown?: boolean;
        context?: string;
    } = {}
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
    try {
        // Default options
        const { sanitize = true, stripUnknown = true, context = 'form' } = options;

        // Sanitize input if requested
        const sanitizedInput = sanitize && typeof input === 'object'
            ? sanitizeObject(input as Record<string, any>)
            : input;

        // Parse with Zod schema
        const result = schema.safeParse(sanitizedInput);

        if (!result.success) {
            // Format validation errors
            const errors: Record<string, string> = {};

            result.error.errors.forEach(err => {
                const path = err.path.join('.');
                errors[path] = err.message;
            });

            // Log validation errors
            logger.warn('Validation failed', {
                validationContext: context,
                errors,
                input: sanitizedInput
            });

            return { success: false, errors };
        }

        return { success: true, data: result.data };
    } catch (error) {
        // Log unexpected validation errors
        logger.error('Unexpected validation error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            validationContext: options.context || 'form',
            input
        });

        return {
            success: false,
            errors: { _form: 'An unexpected error occurred during validation' }
        };
    }
}

/**
 * Create a validation schema for an expense
 * @param options Options for customizing the schema
 * @returns Zod schema for expense validation
 */
export function createExpenseSchema(options: {
    requireCategory?: boolean;
    requireDescription?: boolean;
    maxAmount?: number;
} = {}) {
    const { requireCategory = true, requireDescription = false, maxAmount } = options;

    return z.object({
        amount: ValidationSchemas.moneyAmount
            .refine(
                val => maxAmount ? val <= maxAmount : true,
                maxAmount ? `Amount cannot exceed ${maxAmount}` : ''
            ),
        date: ValidationSchemas.date,
        category: requireCategory
            ? ValidationSchemas.category
            : ValidationSchemas.category.optional(),
        description: requireDescription
            ? z.string().min(1, 'Description is required').max(500, 'Description cannot exceed 500 characters')
            : ValidationSchemas.description,
    });
}

/**
 * Create a validation schema for a budget
 * @returns Zod schema for budget validation
 */
export function createBudgetSchema() {
    return z.object({
        category: ValidationSchemas.category,
        limit: ValidationSchemas.moneyAmount,
        period: ValidationSchemas.period,
        startDate: ValidationSchemas.date,
        endDate: ValidationSchemas.date.optional(),
    });
}

/**
 * Create a validation schema for user registration
 * @returns Zod schema for user registration validation
 */
export function createUserRegistrationSchema() {
    return z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: ValidationSchemas.email,
        password: ValidationSchemas.password,
        confirmPassword: z.string(),
    }).refine(data => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });
}

/**
 * Create a validation schema for user login
 * @returns Zod schema for user login validation
 */
export function createUserLoginSchema() {
    return z.object({
        email: ValidationSchemas.email,
        password: z.string().min(1, 'Password is required'),
    });
}

/**
 * Validate a single field with a specific schema
 * @param value Field value to validate
 * @param schema Zod schema for the field
 * @returns Validation result
 */
export function validateField<T>(
    value: unknown,
    schema: z.ZodSchema<T>
): { valid: true; value: T } | { valid: false; error: string } {
    const result = schema.safeParse(value);

    if (!result.success) {
        return {
            valid: false,
            error: result.error.errors[0]?.message || 'Invalid value'
        };
    }

    return {
        valid: true,
        value: result.data
    };
}

/**
 * Sanitize user input to prevent XSS and other injection attacks
 * @param input Input to sanitize
 * @returns Sanitized input
 */
export function sanitizeUserInput(input: string | Record<string, any> | null | undefined): any {
    if (input === null || input === undefined) {
        return input;
    }

    if (typeof input === 'string') {
        return sanitizeInput(input);
    }

    if (typeof input === 'object') {
        return sanitizeObject(input);
    }

    return input;
}