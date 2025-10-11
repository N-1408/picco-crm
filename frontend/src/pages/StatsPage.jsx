import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useAppContext } from '../context/AppContext.jsx';
import { exportOrdersToPDF } from '../utils/exporters.js';

export default function StatsPage() {
  const {
    state: { orders, stores, agents },
    addToast
  } = useAppContext();
  const lineCanvasRef = useRef(null);
  const doughnutCanvasRef = useRef(null);
  const [isExporting, setExporting] = useState(false);
  const chartRefs = useRef({ line: null, doughnut: null });

  const monthlyData = useMemo(() => {
    const buckets = {};
    orders.forEach((order) => {
      const key = format(new Date(order.createdAt), 'yyyy-MM');
      if (!buckets[key]) buckets[key] = 0;
      buckets[key] += order.amount;
    });
    const labels = Object.keys(buckets).sort();
    return {
      labels,
      values: labels.map((label) => buckets[label])
    };
  }, [orders]);

  const statusBreakdown = useMemo(() => {
    const grouped = orders.reduce(
      (acc, order) => {
        acc[order.status] += 1;
        return acc;
      },
      { completed: 0, processing: 0, pending: 0 }
    );
    return grouped;
  }, [orders]);

  useEffect(() => {
    let isMounted = true;

    const setupCharts = async () => {
      const Chart = (await import('chart.js/auto')).default;

      if (!isMounted) return;
      if (chartRefs.current.line) chartRefs.current.line.destroy();
      if (chartRefs.current.doughnut) chartRefs.current.doughnut.destroy();

      chartRefs.current.line = new Chart(lineCanvasRef.current, {
        type: 'line',
        data: {
          labels: monthlyData.labels.map((label) => format(new Date(label), 'MMM yyyy')),
          datasets: [
            {
              label: 'Buyurtmalar summasi',
              data: monthlyData.values,
              fill: true,
              tension: 0.32,
              borderColor: '#0A84FF',
              backgroundColor: 'rgba(10, 132, 255, 0.14)',
              pointBackgroundColor: '#0A84FF',
              pointBorderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animations: {
            tension: { duration: 800, easing: 'easeOutQuad' }
          },
          scales: {
            y: {
              ticks: {
                callback: (value) => `${(value / 1000000).toFixed(1)}M`
              },
              grid: { drawBorder: false, color: 'rgba(0,0,0,0.08)' }
            },
            x: {
              grid: { display: false }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });

      chartRefs.current.doughnut = new Chart(doughnutCanvasRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Yakunlangan', 'Jarayonda', 'Kutilmoqda'],
          datasets: [
            {
              data: [
                statusBreakdown.completed,
                statusBreakdown.processing,
                statusBreakdown.pending
              ],
              backgroundColor: ['#34C759', '#0A84FF', '#FFD60A'],
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { usePointStyle: true }
            }
          }
        }
      });
    };

    setupCharts();

    return () => {
      isMounted = false;
      if (chartRefs.current.line) chartRefs.current.line.destroy();
      if (chartRefs.current.doughnut) chartRefs.current.doughnut.destroy();
    };
  }, [monthlyData, statusBreakdown]);

  const totalRevenue = orders.reduce((acc, order) => acc + order.amount, 0);

  const handleExport = async () => {
    if (!chartRefs.current.line) return;
    setExporting(true);
    try {
      const chartImage = chartRefs.current.line.toBase64Image('image/png', 1);
      await exportOrdersToPDF({
        orders,
        stores,
        agents,
        chartImage
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Eksport xatosi',
        description: error.message
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="page stats-page">
      <div className="page-intro">
        <div>
          <h2>Statistika va tahlillar</h2>
          <p>Sotuvlar dinamikasi va jamoa natijalarini real vaqt rejimida kuzating.</p>
        </div>
        <button type="button" className="btn-primary subtle" disabled={isExporting} onClick={handleExport}>
          <span className="material-symbols-rounded">download</span>
          PDF hisobot
        </button>
      </div>
      <section className="grid-cards">
        <article className="metric-card">
          <h3>Umumiy tushum</h3>
          <p className="metric-value">{totalRevenue.toLocaleString('uz-UZ')} so&apos;m</p>
          <span className="metric-subtitle">Barcha buyurtmalar kesimida</span>
        </article>
        <article className="metric-card">
          <h3>Faol agentlar</h3>
          <p className="metric-value">{agents.filter((agent) => agent.role === 'agent').length}</p>
          <span className="metric-subtitle">Tarmoq bo&apos;ylab</span>
        </article>
        <article className="metric-card">
          <h3>Faol do&apos;konlar</h3>
          <p className="metric-value">{stores.filter((store) => store.status === 'active').length}</p>
          <span className="metric-subtitle">So&apos;nggi tashriflar asosida</span>
        </article>
        <article className="metric-card">
          <h3>Yakunlangan buyurtmalar</h3>
          <p className="metric-value text-success">{statusBreakdown.completed}</p>
          <span className="metric-subtitle text-success">Sifat ko&apos;rsatkichlari</span>
        </article>
      </section>

      <section className="panel glass-panel charts-panel">
        <div className="chart-line">
          <h3>Oylik sotuvlar dinamikasi</h3>
          <div className="chart-wrapper">
            <canvas ref={lineCanvasRef} />
          </div>
        </div>
        <div className="chart-donut">
          <h3>Buyurtmalar holati taqsimoti</h3>
          <div className="chart-wrapper donut">
            <canvas ref={doughnutCanvasRef} />
          </div>
        </div>
      </section>
    </main>
  );
}
