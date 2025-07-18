'use client';

import React, { useState, useEffect, forwardRef } from 'react';
import { Input } from './input';
import { formatNumber } from '@/lib/utils';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value?: number | string;
    onChange?: (value: number) => void;
    onValueChange?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    prefix?: string;
    suffix?: string;
    allowNegative?: boolean;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
    (
        {
            value,
            onChange,
            onValueChange,
            min,
            max,
            step,
            prefix = '',
            suffix = '',
            allowNegative = false,
            className,
            ...props
        },
        ref
    ) => {
        // Track both the numeric value and the display value
        const [numericValue, setNumericValue] = useState<number>(
            typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) || 0 : typeof value === 'number' ? value : 0
        );
        const [displayValue, setDisplayValue] = useState<string>(
            value !== undefined ? `${prefix}${formatNumber(value)}${suffix}` : ''
        );

        // Update the display value when the numeric value changes
        useEffect(() => {
            if (value !== undefined) {
                const newValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) || 0 : value;
                setNumericValue(newValue);
                setDisplayValue(`${prefix}${formatNumber(newValue)}${suffix}`);
            }
        }, [value, prefix, suffix]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            // Remove prefix, suffix, and non-numeric characters (except decimal point and minus sign)
            let inputValue = e.target.value
                .replace(prefix, '')
                .replace(suffix, '')
                .replace(/,/g, '');

            // Handle negative numbers if allowed
            if (!allowNegative) {
                inputValue = inputValue.replace(/-/g, '');
            }

            // Parse the numeric value
            const parsedValue = parseFloat(inputValue);

            // Check if it's a valid number
            if (!isNaN(parsedValue)) {
                // Apply min/max constraints
                let constrainedValue = parsedValue;
                if (min !== undefined && constrainedValue < min) constrainedValue = min;
                if (max !== undefined && constrainedValue > max) constrainedValue = max;

                setNumericValue(constrainedValue);
                setDisplayValue(`${prefix}${formatNumber(constrainedValue)}${suffix}`);

                // Call the onChange handlers
                if (onChange) onChange(constrainedValue);
                if (onValueChange) onValueChange(constrainedValue);
            } else if (inputValue === '' || inputValue === '-') {
                // Handle empty input or just a minus sign
                setDisplayValue(inputValue === '-' && allowNegative ? '-' : '');
                setNumericValue(0);

                if (onChange) onChange(0);
                if (onValueChange) onValueChange(0);
            }
        };

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            // When focused, show the raw value without formatting
            const rawValue = numericValue === 0 && displayValue === '' ? '' : numericValue.toString();
            e.target.value = rawValue;
            if (props.onFocus) props.onFocus(e);
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            // When blurred, format the value again
            setDisplayValue(`${prefix}${formatNumber(numericValue)}${suffix}`);
            if (props.onBlur) props.onBlur(e);
        };

        return (
            <Input
                {...props}
                ref={ref}
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className={className}
            />
        );
    }
);

NumberInput.displayName = 'NumberInput';

export { NumberInput };