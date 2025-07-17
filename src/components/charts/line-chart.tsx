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

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    boxWidth: isMobile ? 12 : 40,
                    padding: isMobile ? 10 : 20,
                    font: {
                        size: isMobile ? 10 : 12
                    }
                },
                onClick: isMobile ? function (e: any, legendItem: any, legend: any) {
                    // Toggle only one dataset at a time on mobile
                    const index = legendItem.datasetIndex;
                    const ci = legend.chart;

                    // If all datasets are hidden, show only the clicked one
                    const allHidden = ci.data.datasets.every((dataset: any, i: number) =>
                        ci.getDatasetMeta(i).hidden === true
                    );

                    if (allHidden) {
                        ci.data.datasets.forEach((dataset: any, i: number) => {
                            ci.getDatasetMeta(i).hidden = i !== index;
                        });
                    } else {
                        // Toggle the clicked dataset
                        ci.getDatasetMeta(index).hidden = !ci.getDatasetMeta(index).hidden;
                    }

                    ci.update();
                } : undefined
            },
            title: {
                display: !!title,
                text: title,
                font: {
                    size: isMobile ? 14 : 16
                }
            },
            tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD'
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
                            return '$' + (value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value);
                        }
                        return '$' + value;
                    },
                    font: {
                        size: isMobile ? 10 : 12
                    }
                }
            },
            x: {
                ticks: {
                    maxRotation: isMobile ? 45 : 0,
                    minRotation: isMobile ? 45 : 0,
                    font: {
                        size: isMobile ? 10 : 12
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
        elements: {
            point: {
                radius: isMobile ? 2 : 3,
                hoverRadius: isMobile ? 4 : 6
            },
            line: {
                borderWidth: isMobile ? 2 : 3
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
        labels,
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
        <div className={className} style={{ height: isMobile ? '250px' : '300px' }}>
            <Line options={options} data={data} />
        </div>
    );
}