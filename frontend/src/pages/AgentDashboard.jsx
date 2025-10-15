import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format, isWithinInterval, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import SectionHeader from '../components/layout/SectionHeader';
import FilterToolbar from '../components/layout/FilterToolbar';
import Modal from '../components/Modal';
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
    addStore,
    addToast
  } = useAppContext();
  const navigate = useNavigate();

  const [orderAmount, setOrderAmount] = useState('');
  const [selectedStore, setSelectedStore] = useState(stores[0]?.id ?? '');
  const [orderStatus, setOrderStatus] = useState('pending');
  const [isExporting, setExporting] = useState(false);
  const [quickModalType, setQuickModalType] = useState(null);
  const [newStoreTitle, setNewStoreTitle] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStoreManager, setNewStoreManager] = useState('');
  const [newStoreStatus, setNewStoreStatus] = useState('pending');

  useEffect(() => {
    if (!stores.length) {
      setSelectedStore('');
      return;
    }
    setSelectedStore((previous) =>
      stores.some((store) => store.id === previous) ? previous : stores[0].id
    );
  }, [stores]);

  useEffect(() => {
    const handleAddOrder = () => setQuickModalType('order');
    const handleAddStore = () => setQuickModalType('store');

    window.addEventListener('picco:add-order', handleAddOrder);
    window.addEventListener('picco:add-store', handleAddStore);

    return () => {
      window.removeEventListener('picco:add-order', handleAddOrder);
      window.removeEventListener('picco:add-store', handleAddStore);
    };
  }, []);

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

  const topStores = useMemo(
    () =>
      stores
        .slice(0, 4)
        .map((store) => ({
          id: store.id,
          title: store.title,
          manager: store.manager,
          status: store.status,
          lastVisit: store.lastVisit ? format(parseISO(store.lastVisit), 'dd MMM') : '—'
        })),
    [stores]
  );

  const handleFilterChange = (key, value) => {
    setFilters({ [key]: value });
  };

  const closeQuickModal = () => {
    setQuickModalType(null);
  };

  const handleOrderSubmit = (event) => {
    event.preventDefault();
    if (!orderAmount || !selectedStore) return;

    const amount = Number(orderAmount.replace(/[\s']/g, ''));
    if (Number.isNaN(amount) || amount <= 0) {
      addToast({
        variant: 'warning',
        title: 'Summani tekshiring',
        description: "Buyurtma summasi musbat son bo'lishi kerak."
      });
      return;
    }

    const fallbackAgent = agents.find((agent) => agent.role === 'agent');
    const order = {
      id: `ord-${Date.now()}`,
      storeId: selectedStore,
      agentId: user?.id ?? fallbackAgent?.id ?? 'agent',
      amount,
      status: orderStatus,
      createdAt: new Date().toISOString()
    };

    upsertOrder(order);
    addToast({
      variant: 'success',
      title: "Buyurtma qo'shildi",
      description: `${order.id} muvaffaqiyatli saqlandi.`
    });
    setOrderAmount('');
    setOrderStatus('pending');
    closeQuickModal();
  };

  const handleStoreSubmit = (event) => {
    event.preventDefault();
    if (!newStoreTitle.trim() || !newStoreAddress.trim()) {
      addToast({
        variant: 'warning',
        title: "Maydonlarni to'ldiring",
        description: "Yangi do'kon uchun kamida nom va manzil kiriting."
      });
      return;
    }

    const storeId = addStore({
      title: newStoreTitle.trim(),
      address: newStoreAddress.trim(),
      manager: newStoreManager.trim() || (user?.name ?? 'PICCO agenti'),
      status: newStoreStatus,
      coordinates: null,
      lastVisit: null
    });

    addToast({
      variant: 'success',
      title: "Do'kon qo'shildi",
      description: `${newStoreTitle.trim()} bazaga qo'shildi (${storeId}).`
    });

    setNewStoreTitle('');
    setNewStoreAddress('');
    setNewStoreManager('');
    setNewStoreStatus('pending');
    closeQuickModal();
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
        description:
          error instanceof Error ? error.message : 'Eksport jarayonida kutilmagan xatolik yuz berdi.'
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
      title: "Tashrif qayd etildi",
      description: "Do'kon tashrifi so'nggi tashrif sifatida belgilandi."
    });
  };

  const currentDateLabel = format(new Date(), 'dd MMMM, EEE');

  return (
    <PageContainer className="agent-dashboard">
      <section className="dashboard-hero frosted-card">
        <div className="dashboard-hero__header">
          <div>
            <span className="dashboard-hero__eyebrow">Bugungi ko&apos;rsatkichlar</span>
            <h2>Salom, {user?.name ?? 'Agent'}!</h2>
            <p>
              Ma&apos;lumotlaringiz real vaqt rejimida yangilanadi. Buyurtmalar, do&apos;konlar va statistikani
              bir joyda boshqaring.
            </p>
          </div>
          <div className="dashboard-hero__meta">
            <span className="material-symbols-rounded">calendar_month</span>
            <span>{currentDateLabel}</span>
          </div>
        </div>
        <div className="dashboard-hero__actions">
          <button type="button" className="btn-primary" onClick={() => setQuickModalType('order')}>
            <span className="material-symbols-rounded">add</span>
            Yangi buyurtma
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate('/stats')}>
            Statistikalar
          </button>
        </div>
      </section>

      {activeTab === 'overview' ? (
        <>
          <section className="stat-grid">
            <article className="surface-card stat-card accent">
              <div className="stat-card__icon">
                <span className="material-symbols-rounded">payments</span>
              </div>
              <div>
                <span className="stat-card__label">Umumiy tushum</span>
                <p className="stat-card__value">
                  {totals.sum.toLocaleString('uz-UZ')} <span>so&apos;m</span>
                </p>
                <span className="stat-card__meta">Tanlangan davr bo&apos;yicha</span>
              </div>
            </article>
            <article className="surface-card stat-card">
              <div className="stat-card__icon success">
                <span className="material-symbols-rounded">task_alt</span>
              </div>
              <div>
                <span className="stat-card__label">Yakunlangan buyurtmalar</span>
                <p className="stat-card__value">{totals.completed}</p>
                <span className="stat-card__meta">So&apos;nggi 7 kun ichida</span>
              </div>
            </article>
            <article className="surface-card stat-card">
              <div className="stat-card__icon warning">
                <span className="material-symbols-rounded">schedule</span>
              </div>
              <div>
                <span className="stat-card__label">Jarayonda</span>
                <p className="stat-card__value">{totals.pending}</p>
                <span className="stat-card__meta">Nazorat talab qilinadi</span>
              </div>
            </article>
          </section>

          <section className="surface-card order-highlight">
            <SectionHeader
              title="Faol buyurtmalar"
              subtitle="So&apos;nggi faoliyat va jarayondagi buyurtmalar"
              action={
                <button type="button" className="btn-secondary" onClick={() => navigate('/agent/orders')}>
                  Barcha buyurtmalar
                </button>
              }
            />
            <div className="order-highlight__list">
              {filteredOrders.slice(0, 4).map((order) => {
                const store = stores.find((item) => item.id === order.storeId);
                return (
                  <div key={order.id} className="order-highlight__item">
                    <div>
                      <p className="order-highlight__title">{store?.title ?? order.storeId}</p>
                      <span className={`status-tag status-${order.status}`}>
                        {statusDict[order.status] ?? order.status}
                      </span>
                    </div>
                    <div className="order-highlight__meta">
                      <strong>{order.amount.toLocaleString('uz-UZ')} so&apos;m</strong>
                      <span>{format(parseISO(order.createdAt), 'dd MMM')}</span>
                    </div>
                  </div>
                );
              })}
              {!filteredOrders.length ? (
                <div className="empty-state compact">
                  <span className="material-symbols-rounded">content_paste_search</span>
                  <p>Hozircha buyurtmalar mavjud emas.</p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="surface-card store-highlight">
            <SectionHeader
              title="Kuzatuvdagi do&apos;konlar"
              subtitle="Oxirgi tashrif va holati"
              action={
                <button type="button" className="btn-secondary" onClick={() => navigate('/agent/stores')}>
                  Barcha do&apos;konlar
                </button>
              }
            />
            <div className="store-highlight__grid">
              {topStores.map((store) => (
                <article key={store.id} className="store-card surface-card-mini">
                  <header>
                    <h3>{store.title}</h3>
                    <span className={`status-pill status-${store.status}`}>{store.status}</span>
                  </header>
                  <p className="store-card__manager">Menejer: {store.manager}</p>
                  <footer>
                    <span className="store-card__visit">
                      Oxirgi tashrif: <strong>{store.lastVisit}</strong>
                    </span>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => {
                        const match = stores.find((item) => item.id === store.id);
                        if (match) handleMapNavigation(match);
                      }}
                    >
                      Xarita
                    </button>
                  </footer>
                </article>
              ))}
              {!topStores.length ? (
                <div className="empty-state compact">
                  <span className="material-symbols-rounded">store</span>
                  <p>do&apos;konlar mavjud emas.</p>
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {activeTab === 'orders' ? (
        <section className="surface-card order-board">
          <SectionHeader
            title="Buyurtmalar"
            subtitle="Buyurtmalarni real vaqt rejimida kuzating va holatlarni boshqaring."
            action={
              <div className="order-board__actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isExporting}
                  onClick={() =>
                    handleFilterChange('dateRange', [
                      addDays(new Date(), -7).toISOString(),
                      new Date().toISOString()
                    ])
                  }
                >
                  So&apos;nggi 7 kun
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={isExporting}
                  onClick={() => handleExport('pdf')}
                >
                  <span className="material-symbols-rounded">picture_as_pdf</span>
                  PDF
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={isExporting}
                  onClick={() => handleExport('xlsx')}
                >
                  <span className="material-symbols-rounded">grid_on</span>
                  Excel
                </button>
              </div>
            }
          />

          <FilterToolbar sticky className="order-board__filters">
            <label className="input-field compact">
              <span>Dan</span>
              <input
                type="date"
                value={activeFilters.dateRange[0]?.slice(0, 10) ?? ''}
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
                value={activeFilters.dateRange[1]?.slice(0, 10) ?? ''}
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
            <button type="button" className="btn-primary" onClick={() => setQuickModalType('order')}>
              <span className="material-symbols-rounded">add</span>
              Buyurtma qo&apos;shish
            </button>
          </FilterToolbar>

          <div className="table-card">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>do&apos;kon</th>
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
                      <td>{order.amount.toLocaleString('uz-UZ')} so&apos;m</td>
                      <td>
                        <span className={`status-tag status-${order.status}`}>
                          {statusDict[order.status] ?? order.status}
                        </span>
                      </td>
                      <td>{format(parseISO(order.createdAt), 'dd.MM.yyyy')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredOrders.length ? (
              <div className="empty-state">
                <span className="material-symbols-rounded">content_paste_search</span>
                <p>Filtrlar bo&apos;yicha buyurtmalar topilmadi.</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === 'stores' ? (
        <section className="card-grid store-grid">
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
                <button type="button" className="btn-primary subtle" onClick={() => handleMarkVisit(store.id)}>
                  <span className="material-symbols-rounded">task_alt</span>
                  Tashrifni belgilash
                </button>
              </footer>
            </article>
          ))}
          {!stores.length ? (
            <div className="empty-state">
              <span className="material-symbols-rounded">store</span>
              <p>Hozircha hech qanday do&apos;kon biriktirilmagan.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <Modal
        isOpen={quickModalType === 'order'}
        onClose={closeQuickModal}
        title="Yangi buyurtma"
        actions={
          <button type="submit" form="quick-order-form" className="btn-primary">
            Saqlash
          </button>
        }
      >
        <form id="quick-order-form" className="form-grid" onSubmit={handleOrderSubmit}>
          <label className="input-field">
            <span>do&apos;kon</span>
            <select value={selectedStore} onChange={(event) => setSelectedStore(event.target.value)} required>
              <option value="" disabled>
                do&apos;konni tanlang
              </option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.title}
                </option>
              ))}
            </select>
          </label>
          <label className="input-field">
            <span>Summasi (so&apos;m)</span>
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
            <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}>
              <option value="pending">Kutilmoqda</option>
              <option value="processing">Jarayonda</option>
              <option value="completed">Yakunlangan</option>
            </select>
          </label>
        </form>
      </Modal>

      <Modal
        isOpen={quickModalType === 'store'}
        onClose={closeQuickModal}
        title="Yangi do&apos;kon"
        actions={
          <button type="submit" form="quick-store-form" className="btn-primary">
            Saqlash
          </button>
        }
      >
        <form id="quick-store-form" className="form-grid" onSubmit={handleStoreSubmit}>
          <label className="input-field">
            <span>do&apos;kon nomi</span>
            <input
              type="text"
              value={newStoreTitle}
              onChange={(event) => setNewStoreTitle(event.target.value)}
              placeholder="PICCO Market"
              required
            />
          </label>
          <label className="input-field">
            <span>Manzil</span>
            <input
              type="text"
              value={newStoreAddress}
              onChange={(event) => setNewStoreAddress(event.target.value)}
              placeholder="Toshkent, Chilonzor"
              required
            />
          </label>
          <label className="input-field">
            <span>Menejer</span>
            <input
              type="text"
              value={newStoreManager}
              onChange={(event) => setNewStoreManager(event.target.value)}
              placeholder="Aziza Karimova"
            />
          </label>
          <label className="input-field">
            <span>Holat</span>
            <select value={newStoreStatus} onChange={(event) => setNewStoreStatus(event.target.value)}>
              <option value="pending">Kutilmoqda</option>
              <option value="active">Faol</option>
            </select>
          </label>
        </form>
      </Modal>
    </PageContainer>
  );
}


