import {
  fetchAgentProfile,
  fetchAgentProducts,
  fetchAgentStores,
  createAgentStore,
  fetchAgentOrders,
  createAgentOrder,
  fetchAgentStats
} from './api.js';
import { initTelegram, getTelegramUser } from './telegram.js';
import { showToast, renderEmptyState } from './ui.js';

const page = document.body.dataset.page;
const DESKTOP_BREAKPOINT = 1024;

function setupAgentShell() {
  const sidebar = document.querySelector('[data-sidebar]');
  if (!sidebar) return;

  if (window.innerWidth >= DESKTOP_BREAKPOINT) {
    sidebar.classList.add('is-open');
  }

  const openers = document.querySelectorAll('[data-sidebar-toggle]');
  const closers = document.querySelectorAll('[data-sidebar-close]');
  const navLinks = document.querySelectorAll('[data-nav-link]');

  const closeSidebar = () => {
    if (window.innerWidth < DESKTOP_BREAKPOINT) {
      sidebar.classList.remove('is-open');
    }
  };

  openers.forEach((button) => button.addEventListener('click', () => sidebar.classList.add('is-open')));
  closers.forEach((button) =>
    button.addEventListener('click', () => {
      closeSidebar();
      if (window.history.length > 1) {
        window.history.back();
      }
    })
  );

  navLinks.forEach((link) => {
    if (link.dataset.navLink === page) {
      link.classList.add('is-active');
    }
    link.addEventListener('click', () => closeSidebar());
  });
}

function initCollapsibles() {
  document.querySelectorAll('[data-collapse-target]').forEach((trigger) => {
    const targetId = trigger.getAttribute('data-collapse-target');
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    trigger.addEventListener('click', () => target.classList.toggle('is-open'));
  });
}

const agentCacheKey = 'picco_agent_profile';

function cacheAgentProfile(telegramId, profile) {
  sessionStorage.setItem(agentCacheKey, JSON.stringify({ telegramId, profile, timestamp: Date.now() }));
}

function readCachedProfile(telegramId) {
  const raw = sessionStorage.getItem(agentCacheKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.telegramId === telegramId) {
      return parsed.profile;
    }
  } catch (error) {
    sessionStorage.removeItem(agentCacheKey);
  }
  return null;
}

async function resolveAgentContext() {
  initTelegram();
  const telegramUser = getTelegramUser();
  const url = new URL(window.location.href);
  const paramTelegramId = url.searchParams.get('tg_id') ?? url.searchParams.get('telegramId');
  const storedTelegramId = sessionStorage.getItem('picco_agent_telegram_id');
  const telegramId = telegramUser?.id ?? paramTelegramId ?? storedTelegramId;

  if (!telegramId) {
    throw new Error('Telegram ID topilmedi. Iltimos, Mini Appni Telegram orqali oching.');
  }

  sessionStorage.setItem('picco_agent_telegram_id', telegramId);

  const cached = readCachedProfile(telegramId);
  if (cached) {
    return { telegramId, profile: cached };
  }

  const { user } = await fetchAgentProfile(telegramId);
  cacheAgentProfile(telegramId, user);
  return { telegramId, profile: user };
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(value ?? 0);

const formatDate = (value) =>
  new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));

function getRangeBounds(range) {
  const end = new Date();
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  switch (range) {
    case 'today':
      return { start, end };
    case 'week':
      start.setDate(end.getDate() - 7);
      return { start, end };
    case 'month':
      start.setMonth(end.getMonth() - 1);
      return { start, end };
    case 'year':
      start.setFullYear(end.getFullYear() - 1);
      return { start, end };
    default:
      start.setMonth(end.getMonth() - 1);
      return { start, end };
  }
}

function getPreviousRangeBounds(range) {
  const { start, end } = getRangeBounds(range);
  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start);
  const previousStart = new Date(start.getTime() - duration);
  return { start: previousStart, end: previousEnd };
}

function filterOrdersByBounds(orders, bounds) {
  const startTime = bounds.start.getTime();
  const endTime = bounds.end.getTime();
  return orders.filter((order) => {
    const createdRaw = order.created_at ?? order.createdAt;
    const timestamp = new Date(createdRaw).getTime();
    return Number.isFinite(timestamp) && timestamp >= startTime && timestamp <= endTime;
  });
}

function filterOrdersByRange(orders, range) {
  return filterOrdersByBounds(orders, getRangeBounds(range));
}

function aggregateOrders(orders) {
  const chartMap = new Map();
  const storeMap = new Map();
  const productMap = new Map();
  const sorted = [...orders].sort(
    (a, b) => new Date(b.created_at ?? b.createdAt) - new Date(a.created_at ?? a.createdAt)
  );
  let totalQuantity = 0;
  let totalRevenue = 0;

  sorted.forEach((order) => {
    const createdRaw = order.created_at ?? order.createdAt;
    const created = new Date(createdRaw);
    if (!Number.isFinite(created.getTime())) return;

    const quantity = Number(order.quantity ?? 0);
    const price = Number(order.products?.price ?? order.productPrice ?? order.price ?? 0);
    const revenue = quantity * price;

    totalQuantity += quantity;
    totalRevenue += revenue;

    const chartKey = created.toISOString().split('T')[0];
    chartMap.set(chartKey, (chartMap.get(chartKey) ?? 0) + revenue);

    const storeName = order.storeName ?? order.stores?.name ?? "Noma'lum do'kon";
    storeMap.set(storeName, (storeMap.get(storeName) ?? 0) + revenue);

    const productName = order.productName ?? order.products?.name ?? 'Mahsulot';
    productMap.set(productName, (productMap.get(productName) ?? 0) + revenue);
  });

  const chartEntries = Array.from(chartMap.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]));

  return {
    totalQuantity,
    totalRevenue,
    lastOrder: sorted[0]?.created_at ?? sorted[0]?.createdAt ?? null,
    chartLabels: chartEntries.map(([label]) => label),
    chartData: chartEntries.map(([, value]) => value),
    storeSeries: Array.from(storeMap.entries()).sort((a, b) => b[1] - a[1]),
    productSeries: Array.from(productMap.entries()).sort((a, b) => b[1] - a[1]),
    uniqueStores: storeMap.size,
    suggestedGoal: totalRevenue ? totalRevenue * 1.2 : 2_000_000
  };
}

function calculateGrowth(currentRevenue, previousRevenue) {
  if (!currentRevenue && !previousRevenue) return '--';
  if (!previousRevenue) return '+100%';
  const change = ((currentRevenue - previousRevenue) / Math.max(previousRevenue, 1)) * 100;
  if (!Number.isFinite(change)) return '--';
  const formatted = Math.abs(change).toFixed(1);
  return `${change >= 0 ? '+' : '-'}${formatted}%`;
}

function setActiveRangeButtons(buttons, active) {
  buttons.forEach((button) => {
    const isActive = button.dataset.range === active;
    button.classList.toggle('picco-btn--primary', isActive);
    button.classList.toggle('picco-btn--ghost', !isActive);
  });
}

function renderRecentOrders(container, orders) {
  if (!container) return;
  if (!orders.length) {
    renderEmptyState(container, 'Hali buyurtmalar mavjud emas.');
    return;
  }

  container.innerHTML = orders
    .slice(0, 5)
    .map((order) => {
      const productName = order.productName ?? order.products?.name ?? 'Mahsulot';
      const storeName = order.storeName ?? order.stores?.name ?? "Noma'lum do'kon";
      const quantity = order.quantity ?? 0;
      const createdRaw = order.created_at ?? order.createdAt;
      return `
        <li class="picco-list__item">
          <div class="flex items-center gap-3">
            <span class="picco-list__icon material-icons">inventory_2</span>
            <div>
              <p class="font-semibold">${productName}</p>
              <p class="picco-list__meta">${storeName}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-semibold">${quantity} dona</p>
            <p class="picco-list__meta">${createdRaw ? formatDate(createdRaw) : '--'}</p>
          </div>
        </li>
      `;
    })
    .join('');
}

async function initDashboardPage(context) {
  const welcomeHeading = document.getElementById('agent-welcome');
  const ordersEl = document.getElementById('agent-orders-count');
  const revenueEl = document.getElementById('agent-revenue-total');
  const lastOrderEl = document.getElementById('agent-last-order');
  const goalEl = document.getElementById('agent-goal');
  const recentList = document.getElementById('agent-recent-orders');
  const chartCanvas = document.getElementById('agent-dashboard-chart');
  const rangeButtons = document.querySelectorAll('[data-range]');

  if (welcomeHeading) {
    welcomeHeading.textContent = `Salom, ${context.profile.name}!`;
  }

  const { orders = [], recentOrders = [], monthly = [] } = await fetchAgentStats(context.profile.id);
  const allOrders = orders.length ? orders : recentOrders;
  let dashboardChart = null;
  let activeRange = 'month';

  const updateDashboard = (range) => {
    activeRange = range;
    setActiveRangeButtons(rangeButtons, range);

    const filtered = filterOrdersByRange(allOrders, range);
    const summary = aggregateOrders(filtered);
    const previousSummary = aggregateOrders(filterOrdersByBounds(allOrders, getPreviousRangeBounds(range)));

    ordersEl.textContent = summary.totalQuantity;
    revenueEl.textContent = formatCurrency(summary.totalRevenue);
    lastOrderEl.textContent = summary.lastOrder ? formatDate(summary.lastOrder) : '--';
    goalEl.textContent = formatCurrency(summary.suggestedGoal);
    goalEl.dataset.growth = calculateGrowth(summary.totalRevenue, previousSummary.totalRevenue);

    renderRecentOrders(recentList, filtered.length ? filtered : recentOrders);

    const labels = summary.chartLabels.length ? summary.chartLabels : monthly.map((item) => item.month);
    const data = summary.chartData.length ? summary.chartData : monthly.map((item) => item.totalRevenue ?? 0);

    if (chartCanvas && window.Chart) {
      if (!dashboardChart) {
        dashboardChart = new window.Chart(chartCanvas.getContext('2d'), {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Tushum',
                data,
                fill: true,
                tension: 0.4,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.25)'
              }
            ]
          },
          options: {
            plugins: { legend: { display: false } },
            scales: {
              y: {
                ticks: {
                  callback: (value) => formatCurrency(value)
                }
              }
            }
          }
        });
      } else {
        dashboardChart.data.labels = labels;
        dashboardChart.data.datasets[0].data = data;
        dashboardChart.update();
      }
    }
  };

  rangeButtons.forEach((button) => {
    button.addEventListener('click', () => updateDashboard(button.dataset.range));
  });

  updateDashboard(activeRange);
}

async function initOrdersPage(context) {
  const productsSelect = document.getElementById('order-product');
  const storesSelect = document.getElementById('order-store');
  const quantityInput = document.getElementById('order-quantity');
  const ordersTableBody = document.getElementById('orders-table-body');
  const addOrderForm = document.getElementById('add-order-form');
  const formWrapper = document.getElementById('order-form-wrapper');
  const cancelButton = document.getElementById('order-form-cancel');

  const [{ products }, { stores }, { orders }] = await Promise.all([
    fetchAgentProducts(),
    fetchAgentStores(context.profile.id),
    fetchAgentOrders(context.profile.id)
  ]);

  if (productsSelect) {
    productsSelect.innerHTML = products
      .map((product) => `<option value="${product.id}">${product.name}</option>`)
      .join('');
  }

  if (storesSelect) {
    storesSelect.innerHTML = stores.map((store) => `<option value="${store.id}">${store.name}</option>`).join('');
  }

  const renderOrders = (items) => {
    if (!ordersTableBody) return;
    if (!items.length) {
      ordersTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-6 text-slate-300">Hali buyurtmalar mavjud emas.</td>
        </tr>
      `;
      return;
    }

    ordersTableBody.innerHTML = items
      .map((order) => {
        const productName = order.productName ?? order.products?.name ?? 'Mahsulot';
        const storeName = order.storeName ?? order.stores?.name ?? "Noma'lum do'kon";
        const createdRaw = order.created_at ?? order.createdAt;
        return `
          <tr>
            <td>${productName}</td>
            <td>${storeName}</td>
            <td class="text-center">${order.quantity ?? 0}</td>
            <td class="text-right">${createdRaw ? formatDate(createdRaw) : '--'}</td>
          </tr>
        `;
      })
      .join('');
  };

  renderOrders(orders);

  cancelButton?.addEventListener('click', () => {
    addOrderForm?.reset();
    formWrapper?.classList.remove('is-open');
  });

  addOrderForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      userId: context.profile.id,
      productId: productsSelect.value,
      storeId: storesSelect.value,
      quantity: Number(quantityInput.value || 0)
    };

    try {
      await createAgentOrder(payload);
      showToast('Buyurtma muvaffaqiyatli qo\'shildi.', 'success');
      quantityInput.value = '1';
      formWrapper?.classList.remove('is-open');
      const { orders: updatedOrders } = await fetchAgentOrders(context.profile.id);
      renderOrders(updatedOrders);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

async function initStoresPage(context) {
  const storeList = document.getElementById('agent-stores-list');
  const storeForm = document.getElementById('agent-store-form');
  const formWrapper = document.getElementById('agent-store-form-wrapper');
  const cancelButton = document.getElementById('agent-store-cancel');
  if (!storeList || !storeForm) return;

  const { stores } = await fetchAgentStores(context.profile.id);

  const renderCards = (items) => {
    if (!items.length) {
      renderEmptyState(storeList, 'Hali do\'konlar qo\'shilmagan.');
      return;
    }

    storeList.innerHTML = items
      .map(
        (store) => `
        <article class="picco-tile" data-store-id="${store.id}">
          <span class="picco-tile__icon material-icons">storefront</span>
          <div class="picco-tile__body">
            <h3>${store.name}</h3>
            <p class="picco-tile__meta">${store.phone ?? 'Telefon mavjud emas'}</p>
            <p class="picco-tile__meta">${store.address ?? 'Manzil kiritilmagan'}</p>
          </div>
        </article>
      `
      )
      .join('');
  };

  renderCards(stores);

  cancelButton?.addEventListener('click', () => {
    storeForm.reset();
    formWrapper?.classList.remove('is-open');
  });

  storeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(storeForm);
    const payload = {
      agentId: context.profile.id,
      name: formData.get('name'),
      phone: formData.get('phone'),
      address: formData.get('address')
    };

    try {
      await createAgentStore(payload);
      showToast('Do\'kon qo\'shildi', 'success');
      storeForm.reset();
      formWrapper?.classList.remove('is-open');
      const { stores: updatedStores } = await fetchAgentStores(context.profile.id);
      renderCards(updatedStores);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

async function initStatsPage(context) {
  const rangeButtons = document.querySelectorAll('[data-range]');
  const revenueEl = document.getElementById('agent-stats-revenue');
  const ordersEl = document.getElementById('agent-stats-orders');
  const storesEl = document.getElementById('agent-stats-stores');
  const growthEl = document.getElementById('agent-stats-growth');
  const monthlyCanvas = document.getElementById('agent-stats-monthly');
  const productsCanvas = document.getElementById('agent-stats-products');
  const storesCanvas = document.getElementById('agent-stats-stores-chart');

  const { orders = [], monthly = [] } = await fetchAgentStats(context.profile.id);
  const allOrders = orders.length ? orders : [];

  let activeRange = 'month';
  let monthlyChart = null;
  let productsChart = null;
  let storesChart = null;

  const updateStats = (range) => {
    activeRange = range;
    setActiveRangeButtons(rangeButtons, range);

    const filtered = filterOrdersByRange(allOrders, range);
    const previous = filterOrdersByBounds(allOrders, getPreviousRangeBounds(range));
    const summary = aggregateOrders(filtered);
    const previousSummary = aggregateOrders(previous);

    revenueEl.textContent = formatCurrency(summary.totalRevenue);
    ordersEl.textContent = summary.totalQuantity;
    storesEl.textContent = summary.uniqueStores;
    growthEl.textContent = calculateGrowth(summary.totalRevenue, previousSummary.totalRevenue);

    const lineLabels = summary.chartLabels.length ? summary.chartLabels : monthly.map((item) => item.month);
    const lineData = summary.chartData.length ? summary.chartData : monthly.map((item) => item.totalRevenue ?? 0);

    if (monthlyCanvas && window.Chart) {
      if (!monthlyChart) {
        monthlyChart = new window.Chart(monthlyCanvas.getContext('2d'), {
          type: 'line',
          data: {
            labels: lineLabels,
            datasets: [
              {
                label: 'Tushum',
                data: lineData,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.25)',
                tension: 0.4,
                fill: true
              }
            ]
          },
          options: {
            plugins: { legend: { display: false } },
            scales: {
              y: {
                ticks: {
                  callback: (value) => formatCurrency(value)
                }
              }
            }
          }
        });
      } else {
        monthlyChart.data.labels = lineLabels;
        monthlyChart.data.datasets[0].data = lineData;
        monthlyChart.update();
      }
    }

    const productLabels = summary.productSeries.map(([label]) => label);
    const productData = summary.productSeries.map(([, value]) => value);

    if (productsCanvas && window.Chart) {
      if (!productsChart) {
        productsChart = new window.Chart(productsCanvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: productLabels,
            datasets: [
              {
                label: 'Tushum',
                data: productData,
                backgroundColor: ['#38bdf8', '#2563eb', '#0ea5e9', '#a855f7', '#f97316']
              }
            ]
          },
          options: {
            plugins: { legend: { position: 'bottom' } }
          }
        });
      } else {
        productsChart.data.labels = productLabels;
        productsChart.data.datasets[0].data = productData;
        productsChart.update();
      }
    }

    const storeLabels = summary.storeSeries.map(([label]) => label);
    const storeData = summary.storeSeries.map(([, value]) => value);

    if (storesCanvas && window.Chart) {
      if (!storesChart) {
        storesChart = new window.Chart(storesCanvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels: storeLabels,
            datasets: [
              {
                label: 'Tushum',
                data: storeData,
                backgroundColor: '#2563eb'
              }
            ]
          },
          options: {
            plugins: { legend: { display: false } },
            scales: {
              y: {
                ticks: {
                  callback: (value) => formatCurrency(value)
                }
              }
            }
          }
        });
      } else {
        storesChart.data.labels = storeLabels;
        storesChart.data.datasets[0].data = storeData;
        storesChart.update();
      }
    }
  };

  rangeButtons.forEach((button) => button.addEventListener('click', () => updateStats(button.dataset.range)));
  updateStats(activeRange);
}

async function main() {
  try {
    if (page !== 'agent-login') {
      setupAgentShell();
      initCollapsibles();
    }

    const context = await resolveAgentContext();

    switch (page) {
      case 'agent-dashboard':
        await initDashboardPage(context);
        break;
      case 'agent-orders':
        await initOrdersPage(context);
        break;
      case 'agent-stores':
        await initStoresPage(context);
        break;
      case 'agent-stats':
        await initStatsPage(context);
        break;
      default:
        break;
    }
  } catch (error) {
    const fallback = document.getElementById('agent-fallback');
    if (fallback) {
      fallback.innerHTML = `
        <div class="picco-surface">
          <h2 class="text-lg font-semibold text-red-200 mb-2">Xatolik</h2>
          <p class="text-sm text-red-100">${error.message}</p>
          <p class="mt-2 text-sm text-red-200">Iltimos, avval Telegram bot orqali ro'yxatdan o'ting.</p>
        </div>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', main);
