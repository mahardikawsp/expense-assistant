'use client';

import React, { useState, useRef, useEffect } from 'react';

import { cn } from '@/lib/utils';

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    options: SelectOption[];
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, options, value, onChange, placeholder, error, disabled, ...props }, ref) => {
        const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
            onChange?.(event.target.value);
        };

        return (
            <div className="relative">
                <select
                    ref={ref}
                    className={cn(
                        'flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        error && 'border-destructive',
                        className
                    )}
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-muted-foreground"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>
            </div>
        );
    }
);

Select.displayName = 'Select';

// Custom select with dropdown
interface CustomSelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    options: SelectOption[];
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    error?: boolean;
    disabled?: boolean;
}

export function CustomSelect({
    className,
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    error,
    disabled,
    ...props
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value || '');
    const selectRef = useRef<HTMLDivElement>(null);

    // Update internal state when value prop changes
    useEffect(() => {
        if (value !== undefined) {
            setSelectedValue(value);
        }
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (optionValue: string) => {
        setSelectedValue(optionValue);
        onChange?.(optionValue);
        setIsOpen(false);
    };

    const selectedOption = options.find((option) => option.value === selectedValue);

    return (
        <div
            ref={selectRef}
            className={cn('relative', className)}
            {...props}
        >
            <button
                type="button"
                className={cn(
                    'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    error && 'border-destructive'
                )}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
            >
                <span className={!selectedValue ? 'text-muted-foreground' : ''}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn('text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-background shadow-lg">
                    <div className="py-1">
                        {options.map((option) => (
                            <div
                                key={option.value}
                                className={cn(
                                    'cursor-pointer px-3 py-2 text-sm hover:bg-accent',
                                    option.value === selectedValue && 'bg-accent/50'
                                )}
                                onClick={() => handleSelect(option.value)}
                            >
                                {option.label}
                            </div>
                        ))}
                        {options.length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No options available</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}