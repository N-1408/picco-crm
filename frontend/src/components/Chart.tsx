import { useEffect, useRef } from 'react';
import { Chart, type ChartConfiguration, type ChartType } from 'chart.js';

interface CustomChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  }>;
}

type ChartKind = 'line' | 'bar' | 'pie' | 'doughnut';

type ChartProps = {
  type: ChartKind;
  data: CustomChartData;
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

    const config = {
      type: type as ChartType,
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
            display: true,
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
            display: true,
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                size: 12
              },
              callback: (value: number | string): string | number => {
                if (typeof value === 'number') {
                  return value >= 1000 ? `${value / 1000}k` : value;
                }
                return value;
              }
            }
          }
        }
      }
    } as ChartConfiguration;

    chartInstance.current = new Chart(ctx, config as ChartConfiguration);

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


