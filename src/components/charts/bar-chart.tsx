'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  title?: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  }[];
  className?: string;
}

export function BarChart({ title, labels, datasets, className }: BarChartProps) {
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

  // Simplify labels for mobile if there are many
  const mobileLabels = isMobile && labels.length > 5
    ? labels.map((label, i) => {
      // For mobile, show abbreviated labels
      if (label.length > 8) {
        return label.substring(0, 6) + '...';
      }
      return label;
    })
    : labels;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !isMobile,
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
        }
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
        mode: 'index',
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
          },
          title: function (tooltipItems: any) {
            // Show full label in tooltip even if abbreviated on axis
            const index = tooltipItems[0].dataIndex;
            return labels[index];
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
          maxRotation: isMobile ? 45 : 0,
          minRotation: isMobile ? 45 : 0,
          font: {
            size: isMobile ? 8 : 10
          },
          autoSkip: true,
          maxTicksLimit: isMobile ? 6 : 10
        },
        grid: {
          display: !isMobile
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: isMobile ? 10 : 0
      }
    }
  };

  const data = {
    labels: mobileLabels,
    datasets: datasets.map(dataset => ({
      label: dataset.label,
      data: dataset.data,
      backgroundColor: dataset.backgroundColor || 'rgba(5, 150, 105, 0.7)',
      borderColor: dataset.borderColor || 'rgb(5, 150, 105)',
      borderWidth: dataset.borderWidth || 1,
      barThickness: isMobile ? 'flex' : undefined,
      maxBarThickness: isMobile ? 30 : 50
    })),
  };

  return (
    <div className={className} style={{ height: isMobile ? '200px' : '250px' }}>
      <Bar options={options} data={data} />
    </div>
  );
}