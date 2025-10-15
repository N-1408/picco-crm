import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import SectionHeader from '../components/layout/SectionHeader';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';

export default function AdminDashboard({ activeTab = 'overview' }) {
  const {
    state: { orders, stores, products, agents },
    updateStore,
    updateProduct,
    addProduct,
    addToast
  } = useAppContext();
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [draftProduct, setDraftProduct] = useState({
    name: '',
    category: 'Umumiy',
    price: 0,
    inventory: 0
  });
  const navigate = useNavigate();

  const metrics = useMemo(() => {
    const orderAmount = orders.reduce((acc, order) => acc + order.amount, 0);
    const activeStores = stores.filter((store) => store.status === 'active').length;
    const pendingOrders = orders.filter((order) => order.status !== 'completed').length;
    return {
      totalOrders: orders.length,
      orderAmount,
      activeStores,
      pendingOrders
    };
  }, [orders, stores]);

  const handleStatusChange = (storeId, status) => {
    updateStore(storeId, { status });
    addToast({
      variant: 'success',
      title: 'Holat yangilandi',
      description: 'Do\'kon holati muvaffaqiyatli o\'zgartirildi.'
    });
  };

  const handleInventoryUpdate = (productId, key, value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    updateProduct(productId, {
      [key]: numeric,
      updatedAt: new Date().toISOString()
    });
    addToast({
      variant: 'success',
      title: 'Mahsulot yangilandi',
      description: 'Ma\'lumotlar saqlandi.'
    });
  };

  const handleProductCreate = (event) => {
    event.preventDefault();
    addProduct({
      name: draftProduct.name,
      category: draftProduct.category,
      price: Number(draftProduct.price),
      inventory: Number(draftProduct.inventory),
      updatedAt: new Date().toISOString()
    });
    addToast({
      variant: 'success',
      title: 'Mahsulot qo\'shildi',
      description: `${draftProduct.name} katalogga kiritildi.`
    });
    setDraftProduct({
      name: '',
      category: 'Umumiy',
      price: 0,
      inventory: 0
    });
    setProductModalOpen(false);
  };

  const renderOverview = () => (
    <>
      <section className="stat-grid">
        <article className="surface-card stat-card accent">
          <div className="stat-card__icon">
            <span className="material-symbols-rounded">contract</span>
          </div>
          <div>
            <span className="stat-card__label">Buyurtmalar</span>
            <p className="stat-card__value">{metrics.totalOrders}</p>
            <span className="stat-card__meta">Umumiy buyurtmalar soni</span>
          </div>
        </article>
        <article className="surface-card stat-card">
          <div className="stat-card__icon success">
            <span className="material-symbols-rounded">payments</span>
          </div>
          <div>
            <span className="stat-card__label">Daromad</span>
            <p className="stat-card__value">
              {metrics.orderAmount.toLocaleString('uz-UZ')} <span>so‘m</span>
            </p>
            <span className="stat-card__meta">Umumiy tushum</span>
          </div>
        </article>
        <article className="surface-card stat-card">
          <div className="stat-card__icon">
            <span className="material-symbols-rounded">storefront</span>
          </div>
          <div>
            <span className="stat-card__label">Faol do‘konlar</span>
            <p className="stat-card__value">{metrics.activeStores}</p>
            <span className="stat-card__meta">Hozir 24/7 ishlamoqda</span>
          </div>
        </article>
        <article className="surface-card stat-card">
          <div className="stat-card__icon warning">
            <span className="material-symbols-rounded">pending_actions</span>
          </div>
          <div>
            <span className="stat-card__label">Jarayondagi buyurtmalar</span>
            <p className="stat-card__value">{metrics.pendingOrders}</p>
            <span className="stat-card__meta text-warning">Yakunlash uchun nazorat</span>
          </div>
        </article>
      </section>
      <section className="surface-card admin-overview">
        <SectionHeader
          title="Strategik ko‘rsatkichlar"
          subtitle="Oylik sotuvlar, top agentlar va segmentlar bo‘yicha batafsil tahlillarni kuzating."
          action={
            <button type="button" className="btn-secondary" onClick={() => navigate('/stats')}>
              <span className="material-symbols-rounded">insights</span>
              Statistika
            </button>
          }
        />
        <div className="admin-highlights">
          <div>
            <h4>Top agent</h4>
            <p>{agents[0]?.name ?? 'Agent'}</p>
            <span>{agents[0]?.region ?? 'Toshkent'} filiali</span>
          </div>
          <div>
            <h4>Trend mahsulot</h4>
            <p>{products[0]?.name ?? 'Mahsulot'}</p>
            <span>{products[0]?.category ?? 'Kategoriya'} segmenti</span>
          </div>
        </div>
      </section>
    </>
  );

  const renderProducts = () => (
    <section className="panel glass-panel">
      <div className="panel-head">
        <div>
          <h2>Mahsulotlar</h2>
          <p className="panel-subtitle">Narx va qoldiqni tezkor boshqarish.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setProductModalOpen(true)}>
          <span className="material-symbols-rounded">add</span>
          Yangi mahsulot
        </button>
      </div>
      <div className="table products-table">
        <table>
          <thead>
            <tr>
              <th>Nomi</th>
              <th>Kategoriya</th>
              <th>Narx (so&apos;m)</th>
              <th>Qoldiq</th>
              <th>Yangilangan</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.category}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    defaultValue={product.price}
                    onBlur={(event) => handleInventoryUpdate(product.id, 'price', event.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    defaultValue={product.inventory}
                    onBlur={(event) =>
                      handleInventoryUpdate(product.id, 'inventory', event.target.value)
                    }
                  />
                </td>
                <td>{format(parseISO(product.updatedAt), 'dd MMM')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products.length && (
          <div className="empty-state">
            <span className="material-symbols-rounded">inventory_2</span>
            <p>Katalogda mahsulot topilmadi.</p>
          </div>
        )}
      </div>
    </section>
  );

  const renderStores = () => (
    <section className="panel glass-panel">
      <div className="panel-head">
        <div>
          <h2>Do&apos;konlar</h2>
          <p className="panel-subtitle">Statuslarni boshqaring va tashriflarni kuzating.</p>
        </div>
      </div>
      <div className="stores-list">
        {stores.map((store) => (
          <article key={store.id} className="store-row">
            <div>
              <h3>{store.title}</h3>
              <p>{store.address}</p>
            </div>
            <div className="store-actions">
              <select
                value={store.status}
                onChange={(event) => handleStatusChange(store.id, event.target.value)}
              >
                <option value="active">Faol</option>
                <option value="pending">Jarayonda</option>
              </select>
              <span className="timestamp">
                Oxirgi tashrif: {store.lastVisit ? format(parseISO(store.lastVisit), 'dd MMM') : '—'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const renderAgents = () => (
    <section className="panel glass-panel">
      <div className="panel-head">
        <div>
          <h2>Agentlar</h2>
          <p>
            Agentlar faoliyati va rejalarini kuzating, rag&apos;batlantirish tizimini yarating.
          </p>
        </div>
      </div>
      <div className="agents-grid">
        {agents
          .filter((agent) => agent.role === 'agent')
          .map((agent) => (
            <article key={agent.id} className="agent-card">
              <img src={agent.avatar} alt={agent.name} />
              <div>
                <h3>{agent.name}</h3>
                <p>{agent.region}</p>
                <span>{agent.phone}</span>
              </div>
              <button
                type="button"
                className="btn-glass"
                onClick={() => {
                  const phone = agent.phone.replace(/\s/g, '');
                  if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.openTelegramLink(
                      `https://t.me/${agent.username ?? 'picco_agent_bot'}`
                    );
                  } else {
                    window.open(`tel:${phone}`, '_blank');
                  }
                }}
              >
                <span className="material-symbols-rounded">chat</span>
                Bog&apos;lanish
              </button>
            </article>
          ))}
      </div>
    </section>
  );

  return (
    <PageContainer className="admin-dashboard">
      <section className="dashboard-hero frosted-card admin-hero">
        <div className="dashboard-hero__header">
          <div>
            <span className="dashboard-hero__eyebrow">PICCO boshqaruvi</span>
            <h2>Admin boshqaruv paneli</h2>
            <p>Mahsulotlar, tarmoqlar va jamoani yagona markazdan boshqaring.</p>
          </div>
          <div className="dashboard-hero__meta">
            <span className="material-symbols-rounded">shield_person</span>
            Premium ruxsat
          </div>
        </div>
        <div className="dashboard-hero__actions">
          <button type="button" className="btn-primary" onClick={() => setProductModalOpen(true)}>
            <span className="material-symbols-rounded">add</span>
            Mahsulot qo‘shish
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate('/stats')}>
            Statistika
          </button>
        </div>
      </section>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'products' && renderProducts()}
      {activeTab === 'stores' && renderStores()}
      {activeTab === 'agents' && renderAgents()}

      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title="Yangi mahsulot qo‘shish"
        description="Premium katalogingizni yangilang. Narxlar va qoldiqni istalgan vaqtda sozlang."
        actions={
          <button type="submit" form="product-form" className="btn-primary">
            Saqlash
          </button>
        }
      >
        <form id="product-form" className="form-grid" onSubmit={handleProductCreate}>
          <label className="input-field">
            <span>Nomi</span>
            <input
              type="text"
              value={draftProduct.name}
              onChange={(event) =>
                setDraftProduct((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </label>
          <label className="input-field">
            <span>Kategoriya</span>
            <input
              type="text"
              value={draftProduct.category}
              onChange={(event) =>
                setDraftProduct((prev) => ({ ...prev, category: event.target.value }))
              }
            />
          </label>
          <label className="input-field">
            <span>Narx (so‘m)</span>
            <input
              type="number"
              min="0"
              value={draftProduct.price}
              onChange={(event) =>
                setDraftProduct((prev) => ({ ...prev, price: event.target.value }))
              }
              required
            />
          </label>
          <label className="input-field">
            <span>Qoldiq (dona)</span>
            <input
              type="number"
              min="0"
              value={draftProduct.inventory}
              onChange={(event) =>
                setDraftProduct((prev) => ({ ...prev, inventory: event.target.value }))
              }
              required
            />
          </label>
        </form>
      </Modal>
    </PageContainer>
  );
}
