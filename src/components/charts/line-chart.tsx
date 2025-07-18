'use client';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface LineChartProps {
    title?: string;
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        borderColor?: string;
        backgroundColor?: string;
        fill?: boolean;
        tension?: number;
    }[];
    className?: string;
}

export function LineChart({ title, labels, datasets, className }: LineChartProps) {
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

    // Simplify labels for mobile
    const mobileLabels = isMobile
        ? labels.map((label, index) => index % 2 === 0 ? label : '')
        : labels;

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                align: 'center' as const,
                labels: {
                    boxWidth: isMobile ? 8 : 12,
                    padding: isMobile ? 8 : 10,
                    font: {
                        size: isMobile ? 9 : 11
                    }
                },
                display: !isMobile || datasets.length <= 2
            },
            title: {
                display: !!title,
                text: title,
                font: {
                    size: isMobile ? 12 : 14
                }
            },
            tooltip: {
                enabled: true,
                mode: 'index' as const,
                intersect: false,
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR'
                            }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value: any) {
                        if (isMobile) {
                            // Shorter format for mobile
                            return value >= 1000000
                                ? (value / 1000000).toFixed(1) + 'M'
                                : value >= 1000
                                    ? (value / 1000).toFixed(0) + 'K'
                                    : value;
                        }
                        return value;
                    },
                    font: {
                        size: isMobile ? 8 : 10
                    },
                    maxTicksLimit: isMobile ? 5 : 8
                },
                grid: {
                    display: !isMobile
                }
            },
            x: {
                ticks: {
                    maxRotation: isMobile ? 0 : 0,
                    minRotation: 0,
                    font: {
                        size: isMobile ? 8 : 10
                    },
                    autoSkip: true,
                    maxTicksLimit: isMobile ? 5 : 10
                },
                grid: {
                    display: !isMobile
                }
            }
        },
        interaction: {
            mode: 'nearest' as const,
            axis: 'x' as const,
            intersect: false
        },
        elements: {
            point: {
                radius: isMobile ? 0 : 2,
                hoverRadius: isMobile ? 3 : 4
            },
            line: {
                borderWidth: isMobile ? 1.5 : 2
            }
        }
    };

    const colors = [
        'rgb(5, 150, 105)',
        'rgb(59, 130, 246)',
        'rgb(249, 115, 22)',
        'rgb(236, 72, 153)',
        'rgb(139, 92, 246)',
    ];

    const data = {
        labels: mobileLabels,
        datasets: datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.data,
            borderColor: dataset.borderColor || colors[index % colors.length],
            backgroundColor: dataset.backgroundColor || `${colors[index % colors.length]}33`,
            fill: dataset.fill !== undefined ? dataset.fill : false,
            tension: dataset.tension || 0.4,
        })),
    };

    return (
        <div className={className} style={{ height: isMobile ? '200px' : '250px' }}>
            <Line options={options} data={data} />
        </div>
    );
}