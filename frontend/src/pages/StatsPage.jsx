import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import PageContainer from '../components/layout/PageContainer';
import SectionHeader from '../components/layout/SectionHeader';
import { useAppContext } from '../context/AppContext';
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
    const chartsRef = chartRefs.current;

    const setupCharts = async () => {
      const Chart = (await import('chart.js/auto')).default;

      if (!isMounted) return;
      if (chartsRef.line) chartsRef.line.destroy();
      if (chartsRef.doughnut) chartsRef.doughnut.destroy();

      chartsRef.line = new Chart(lineCanvasRef.current, {
        type: 'line',
        data: {
          labels: monthlyData.labels.map((label) => format(new Date(label), 'MMM yyyy')),
          datasets: [
            {
              label: 'Buyurtmalar summasi',
              data: monthlyData.values,
              fill: true,
              tension: 0.32,
              borderColor: '#5c7cfa',
              backgroundColor: 'rgba(92, 124, 250, 0.14)',
              pointBackgroundColor: '#5c7cfa',
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
              grid: { drawBorder: false, color: 'rgba(15, 23, 42, 0.08)' }
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

      chartsRef.doughnut = new Chart(doughnutCanvasRef.current, {
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
              backgroundColor: ['#4ad991', '#5c7cfa', '#ffb648'],
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
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
      const { line, doughnut } = chartsRef;
      line?.destroy();
      doughnut?.destroy();
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
      addToast({
        variant: 'success',
        title: 'Hisobot tayyor',
        description: 'PDF hisoboti yuklab olindi.'
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Eksport xatosi',
        description: error instanceof Error ? error.message : 'Eksport jarayoni yakunlanmadi.'
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageContainer className="stats-page">
      <section className="dashboard-hero frosted-card stats-hero">
        <div className="dashboard-hero__header">
          <div>
            <span className="dashboard-hero__eyebrow">Natijalar</span>
            <h2>Statistika va tahlillar</h2>
            <p>Sotuvlar dinamikasi va jamoa natijalarini real vaqt rejimida kuzating.</p>
          </div>
        </div>
        <div className="dashboard-hero__actions">
          <button
            type="button"
            className="btn-primary"
            disabled={isExporting}
            onClick={handleExport}
          >
            <span className="material-symbols-rounded">download</span>
            PDF hisobot
          </button>
        </div>
      </section>

      <section className="stat-grid">
        <article className="surface-card stat-card accent">
          <div className="stat-card__icon">
            <span className="material-symbols-rounded">attach_money</span>
          </div>
          <div>
            <span className="stat-card__label">Umumiy tushum</span>
            <p className="stat-card__value">
              {totalRevenue.toLocaleString('uz-UZ')} <span>so&apos;m</span>
            </p>
            <span className="stat-card__meta">Barcha buyurtmalar kesimida</span>
          </div>
        </article>
        <article className="surface-card stat-card">
          <div className="stat-card__icon">
            <span className="material-symbols-rounded">badge</span>
          </div>
          <div>
            <span className="stat-card__label">Faol agentlar</span>
            <p className="stat-card__value">
              {agents.filter((agent) => agent.role === 'agent').length}
            </p>
            <span className="stat-card__meta">Tarmoq bo&apos;ylab</span>
          </div>
        </article>
        <article className="surface-card stat-card">
          <div className="stat-card__icon">
            <span className="material-symbols-rounded">store</span>
          </div>
          <div>
            <span className="stat-card__label">Faol do&apos;konlar</span>
            <p className="stat-card__value">
              {stores.filter((store) => store.status === 'active').length}
            </p>
            <span className="stat-card__meta">So&apos;nggi tashriflar asosida</span>
          </div>
        </article>
        <article className="surface-card stat-card">
          <div className="stat-card__icon success">
            <span className="material-symbols-rounded">verified</span>
          </div>
          <div>
            <span className="stat-card__label">Yakunlangan buyurtmalar</span>
            <p className="stat-card__value">{statusBreakdown.completed}</p>
            <span className="stat-card__meta">Sifat ko&apos;rsatkichlari</span>
          </div>
        </article>
      </section>

      <section className="stats-charts">
        <article className="surface-card chart-card">
          <SectionHeader
            title="Oylik sotuvlar dinamikasi"
            subtitle="Buyurtmalar summasi asosida avtomatik yangilanadi"
          />
          <div className="chart-wrapper">
            <canvas ref={lineCanvasRef} />
          </div>
        </article>
        <article className="surface-card chart-card">
          <SectionHeader
            title="Buyurtmalar holati"
            subtitle="Jarayon bosqichlari bo‘yicha real taqsimot"
          />
          <div className="chart-wrapper donut">
            <canvas ref={doughnutCanvasRef} />
          </div>
        </article>
      </section>
    </PageContainer>
  );
}
