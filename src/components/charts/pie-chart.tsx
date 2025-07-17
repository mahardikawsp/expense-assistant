'use client';

import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    ArcElement,
    Tooltip,
    Legend
);

interface PieChartProps {
    title?: string;
    labels: string[];
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    className?: string;
}

export function PieChart({
    title,
    labels,
    data,
    backgroundColor,
    borderColor,
    className
}: PieChartProps) {
    const [isMobile, setIsMobile] = useState(false);

    // Check if we're on a mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const defaultColors = [
        'rgba(5, 150, 105, 0.7)',
        'rgba(59, 130, 246, 0.7)',
        'rgba(249, 115, 22, 0.7)',
        'rgba(236, 72, 153, 0.7)',
        'rgba(139, 92, 246, 0.7)',
        'rgba(16, 185, 129, 0.7)',
        'rgba(14, 165, 233, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(217, 70, 239, 0.7)',
        'rgba(99, 102, 241, 0.7)',
    ];

    const defaultBorderColors = defaultColors.map(color => color.replace('0.7', '1'));

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: isMobile ? 'bottom' as const : 'right' as const,
                align: isMobile ? 'center' as const : 'center' as const,
                labels: {
                    boxWidth: isMobile ? 10 : 12,
                    padding: isMobile ? 10 : 15,
                    font: {
                        size: isMobile ? 10 : 12
                    }
                },
                maxWidth: isMobile ? 200 : undefined,
                maxHeight: isMobile ? 100 : undefined,
            },
            title: {
                display: !!title,
                text: title,
                font: {
                    size: isMobile ? 14 : 16
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

                        return `${label}: $${value.toLocaleString()} (${percentage}%)`;
                    }
                }
            }
        },
        layout: {
            padding: {
                top: 0,
                right: 0,
                bottom: isMobile ? 10 : 0,
                left: 0
            }
        },
        elements: {
            arc: {
                borderWidth: 1
            }
        }
    };

    const chartData = {
        labels,
        datasets: [
            {
                data,
                backgroundColor: backgroundColor || defaultColors,
                borderColor: borderColor || defaultBorderColors,
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className={className} style={{ height: isMobile ? '250px' : '300px' }}>
            <Pie options={options} data={chartData} />
        </div>
    );
}