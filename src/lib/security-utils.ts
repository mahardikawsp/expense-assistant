import DOMPurify from 'dompurify';

/**
 * Utility functions for security enhancements
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param content HTML content to sanitize
 * @returns Sanitized HTML content
 */
export function sanitizeHtml(content: string): string {
    if (!content) return '';
    return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
        ALLOW_DATA_ATTR: false
    });
}

/**
 * Sanitize user input to prevent injection attacks
 * @param input User input to sanitize
 * @returns Sanitized user input
 */
export function sanitizeInput(input: string): string {
    if (!input) return '';

    // Remove potentially dangerous characters and HTML tags
    return input
        .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags
        .replace(/[<>'"`;()]/g, '') // Remove dangerous characters
        .trim();
}

/**
 * Validate and sanitize email address
 * @param email Email address to validate and sanitize
 * @returns Sanitized email address or null if invalid
 */
export function validateEmail(email: string): string | null {
    if (!email) return null;

    // More comprehensive email validation regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
        return null;
    }

    return email.toLowerCase().trim();
}

/**
 * Generate a CSRF token with improved security using Web Crypto API
 * @returns CSRF token
 */
export function generateCsrfToken(): string {
    // Generate a random array of 32 bytes
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    // Convert to a hex string
    return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Verify a CSRF token against a stored token using constant-time comparison
 * @param token The token to verify
 * @param storedToken The stored token to compare against
 * @returns Whether the token is valid
 */
export function verifyCsrfToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken || token.length !== storedToken.length) {
        return false;
    }

    // Use a constant-time comparison to prevent timing attacks
    let result = 0;
    for (let i = 0; i < token.length; i++) {
        result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
    }

    return result === 0;
}

/**
 * Validate a number input and ensure it's within range
 * @param value Number to validate
 * @param min Minimum allowed value
 * @param max Maximum allowed value
 * @returns Validated number or default value
 */
export function validateNumber(
    value: number | string,
    min: number = 0,
    max: number = Number.MAX_SAFE_INTEGER,
    defaultValue: number = 0
): number {
    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) {
        return defaultValue;
    }

    return Math.min(Math.max(num, min), max);
}

/**
 * Escape SQL wildcards to prevent SQL injection in LIKE queries
 * @param value String to escape
 * @returns Escaped string
 */
export function escapeSqlWildcards(value: string): string {
    if (!value) return '';

    // Escape SQL LIKE special characters
    return value
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
        .replace(/\\/g, '\\\\');
}

/**
 * Validate and sanitize a URL
 * @param url URL to validate and sanitize
 * @param allowedDomains Optional array of allowed domains
 * @returns Sanitized URL or null if invalid
 */
export function validateUrl(url: string, allowedDomains?: string[]): string | null {
    if (!url) return null;

    try {
        const parsedUrl = new URL(url);

        // Check protocol (only allow http and https)
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return null;
        }

        // Check for javascript: protocol disguised as a parameter
        if (url.toLowerCase().includes('javascript:')) {
            return null;
        }

        // Check domain if allowedDomains is provided
        if (allowedDomains && allowedDomains.length > 0) {
            const hostname = parsedUrl.hostname;
            if (!allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
                return null;
            }
        }

        return url;
    } catch (error) {
        return null;
    }
}

/**
 * Create a nonce for CSP using Web Crypto API
 * @returns CSP nonce
 */
export function generateCspNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, [...array]));
}

/**
 * Hash a string using SHA-256 with Web Crypto API
 * @param input String to hash
 * @returns Promise resolving to hashed string
 */
export async function hashString(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous hash function for non-critical applications
 * @param input String to hash
 * @returns Hashed string
 */
export function hashStringSyncFallback(input: string): string {
    // Simple hash function for when async isn't possible
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

/**
 * Sanitize and validate JSON input
 * @param jsonString JSON string to sanitize
 * @returns Parsed and sanitized JSON object or null if invalid
 */
export function sanitizeJson<T>(jsonString: string): T | null {
    if (!jsonString) return null;

    try {
        // First try to parse the JSON
        const parsed = JSON.parse(jsonString);

        // Recursively sanitize string values in the object
        const sanitizeObject = (obj: any): any => {
            if (typeof obj !== 'object' || obj === null) {
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map(item => sanitizeObject(item));
            }

            const result: Record<string, any> = {};
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string') {
                    result[key] = sanitizeInput(value);
                } else if (typeof value === 'object' && value !== null) {
                    result[key] = sanitizeObject(value);
                } else {
                    result[key] = value;
                }
            }

            return result;
        };

        return sanitizeObject(parsed) as T;
    } catch (error) {
        return null;
    }
}

/**
 * Generate a secure random password using Web Crypto API
 * @param length Length of the password
 * @returns Secure random password
 */
export function generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    let password = '';
    for (let i = 0; i < length; i++) {
        const index = array[i] % charset.length;
        password += charset[index];
    }

    return password;
}

/**
 * Validate a password strength
 * @param password Password to validate
 * @returns Object containing validation result and strength score
 */
export function validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[]
} {
    if (!password) {
        return { isValid: false, score: 0, feedback: ['Password is required'] };
    }

    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
        feedback.push('Password should be at least 8 characters long');
    } else {
        score += 1;
    }

    // Contains uppercase
    if (!/[A-Z]/.test(password)) {
        feedback.push('Password should contain at least one uppercase letter');
    } else {
        score += 1;
    }

    // Contains lowercase
    if (!/[a-z]/.test(password)) {
        feedback.push('Password should contain at least one lowercase letter');
    } else {
        score += 1;
    }

    // Contains number
    if (!/[0-9]/.test(password)) {
        feedback.push('Password should contain at least one number');
    } else {
        score += 1;
    }

    // Contains special character
    if (!/[^A-Za-z0-9]/.test(password)) {
        feedback.push('Password should contain at least one special character');
    } else {
        score += 1;
    }

    return {
        isValid: score >= 3 && password.length >= 8,
        score,
        feedback
    };
}