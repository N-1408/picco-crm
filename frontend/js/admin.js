import {
  loginAdmin,
  fetchAdminStats,
  fetchAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  fetchAdminStores,
  createAdminStore,
  updateAdminStore,
  deleteAdminStore,
  fetchAdminAgents,
  addAdmin,
  changeAdminPassword,
  resetPlatform,
  exportAdminStats,
  setAdminToken,
  clearAdminToken
} from './api.js';
import { showToast, renderEmptyState } from './ui.js';

const page = document.body.dataset.page;

function ensureAuthenticated() {
  const token = localStorage.getItem('picco_admin_token');
  if (!token) {
    window.location.href = '/pages/admin/login.html';
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(value ?? 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));
}

async function initLoginPage() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      username: formData.get('username'),
      password: formData.get('password')
    };

    try {
      const { token } = await loginAdmin(payload);
      setAdminToken(token);
      showToast('Tizimga kirildi', 'success');
      window.location.href = '/pages/admin/dashboard.html';
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

async function initAdminDashboard() {
  ensureAuthenticated();

  const overviewEl = document.getElementById('admin-dashboard-overview');
  const topAgentsEl = document.getElementById('admin-top-agents');

  const { agentSales, productShare, monthlySales } = await fetchAdminStats();

  if (overviewEl) {
    const totalRevenue = agentSales.reduce((sum, agent) => sum + (agent.totalRevenue ?? 0), 0);
    const totalQuantity = productShare.reduce((sum, item) => sum + (item.totalQuantity ?? 0), 0);
    overviewEl.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500">Umumiy tushum</p>
          <p class="text-2xl font-semibold text-gray-900 mt-2">${formatCurrency(totalRevenue)}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500">Jami buyurtmalar</p>
          <p class="text-2xl font-semibold text-gray-900 mt-2">${totalQuantity}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500">Faol agentlar</p>
          <p class="text-2xl font-semibold text-gray-900 mt-2">${agentSales.length}</p>
        </div>
      </div>
    `;
  }

  if (topAgentsEl) {
    if (!agentSales.length) {
      renderEmptyState(topAgentsEl, 'Hali statistik ma\'lumotlar mavjud emas.');
      return;
    }
    topAgentsEl.innerHTML = agentSales
      .slice(0, 5)
      .map((agent) => `
        <div class="flex items-center justify-between border-b border-gray-200 py-3">
          <div>
            <p class="font-medium text-gray-900">${agent.agentName ?? 'Agent'}</p>
            <p class="text-sm text-gray-500">${agent.totalQuantity} ta buyurtma</p>
          </div>
          <span class="text-sm font-semibold text-emerald-600">${formatCurrency(agent.totalRevenue)}</span>
        </div>
      `)
      .join('');
  }
}

function bindLogout() {
  const logoutButtons = document.querySelectorAll('[data-action="logout"]');
  logoutButtons.forEach((button) => {
    button.addEventListener('click', () => {
      clearAdminToken();
      window.location.href = '/pages/admin/login.html';
    });
  });
}

async function initProductsPage() {
  ensureAuthenticated();
  bindLogout();

  const form = document.getElementById('product-form');
  const tableBody = document.getElementById('products-table-body');
  const formTitle = document.getElementById('product-form-title');
  let editingProductId = null;

  const renderProducts = (products) => {
    if (!products.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-3 py-4 text-center text-gray-500">Mahsulotlar mavjud emas.</td>
        </tr>
      `;
      return;
    }
    tableBody.innerHTML = products
      .map((product) => `
        <tr class="border-b border-gray-200">
          <td class="px-3 py-2 font-medium text-gray-900">${product.name}</td>
          <td class="px-3 py-2 text-sm text-gray-500">${product.description ?? '-'}</td>
          <td class="px-3 py-2 text-right">${formatCurrency(product.price)}</td>
          <td class="px-3 py-2 text-center">${product.stock ?? 0}</td>
          <td class="px-3 py-2 text-right space-x-2">
            <button class="text-emerald-600 text-sm" data-action="edit" data-id="${product.id}">Tahrirlash</button>
            <button class="text-red-600 text-sm" data-action="delete" data-id="${product.id}">O\'chirish</button>
          </td>
        </tr>
      `)
      .join('');
  };

  async function refresh() {
    const { products } = await fetchAdminProducts();
    renderProducts(products);
  }

  tableBody.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.id;

    if (target.dataset.action === 'edit') {
      editingProductId = id;
      const row = target.closest('tr');
      const [nameCell, descCell, priceCell, stockCell] = row.querySelectorAll('td');
      form.name.value = nameCell.textContent.trim();
      form.description.value = descCell.textContent.trim() === '-' ? '' : descCell.textContent.trim();
      form.price.value = priceCell.textContent.replace(/\D/g, '');
      form.stock.value = stockCell.textContent.trim();
      formTitle.textContent = 'Mahsulotni tahrirlash';
    }

    if (target.dataset.action === 'delete') {
      if (confirm('Mahsulotni o\'chirishni tasdiqlaysizmi?')) {
        try {
          await deleteAdminProduct(id);
          showToast('Mahsulot o\'chirildi', 'success');
          refresh();
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: Number(formData.get('price') || 0),
      stock: Number(formData.get('stock') || 0)
    };

    try {
      if (editingProductId) {
        await updateAdminProduct(editingProductId, payload);
        showToast('Mahsulot yangilandi', 'success');
      } else {
        await createAdminProduct(payload);
        showToast('Mahsulot qo\'shildi', 'success');
      }
      editingProductId = null;
      formTitle.textContent = 'Yangi mahsulot qo\'shish';
      form.reset();
      refresh();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  document.getElementById('product-form-cancel')?.addEventListener('click', () => {
    editingProductId = null;
    form.reset();
    formTitle.textContent = 'Yangi mahsulot qo\'shish';
  });

  refresh();
}

async function initStoresPage() {
  ensureAuthenticated();
  bindLogout();

  const storeList = document.getElementById('admin-stores-list');
  const form = document.getElementById('store-form');
  const submitButton = document.getElementById('store-submit');

  let editingStoreId = null;

  const renderStores = (stores) => {
    if (!stores.length) {
      renderEmptyState(storeList, 'Do\'konlar ro\'yxati bo\'sh.');
      return;
    }
    storeList.innerHTML = stores
      .map((store) => `
        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex justify-between items-start gap-4" data-store-id="${store.id}">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">${store.name}</h3>
            <p class="text-sm text-gray-500 mt-1">${store.address ?? 'Manzil ko\'rsatilmagan'}</p>
            <p class="text-sm text-gray-500 mt-1">${store.phone ?? 'Telefon: -'}</p>
            <p class="text-xs text-gray-400 mt-2">Biriktirilgan agent: ${store.users?.name ?? '—'}</p>
          </div>
          <div class="flex gap-3 text-sm">
            <button class="text-emerald-600" data-action="edit" data-id="${store.id}">Tahrirlash</button>
            <button class="text-red-600" data-action="delete" data-id="${store.id}">O\'chirish</button>
          </div>
        </div>
      `)
      .join('');
  };

  async function refresh() {
    const { stores } = await fetchAdminStores();
    renderStores(stores);
  }

  storeList.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.id;
    if (!id) return;

    if (target.dataset.action === 'edit') {
      editingStoreId = id;
      const card = target.closest('[data-store-id]');
      form.name.value = card.querySelector('h3').textContent.trim();
      const info = card.querySelectorAll('p');
      form.address.value = info[0]?.textContent.trim();
      form.phone.value = info[1]?.textContent.replace('Telefon: ', '').trim();
      submitButton.textContent = 'Saqlash';
    }

    if (target.dataset.action === 'delete') {
      if (confirm('Do\'konni o\'chirishni xohlaysizmi?')) {
        try {
          await deleteAdminStore(id);
          showToast('Do\'kon o\'chirildi', 'success');
          refresh();
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      address: formData.get('address')
    };

    try {
      if (editingStoreId) {
        await updateAdminStore(editingStoreId, payload);
        showToast('Do\'kon yangilandi', 'success');
      } else {
        await createAdminStore(payload);
        showToast('Do\'kon qo\'shildi', 'success');
      }
      editingStoreId = null;
      submitButton.textContent = 'Qo\'shish';
      form.reset();
      refresh();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  refresh();
}

async function initAgentsPage() {
  ensureAuthenticated();
  bindLogout();

  const tableBody = document.getElementById('agents-table-body');
  const { agents } = await fetchAdminAgents();

  if (!agents.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-3 py-4 text-center text-gray-500">Agentlar hali qo\'shilmagan.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = agents
    .map((agent) => `
      <tr class="border-b border-gray-200">
        <td class="px-3 py-2 font-medium text-gray-900">${agent.name}</td>
        <td class="px-3 py-2 text-sm text-gray-500">${agent.phone}</td>
        <td class="px-3 py-2 text-sm text-gray-500">${agent.telegram_id}</td>
        <td class="px-3 py-2 text-sm text-gray-500">${formatDate(agent.created_at)}</td>
        <td class="px-3 py-2 text-right">
          <span class="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold">
            ${formatCurrency(agent.stats.totalRevenue)}
          </span>
        </td>
      </tr>
    `)
    .join('');
}

async function initStatsPage() {
  ensureAuthenticated();
  bindLogout();

  const chartLib = window.Chart;
  const agentCtx = document.getElementById('stats-agent-chart');
  const productCtx = document.getElementById('stats-product-chart');
  const monthlyCtx = document.getElementById('stats-monthly-chart');

  const { agentSales, productShare, monthlySales } = await fetchAdminStats();

  if (chartLib && agentCtx) {
    new chartLib(agentCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: agentSales.map((item) => item.agentName),
        datasets: [{
          label: 'Tushum',
          data: agentSales.map((item) => item.totalRevenue),
          backgroundColor: '#6366F1'
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }

  if (chartLib && productCtx) {
    new chartLib(productCtx.getContext('2d'), {
      type: 'pie',
      data: {
        labels: productShare.map((item) => item.productName),
        datasets: [{
          data: productShare.map((item) => item.totalRevenue),
          backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#6366F1', '#EF4444']
        }]
      }
    });
  }

  if (chartLib && monthlyCtx) {
    new chartLib(monthlyCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: monthlySales.map((item) => item.month),
        datasets: [{
          label: 'Oylik tushum',
          data: monthlySales.map((item) => item.totalRevenue),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        plugins: { legend: { display: false } }
      }
    });
  }

  document.querySelectorAll('[data-export]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const format = link.dataset.export ?? 'excel';
      try {
        const result = await exportAdminStats(format);
        if (typeof result === 'string') {
          const blob = new Blob([result], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `picco-stats.${format === 'excel' ? 'csv' : 'txt'}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('Fayl yuklab olindi', 'success');
        } else {
          showToast('PDF eksport prototipda JSON ko\'rinishida qaytariladi', 'info');
          console.table(result.orders ?? []);
        }
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
}

async function initSettingsPage() {
  ensureAuthenticated();
  bindLogout();

  const addAdminForm = document.getElementById('add-admin-form');
  const changePasswordForm = document.getElementById('change-password-form');
  const resetButton = document.getElementById('reset-database-btn');

  addAdminForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(addAdminForm);
    const payload = {
      username: formData.get('username'),
      password: formData.get('password')
    };
    try {
      await addAdmin(payload);
      showToast('Yangi admin qo\'shildi', 'success');
      addAdminForm.reset();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  changePasswordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(changePasswordForm);
    const payload = {
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword')
    };
    try {
      await changeAdminPassword(payload);
      showToast('Parol yangilandi', 'success');
      changePasswordForm.reset();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  resetButton?.addEventListener('click', async () => {
    if (confirm('Barcha ma\'lumotlarni tozalashni tasdiqlaysizmi?')) {
      try {
        await resetPlatform();
        showToast('Ma\'lumotlar tozalandi', 'warning');
      } catch (error) {
        showToast(error.message, 'error');
      }
    }
  });
}

function main() {
  switch (page) {
    case 'admin-login':
      initLoginPage();
      break;
    case 'admin-dashboard':
      initAdminDashboard();
      bindLogout();
      break;
    case 'admin-products':
      initProductsPage();
      break;
    case 'admin-stores':
      initStoresPage();
      break;
    case 'admin-agents':
      initAgentsPage();
      break;
    case 'admin-stats':
      initStatsPage();
      break;
    case 'admin-settings':
      initSettingsPage();
      break;
    default:
      break;
  }
}

document.addEventListener('DOMContentLoaded', main);
