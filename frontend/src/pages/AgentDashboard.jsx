import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format, isWithinInterval, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { exportOrdersToExcel, exportOrdersToPDF } from '../utils/exporters.js';

const statusDict = {
  all: 'Barchasi',
  completed: 'Yakunlangan',
  processing: 'Jarayonda',
  pending: 'Kutilmoqda'
};

export default function AgentDashboard({ activeTab = 'overview' }) {
  const {
    state: { user, orders, stores, activeFilters, agents },
    setFilters,
    upsertOrder,
    updateStore,
    addToast
  } = useAppContext();
  const navigate = useNavigate();
  const [orderAmount, setOrderAmount] = useState('');
  const [selectedStore, setSelectedStore] = useState(stores[0]?.id ?? '');
  const [status, setStatus] = useState('pending');
  const [isExporting, setExporting] = useState(false);

  useEffect(() => {
    if (!stores.length) {
      setSelectedStore('');
      return;
    }
    setSelectedStore((previous) =>
      stores.some((store) => store.id === previous) ? previous : stores[0].id
    );
  }, [stores]);

  const filteredOrders = useMemo(() => {
    const [from, to] = activeFilters.dateRange;
    return orders.filter((order) => {
      const within =
        !from || !to
          ? true
          : isWithinInterval(parseISO(order.createdAt), {
              start: parseISO(from),
              end: parseISO(to)
            });
      const statusMatch =
        activeFilters.status === 'all' ? true : order.status === activeFilters.status;
      if (!user) return within && statusMatch;
      if (user.role === 'admin') return within && statusMatch;
      return within && statusMatch && order.agentId === user.id;
    });
  }, [activeFilters.dateRange, activeFilters.status, orders, user]);

  const totals = useMemo(() => {
    const sum = filteredOrders.reduce((acc, order) => acc + order.amount, 0);
    const completed = filteredOrders.filter((order) => order.status === 'completed').length;
    const pending = filteredOrders.filter((order) => order.status !== 'completed').length;
    return { sum, completed, pending };
  }, [filteredOrders]);

  const handleFilterChange = (key, value) => {
    setFilters({ [key]: value });
  };

  const handleOrderSubmit = (event) => {
    event.preventDefault();
    if (!orderAmount || !selectedStore) return;

    const amount = Number(orderAmount.replace(/[\s']/g, ''));
    if (Number.isNaN(amount) || amount <= 0) {
      addToast({
        variant: 'warning',
        title: 'Summani tekshiring',
        description: 'Buyurtma summasi musbat son boʼlishi kerak.'
      });
      return;
    }

    const fallbackAgent = agents.find((agent) => agent.role === 'agent');
    const order = {
      id: `ord-${Date.now()}`,
      storeId: selectedStore,
      agentId: user?.id ?? fallbackAgent?.id ?? 'agent',
      amount,
      status,
      createdAt: new Date().toISOString()
    };

    upsertOrder(order);
    addToast({
      variant: 'success',
      title: 'Buyurtma qoʼshildi',
      description: `${order.id} muvaffaqiyatli saqlandi.`
    });
    setOrderAmount('');
    setStatus('pending');
  };

  const handleExport = async (formatType, chartImage) => {
    setExporting(true);
    try {
      if (formatType === 'pdf') {
        await exportOrdersToPDF({
          orders: filteredOrders,
          stores,
          agents,
          chartImage
        });
      } else {
        await exportOrdersToExcel({
          orders: filteredOrders,
          stores,
          agents
        });
      }
      addToast({
        variant: 'success',
        title: 'Eksport tayyor',
        description:
          formatType === 'pdf'
            ? 'PDF hisobotingiz yuklab olindi.'
            : 'Excel fayli yuklab olindi.'
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

  const handleMapNavigation = (store) => {
    navigate('/map', { state: { store } });
  };

  const handleMarkVisit = (storeId) => {
    updateStore(storeId, { lastVisit: new Date().toISOString(), status: 'active' });
    addToast({
      variant: 'success',
      title: 'Tashrif belgilandi',
      description: 'Do’kon tashrifi muvaffaqiyatli yangilandi.'
    });
  };

  const renderOverview = () => (
    <section className="grid-cards">
      <article className="hero-card glass-panel">
        <div>
          <h3>Bugungi imkoniyatlar</h3>
          <p>
            Oylik rejalarni kuzatib boring va daromadlarni oshiring. Telegram Mini App real vaqt
            ma’lumotlari har bir harakatingizni qo’llab-quvvatlaydi.
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn-primary" onClick={() => navigate('/agent/orders')}>
            Buyurtma qo’shish
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/stats')}>
            Statistika
          </button>
        </div>
      </article>
      <article className="metric-card">
        <h3>Umumiy tushum</h3>
        <p className="metric-value">{totals.sum.toLocaleString('uz-UZ')} soʼm</p>
        <span className="metric-subtitle">Tanlangan davr bo’yicha</span>
      </article>
      <article className="metric-card accent">
        <h3>Yakunlangan buyurtmalar</h3>
        <p className="metric-value">{totals.completed}</p>
        <span className="metric-subtitle">So’nggi 7 kun ichida</span>
      </article>
      <article className="metric-card">
        <h3>Jarayonda</h3>
        <p className="metric-value text-warning">{totals.pending}</p>
        <span className="metric-subtitle">Nazorat talab qilinadi</span>
      </article>
    </section>
  );

  const renderOrders = () => (
    <section className="panel glass-panel">
      <div className="panel-head">
        <div>
          <h2>Buyurtmalar</h2>
          <p className="panel-subtitle">
            Buyurtmalarni real vaqt rejimida kuzating, holatlarni yangilang va eksport qiling.
          </p>
        </div>
        <div className="panel-actions">
          <button
            type="button"
            className="btn-glass"
            onClick={() =>
              handleFilterChange('dateRange', [
                addDays(new Date(), -7).toISOString(),
                new Date().toISOString()
              ])
            }
          >
            So’nggi 7 kun
          </button>
          <button
            type="button"
            className="btn-primary subtle"
            disabled={isExporting}
            onClick={() => handleExport('pdf')}
          >
            <span className="material-symbols-rounded">picture_as_pdf</span>
            PDF
          </button>
          <button
            type="button"
            className="btn-primary subtle"
            disabled={isExporting}
            onClick={() => handleExport('xlsx')}
          >
            <span className="material-symbols-rounded">grid_on</span>
            Excel
          </button>
        </div>
      </div>

      <form className="order-form" onSubmit={handleOrderSubmit}>
        <label className="input-field">
          <span>Do’kon</span>
          <select
            value={selectedStore}
            onChange={(event) => setSelectedStore(event.target.value)}
            required
          >
            <option value="" disabled>
              Do’konni tanlang
            </option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.title}
              </option>
            ))}
          </select>
        </label>
        <label className="input-field">
          <span>Summasi (soʼm)</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={orderAmount}
            onChange={(event) => setOrderAmount(event.target.value)}
            placeholder="250000"
            required
          />
        </label>
        <label className="input-field">
          <span>Holat</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="pending">Kutilmoqda</option>
            <option value="processing">Jarayonda</option>
            <option value="completed">Yakunlangan</option>
          </select>
        </label>
        <button type="submit" className="btn-primary">
          Saqlash
        </button>
      </form>

      <div className="filters">
        <label className="input-field compact">
          <span>Dan</span>
          <input
            type="date"
            value={activeFilters.dateRange[0]?.slice(0, 10)}
            onChange={(event) =>
              handleFilterChange('dateRange', [
                event.target.value ? `${event.target.value}T00:00:00.000Z` : '',
                activeFilters.dateRange[1]
              ])
            }
          />
        </label>
        <label className="input-field compact">
          <span>Gacha</span>
          <input
            type="date"
            value={activeFilters.dateRange[1]?.slice(0, 10)}
            onChange={(event) =>
              handleFilterChange('dateRange', [
                activeFilters.dateRange[0],
                event.target.value ? `${event.target.value}T23:59:59.999Z` : ''
              ])
            }
          />
        </label>
        <label className="input-field compact">
          <span>Holat</span>
          <select
            value={activeFilters.status}
            onChange={(event) => handleFilterChange('status', event.target.value)}
          >
            {Object.entries(statusDict).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Do’kon</th>
              <th>Summasi</th>
              <th>Holati</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const store = stores.find((st) => st.id === order.storeId);
              return (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{store?.title ?? order.storeId}</td>
                  <td>{order.amount.toLocaleString('uz-UZ')} soʼm</td>
                  <td>
                    <span className={`status-badge status-${order.status}`}>
                      {statusDict[order.status] ?? order.status}
                    </span>
                  </td>
                  <td>{format(parseISO(order.createdAt), 'dd.MM.yyyy')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filteredOrders.length && (
          <div className="empty-state">
            <span className="material-symbols-rounded">content_paste_search</span>
            <p>Tanlangan filtrlar boʻyicha buyurtmalar topilmadi.</p>
          </div>
        )}
      </div>
    </section>
  );

  const renderStores = () => (
    <section className="grid-cards stores-grid">
      {stores.map((store) => (
        <article key={store.id} className="store-card glass-panel">
          <header>
            <h3>{store.title}</h3>
            <span className={`status-pill status-${store.status}`}>{store.status}</span>
          </header>
          <p className="store-address">{store.address}</p>
          <div className="store-meta">
            <span>
              <strong>Menejer:</strong> {store.manager}
            </span>
            <span>
              <strong>Oxirgi tashrif:</strong>{' '}
              {store.lastVisit ? format(parseISO(store.lastVisit), 'dd MMM') : '—'}
            </span>
          </div>
          <footer>
            <button type="button" className="btn-glass" onClick={() => handleMapNavigation(store)}>
              <span className="material-symbols-rounded">pin_drop</span>
              Xarita
            </button>
            <button
              type="button"
              className="btn-primary subtle"
              onClick={() => handleMarkVisit(store.id)}
            >
              <span className="material-symbols-rounded">task_alt</span>
              Tashrifni belgilash
            </button>
          </footer>
        </article>
      ))}
    </section>
  );

  return (
    <main className="page agent-dashboard">
      <div className="page-intro">
        <div>
          <h2>Salom, {user?.name ?? 'Agent'}!</h2>
          <p>
            Bugungi rejalar va buyurtmalarni bu yerda boshqaring. Ma’lumotlar real vaqt rejimida
            yangilanadi.
          </p>
        </div>
        <div className="chip">
          <span className="material-symbols-rounded">calendar_month</span>
          {format(new Date(), 'dd MMMM, EEE')}
        </div>
      </div>
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'orders' && renderOrders()}
      {activeTab === 'stores' && renderStores()}
    </main>
  );
}
