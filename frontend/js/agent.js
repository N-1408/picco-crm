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

function initAgentShell() {
  const menu = document.querySelector('[data-menu]');
  const toggle = document.querySelector('[data-menu-toggle]');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('is-open');
      toggle.classList.toggle('is-open');
    });
  }

  const navLinks = document.querySelectorAll('[data-nav-link]');
  navLinks.forEach((link) => {
    if (link.dataset.navLink === page) {
      link.classList.add('is-active');
    }
    link.addEventListener('click', () => {
      if (window.innerWidth < 640) {
        menu?.classList.remove('is-open');
        toggle?.classList.remove('is-open');
      }
    });
  });

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
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

function formatCurrency(value) {
  return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(value ?? 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

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
    const timestamp = new Date(order.created_at).getTime();
    return Number.isFinite(timestamp) && timestamp >= startTime && timestamp <= endTime;
  });
}

function filterOrdersByRange(orders, range) {
  const bounds = getRangeBounds(range);
  return filterOrdersByBounds(orders, bounds);
}

function aggregateOrders(orders) {
  const chartMap = new Map();
  const storeMap = new Map();
  const productMap = new Map();
  const sorted = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  let totalQuantity = 0;
  let totalRevenue = 0;

  sorted.forEach((order) => {
    const created = new Date(order.created_at);
    const revenue = order.quantity * (order.products?.price ?? 0);
    const chartKey = created.toISOString().split('T')[0];

    totalQuantity += order.quantity;
    totalRevenue += revenue;

    chartMap.set(chartKey, (chartMap.get(chartKey) ?? 0) + revenue);

    const storeName = order.stores?.name ?? "Noma'lum do'kon";
    storeMap.set(storeName, (storeMap.get(storeName) ?? 0) + revenue);

    const productName = order.products?.name ?? 'Mahsulot';
    productMap.set(productName, (productMap.get(productName) ?? 0) + revenue);
  });

  const chartEntries = Array.from(chartMap.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const chartLabels = chartEntries.map(([label]) => label);
  const chartData = chartEntries.map(([, value]) => value);

  return {
    totalQuantity,
    totalRevenue,
    lastOrder: sorted[0]?.created_at ?? null,
    chartLabels,
    chartData,
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
  return ${change >= 0 ? '+' : ''}%;
}

function setActiveRangeButtons(buttons, active) {
  buttons.forEach((button) => {
    if (button.dataset.range === active) {
      button.classList.remove('picco-btn--ghost');
      button.classList.add('picco-btn--primary');
    } else {
      button.classList.remove('picco-btn--primary');
      button.classList.add('picco-btn--ghost');
    }
  });
}

function renderRecentOrders(container, orders) {
  if (!orders.length) {
    renderEmptyState(container, 'Hali buyurtmalar mavjud emas.');
    return;
  }

  container.innerHTML = orders
    .slice(0, 5)
    .map((order) => 
      <li class="picco-list__item">
        <div class="flex items-center gap-3">
          <span class="picco-list__icon">
            <i data-lucide="package" aria-hidden="true"></i>
          </span>
          <div>
            <p class="font-semibold text-slate-800"></p>
            <p class="picco-list__meta"></p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-semibold text-slate-800">x</p>
          <p class="picco-list__meta"></p>
        </div>
      </li>
    )
    .join('');

  window.lucide?.createIcons();
}

async function initDashboardPage(context) {
  const ordersEl = document.getElementById('agent-orders-count');
  const revenueEl = document.getElementById('agent-revenue-total');
  const lastOrderEl = document.getElementById('agent-last-order');
  const goalEl = document.getElementById('agent-goal');
  const recentList = document.getElementById('agent-recent-orders');
  const chartCanvas = document.getElementById('agent-dashboard-chart');
  const rangeButtons = document.querySelectorAll('[data-range]');

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

    if (chartCanvas) {
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
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.22)'
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

    window.lucide?.createIcons();
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

  const [{ products }, { stores }, { orders }] = await Promise.all([
    fetchAgentProducts(),
    fetchAgentStores(context.profile.id),
    fetchAgentOrders(context.profile.id)
  ]);

  if (productsSelect) {
    productsSelect.innerHTML = products
      .map((product) => <option value=""> — </option>)
      .join('');
  }

  if (storesSelect) {
    storesSelect.innerHTML = stores.map((store) => <option value=""></option>).join('');
  }

  const renderOrderRow = (order) => 
    <tr>
      <td></td>
      <td></td>
      <td class="text-center"></td>
      <td class="text-right"></td>
    </tr>
  ;

  if (ordersTableBody) {
    if (!orders.length) {
      ordersTableBody.innerHTML = 
        <tr>
          <td colspan="4" class="text-center py-6 text-slate-500">Hali buyurtmalar mavjud emas.</td>
        </tr>
      ;
    } else {
      ordersTableBody.innerHTML = orders.map(renderOrderRow).join('');
    }
  }

  if (addOrderForm) {
    addOrderForm.addEventListener('submit', async (event) => {
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

        const { orders: updatedOrders } = await fetchAgentOrders(context.profile.id);
        ordersTableBody.innerHTML = updatedOrders.map(renderOrderRow).join('');
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }
}

async function initStoresPage(context) {
  const storeList = document.getElementById('agent-stores-list');
  const storeForm = document.getElementById('agent-store-form');

  const { stores } = await fetchAgentStores(context.profile.id);

  const renderCards = (items) => {
    if (!items.length) {
      renderEmptyState(storeList, 'Hali do\'konlar qo\'shilmagan.');
      return;
    }

    storeList.innerHTML = items
      .map((store) => 
        <article class="picco-tile" data-store-id="">
          <div class="picco-tile__icon">
            <i data-lucide="store" aria-hidden="true"></i>
          </div>
          <div class="picco-tile__body">
            <h3></h3>
            <p class="picco-tile__meta"></p>
            <p class="picco-tile__meta"></p>
          </div>
        </article>
      )
      .join('');

    window.lucide?.createIcons();
  };

  renderCards(stores);

  if (storeForm) {
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
        const { stores: updatedStores } = await fetchAgentStores(context.profile.id);
        renderCards(updatedStores);
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }
}

async function initStatsPage(context) {
  const revenueEl = document.getElementById('agent-stats-revenue');
  const ordersEl = document.getElementById('agent-stats-orders');
  const storesEl = document.getElementById('agent-stats-stores');
  const growthEl = document.getElementById('agent-stats-growth');
  const monthlyCanvas = document.getElementById('agent-stats-monthly');
  const productsCanvas = document.getElementById('agent-stats-products');
  const storesCanvas = document.getElementById('agent-stats-stores-chart');
  const rangeButtons = document.querySelectorAll('[data-range]');

  const { orders = [], monthly = [] } = await fetchAgentStats(context.profile.id);
  const allOrders = orders;

  let monthlyChart = null;
  let productsChart = null;
  let storesChart = null;
  let activeRange = 'month';

  const updateStats = (range) => {
    activeRange = range;
    setActiveRangeButtons(rangeButtons, range);

    const filtered = filterOrdersByRange(allOrders, range);
    const summary = aggregateOrders(filtered);
    const previousSummary = aggregateOrders(filterOrdersByBounds(allOrders, getPreviousRangeBounds(range)));

    revenueEl.textContent = formatCurrency(summary.totalRevenue);
    ordersEl.textContent = summary.totalQuantity;
    storesEl.textContent = summary.uniqueStores;
    growthEl.textContent = calculateGrowth(summary.totalRevenue, previousSummary.totalRevenue);

    const lineLabels = summary.chartLabels.length ? summary.chartLabels : monthly.map((item) => item.month);
    const lineData = summary.chartData.length ? summary.chartData : monthly.map((item) => item.totalRevenue ?? 0);

    const productLabels = summary.productSeries.map(([label]) => label);
    const productData = summary.productSeries.map(([, value]) => value);

    const storeLabels = summary.storeSeries.map(([label]) => label);
    const storeData = summary.storeSeries.map(([, value]) => value);

    if (monthlyCanvas) {
      if (!monthlyChart) {
        monthlyChart = new window.Chart(monthlyCanvas.getContext('2d'), {
          type: 'line',
          data: {
            labels: lineLabels,
            datasets: [
              {
                label: 'Tushum',
                data: lineData,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.2)',
                tension: 0.45,
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

    if (productsCanvas) {
      if (!productsChart) {
        productsChart = new window.Chart(productsCanvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: productLabels,
            datasets: [
              {
                label: 'Tushum',
                data: productData,
                backgroundColor: ['#2563eb', '#0ea5e9', '#22d3ee', '#1d4ed8', '#0284c7']
              }
            ]
          },
          options: {
            plugins: {
              legend: {
                position: 'bottom'
              }
            }
          }
        });
      } else {
        productsChart.data.labels = productLabels;
        productsChart.data.datasets[0].data = productData;
        productsChart.update();
      }
    }

    if (storesCanvas) {
      if (!storesChart) {
        storesChart = new window.Chart(storesCanvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels: storeLabels,
            datasets: [
              {
                label: 'Tushum',
                data: storeData,
                backgroundColor: '#1e3a8a'
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

    window.lucide?.createIcons();
  };

  rangeButtons.forEach((button) => {
    button.addEventListener('click', () => updateStats(button.dataset.range));
  });

  updateStats(activeRange);
}

async function main() {
  try {
    if (page !== 'agent-login') {
      initAgentShell();
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
        <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          <h2 class="font-semibold mb-2">Xatolik</h2>
          <p>${error.message}</p>
          <p class="mt-2 text-sm text-red-600">Iltimos, avval Telegram bot orqali ro'yxatdan o'ting.</p>
        </div>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', main);

