import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names and merges Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number with commas as thousands separators
 * @param value Number to format
 * @returns Formatted number string with commas
 */
export function formatNumber(value: number | string): string {
  // Convert to number if it's a string
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;

  // Return empty string if not a valid number
  if (isNaN(num)) return '';

  // Format with commas
  return num.toLocaleString('en-US');
}

/**
 * Formats a number as currency
 */
export function formatCurrency(amount: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formats a date in a user-friendly format
 */
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}