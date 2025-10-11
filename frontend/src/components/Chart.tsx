import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { format } from 'date-fns';
import type { ChartConfiguration } from 'chart.js';

type ChartData = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  }[];
};

type ChartProps = {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: ChartData;
  height?: number;
  className?: string;
};

const defaultColors = {
  primary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  purple: '#AF52DE',
  orange: '#FF9500'
};

export default function ChartComponent({
  type,
  data,
  height = 300,
  className
}: ChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const config: ChartConfiguration = {
      type,
      data: {
        labels: data.labels,
        datasets: data.datasets.map((dataset, index) => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor || Object.values(defaultColors)[index % 6],
          borderColor: dataset.borderColor || Object.values(defaultColors)[index % 6],
          borderWidth: dataset.borderWidth || 2,
          tension: type === 'line' ? 0.4 : undefined,
          fill: type === 'line' ? 'origin' : undefined,
          borderRadius: type === 'bar' ? 4 : undefined
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                family: '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
              size: 13
            },
            bodyFont: {
              size: 12
            },
            padding: 12,
            cornerRadius: 8,
            boxPadding: 6
          }
        },
        scales: type === 'pie' || type === 'doughnut' ? undefined : {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 12
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                size: 12
              },
              callback: (value) => {
                if (typeof value === 'number') {
                  return value >= 1000 ? `${value / 1000}k` : value;
                }
                return value;
              }
            }
          }
        }
      }
    };

    // Create new chart
    chartInstance.current = new Chart(ctx, config);

    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [type, data]);

  return (
    <div className={className} style={{ height }}>
      <canvas ref={chartRef} />
    </div>
  );
}