import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

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
    updateStore({ id: storeId, status });
    addToast({
      variant: 'success',
      title: 'Holat yangilandi',
      description: 'Do\'kon holati muvaffaqiyatli o\'zgartirildi.'
    });
  };

  const handleInventoryUpdate = (productId, key, value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    updateProduct({
      id: productId,
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
    const payload = {
      ...draftProduct,
      id: `prd-${Date.now()}`,
      price: Number(draftProduct.price),
      inventory: Number(draftProduct.inventory),
      updatedAt: new Date().toISOString()
    };
    addProduct(payload);
    addToast({
      variant: 'success',
      title: 'Mahsulot qo\'shildi',
      description: `${payload.name} katalogga kiritildi.`
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
      <section className="grid-cards">
        <article className="metric-card accent">
          <h3>Buyurtmalar</h3>
          <p className="metric-value">{metrics.totalOrders}</p>
          <span className="metric-subtitle">Umumiy buyurtmalar soni</span>
        </article>
        <article className="metric-card">
          <h3>Daromad</h3>
          <p className="metric-value">
            {metrics.orderAmount.toLocaleString('uz-UZ')} so&apos;m
          </p>
          <span className="metric-subtitle">Umumiy tushum</span>
        </article>
        <article className="metric-card">
          <h3>Faol do&apos;konlar</h3>
          <p className="metric-value">{metrics.activeStores}</p>
          <span className="metric-subtitle">Hozir 24/7 ishlamoqda</span>
        </article>
        <article className="metric-card">
          <h3>Jarayondagi buyurtmalar</h3>
          <p className="metric-value text-warning">{metrics.pendingOrders}</p>
          <span className="metric-subtitle text-warning">Yakunlash uchun nazorat</span>
        </article>
      </section>
      <section className="panel glass-panel">
        <div className="panel-head">
          <div>
            <h2>Strategik ko&apos;rsatkichlar</h2>
            <p className="panel-subtitle">
              Oylik sotuvlar, top agentlar va segmentlar bo&apos;yicha batafsil tahlillarni kuzating.
            </p>
          </div>
          <button type="button" className="btn-primary subtle" onClick={() => navigate('/stats')}>
            <span className="material-symbols-rounded">insights</span>
            Statistika
          </button>
        </div>
        <div className="admin-highlights">
          <div>
            <h4>Top agent</h4>
            <p>{agents[0]?.name ?? 'Agent'}</p>
            <span>{agents[0]?.region ?? 'Toshkent'} filiali</span>
          </div>
          <div>
            <h4>Issiq hudud</h4>
            <p>Toshkent shahar</p>
            <span>36% buyurtma ulushi</span>
          </div>
          <div>
            <h4>Portfel diversifikatsiyasi</h4>
            <p>Mahsulotlar 5 ta segmentda</p>
            <span>Inventar balanslangan</span>
          </div>
        </div>
      </section>
    </>
  );

  const renderProducts = () => (
    <section className="panel glass-panel">
      <div className="panel-head">
        <div>
          <h2>Mahsulot katalogi</h2>
          <p className="panel-subtitle">Narxlar va qoldiqlarni real vaqt rejimida boshqaring.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setProductModalOpen(true)}>
          <span className="material-symbols-rounded">add</span>
          Yangi mahsulot
        </button>
      </div>
      <div className="grid-cards products-grid">
        {products.map((product) => (
          <article key={product.id} className="product-card">
            <header>
              <h3>{product.name}</h3>
              <span>{product.category}</span>
            </header>
            <div className="product-meta">
              <label>
                Narx (so&apos;m)
                <input
                  type="number"
                  min="0"
                  value={product.price}
                  onChange={(event) =>
                    handleInventoryUpdate(product.id, 'price', event.target.value)
                  }
                />
              </label>
              <label>
                Qoldiq (dona)
                <input
                  type="number"
                  min="0"
                  value={product.inventory}
                  onChange={(event) =>
                    handleInventoryUpdate(product.id, 'inventory', event.target.value)
                  }
                />
              </label>
            </div>
            <footer>
              <span>
                Yangilangan sana:{' '}
                {product.updatedAt ? format(parseISO(product.updatedAt), 'dd MMM, HH:mm') : '—'}
              </span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );

  const renderStores = () => (
    <section className="panel glass-panel">
      <div className="panel-head">
        <div>
          <h2>Do&apos;konlar</h2>
          <p className="panel-subtitle">
            Tarmoqlarni holati, tashriflar va geolokatsiyalarni kuzatib boring.
          </p>
        </div>
      </div>
      <div className="stores-admin">
        {stores.map((store) => (
          <article key={store.id} className="store-row">
            <div>
              <h3>{store.title}</h3>
              <p>{store.address}</p>
            </div>
            <div className="store-controls">
              <select
                value={store.status}
                onChange={(event) => handleStatusChange(store.id, event.target.value)}
              >
                <option value="active">Faol</option>
                <option value="pending">Kutilmoqda</option>
                <option value="inactive">Nofaol</option>
              </select>
              <button
                type="button"
                className="btn-glass"
                onClick={() => navigate('/map', { state: { storeId: store.id } })}
              >
                <span className="material-symbols-rounded">map</span>
                Xarita
              </button>
            </div>
            <span className="timestamp">
              Oxirgi tashrif: {store.lastVisit ? format(parseISO(store.lastVisit), 'dd MMM') : '—'}
            </span>
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
          <p className="panel-subtitle">
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
                  if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.openTelegramLink(`https://t.me/${agent.username ?? 'picco_agent_bot'}`);
                  } else {
                    window.open(`tel:${agent.phone.replace(/\s/g, '')}`, '_blank');
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
    <main className="page admin-dashboard">
      <div className="page-intro">
        <div>
          <h2>Admin boshqaruv paneli</h2>
          <p>Mahsulotlar, tarmoqlar va jamoani yagona markazdan boshqaring.</p>
        </div>
        <div className="chip">
          <span className="material-symbols-rounded">shield_person</span>
          Premium ruxsat
        </div>
      </div>
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'products' && renderProducts()}
      {activeTab === 'stores' && renderStores()}
      {activeTab === 'agents' && renderAgents()}

      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title="Yangi mahsulot qo'shish"
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
              onChange={(event) => setDraftProduct((prev) => ({ ...prev, name: event.target.value }))}
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
            <span>Narx (so&apos;m)</span>
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
    </main>
  );
}
