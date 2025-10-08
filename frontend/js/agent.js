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
  return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(value);
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

async function initDashboardPage(context) {
  const welcome = document.getElementById('agent-welcome');
  const ordersEl = document.getElementById('agent-orders-count');
  const revenueEl = document.getElementById('agent-revenue-total');
  const recentList = document.getElementById('agent-recent-orders');

  if (welcome) {
    welcome.textContent = `Salom, ${context.profile.name}!`;
  }

  const { totals, recentOrders } = await fetchAgentStats(context.profile.id);
  if (ordersEl) ordersEl.textContent = totals.totalQuantity ?? 0;
  if (revenueEl) revenueEl.textContent = formatCurrency(totals.totalRevenue ?? 0);

  if (recentList) {
    if (!recentOrders.length) {
      renderEmptyState(recentList, 'Hali buyurtmalar mavjud emas.');
      return;
    }

    recentList.innerHTML = recentOrders
      .map((order) => `
        <li class="flex items-center justify-between border-b border-gray-200 py-3">
          <div>
            <p class="font-medium text-gray-900">${order.products?.name ?? 'Mahsulot'}</p>
            <p class="text-sm text-gray-500">${formatDate(order.created_at)}</p>
          </div>
          <div class="text-right">
            <p class="font-semibold text-gray-900">x${order.quantity}</p>
          </div>
        </li>
      `)
      .join('');
  }
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
      .map((product) => `<option value="${product.id}">${product.name} — ${formatCurrency(product.price)}</option>`)
      .join('');
  }

  if (storesSelect) {
    storesSelect.innerHTML = stores
      .map((store) => `<option value="${store.id}">${store.name}</option>`)
      .join('');
  }

  const renderOrderRow = (order) => `
    <tr class="border-b border-gray-200">
      <td class="px-3 py-2">${order.products?.name ?? 'Mahsulot'}</td>
      <td class="px-3 py-2">${order.stores?.name ?? 'Do\'kon'}</td>
      <td class="px-3 py-2 text-center font-semibold">${order.quantity}</td>
      <td class="px-3 py-2 text-right text-sm text-gray-500">${formatDate(order.created_at)}</td>
    </tr>
  `;

  if (ordersTableBody) {
    if (!orders.length) {
      ordersTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="px-3 py-4 text-center text-gray-500">Hali buyurtmalar mavjud emas.</td>
        </tr>
      `;
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
      .map((store) => `
        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 class="text-lg font-semibold text-gray-900">${store.name}</h3>
          <p class="text-sm text-gray-500 mt-1">${store.address ?? 'Manzil ko\'rsatilmagan'}</p>
          <p class="text-sm text-gray-500 mt-1">${store.phone ?? 'Telefon: -'}</p>
        </div>
      `)
      .join('');
  };

  if (storeList) {
    renderCards(stores);
  }

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
  const statsSummary = document.getElementById('agent-stats-summary');
  const statsChartCanvas = document.getElementById('agent-stats-chart');
  const chartLib = window.Chart;

  const { totals, monthly } = await fetchAgentStats(context.profile.id);

  if (statsSummary) {
    statsSummary.innerHTML = `
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500">Jami buyurtmalar</p>
          <p class="text-2xl font-semibold text-gray-900 mt-2">${totals.totalQuantity}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500">Umumiy tushum</p>
          <p class="text-2xl font-semibold text-gray-900 mt-2">${formatCurrency(totals.totalRevenue)}</p>
        </div>
      </div>
    `;
  }

  if (statsChartCanvas && chartLib) {
    const labels = monthly.map((item) => item.month);
    const data = monthly.map((item) => item.totalRevenue);

    new chartLib(statsChartCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Oylik tushum',
            data,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            ticks: {
              callback: (value) => formatCurrency(value)
            }
          }
        }
      }
    });
  }
}

async function main() {
  try {
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
          <p class="mt-2 text-sm text-red-600">Iltimos, avval Telegram bot orqali ro\'yxatdan o\'ting.</p>
        </div>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', main);
