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
const DESKTOP_BREAKPOINT = 1024;

let productCache = [];
let storeCache = [];

const formatCurrency = (value) =>
  new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(value ?? 0);

const formatDate = (value) =>
  new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));

function ensureAuthenticated() {
  const token = localStorage.getItem('picco_admin_token');
  if (!token) {
    window.location.href = '/pages/admin/login.html';
  }
}

function setupShell() {
  const sidebar = document.querySelector('[data-sidebar]');
  if (!sidebar) {
    return;
  }

  if (window.innerWidth >= DESKTOP_BREAKPOINT) {
    sidebar.classList.add('is-open');
  }

  const openers = document.querySelectorAll('[data-sidebar-toggle]');
  const closers = document.querySelectorAll('[data-sidebar-close]');
  const navLinks = document.querySelectorAll('[data-nav-link]');

  openers.forEach((button) => {
    button.addEventListener('click', () => {
      sidebar.classList.add('is-open');
    });
  });

  const closeSidebar = () => {
    if (window.innerWidth < DESKTOP_BREAKPOINT) {
      sidebar.classList.remove('is-open');
    }
  };

  closers.forEach((button) => {
    button.addEventListener('click', () => {
      closeSidebar();
      if (window.history.length > 1) {
        window.history.back();
      }
    });
  });

  navLinks.forEach((link) => {
    if (link.dataset.navLink === page) {
      link.classList.add('is-active');
    }
    link.addEventListener('click', () => {
      closeSidebar();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      sidebar.classList.remove('is-open');
    }
  });
}

function initCollapsibles() {
  document.querySelectorAll('[data-collapse-target]').forEach((trigger) => {
    const targetId = trigger.getAttribute('data-collapse-target');
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;

    trigger.addEventListener('click', () => {
      target.classList.toggle('is-open');
    });
  });
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add('hidden');
  if (!document.querySelector('[data-modal]:not(.hidden)')) {
    document.body.classList.remove('picco-modal-open');
  }
}

function openModalById(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.classList.add('picco-modal-open');
  }
  return modal;
}

function setupModals() {
  document.querySelectorAll('[data-modal]').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  document.querySelectorAll('[data-modal-close]').forEach((button) => {
    button.addEventListener('click', () => {
      const modal = button.closest('[data-modal]');
      if (modal) {
        closeModal(modal);
      }
    });
  });
}

function bindLogout() {
  document.querySelectorAll('[data-action="logout"]').forEach((button) => {
    button.addEventListener('click', () => {
      clearAdminToken();
      window.location.href = '/pages/admin/login.html';
    });
  });
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
  const overviewContainer = document.getElementById('admin-dashboard-overview');
  const topAgentsContainer = document.getElementById('admin-top-agents');
  if (!overviewContainer || !topAgentsContainer) return;

  const { agentSales, productShare, monthlySales } = await fetchAdminStats();

  const totalRevenue = agentSales.reduce((sum, agent) => sum + (agent.totalRevenue ?? 0), 0);
  const totalQuantity = productShare.reduce((sum, item) => sum + (item.totalQuantity ?? 0), 0);

  overviewContainer.innerHTML = `
    <article class="picco-metric">
      <div class="picco-metric__icon"><span class="material-icons">payments</span></div>
      <div>
        <p class="picco-metric__label">Umumiy tushum</p>
        <p class="picco-metric__value">${formatCurrency(totalRevenue)}</p>
      </div>
    </article>
    <article class="picco-metric">
      <div class="picco-metric__icon"><span class="material-icons">inventory_2</span></div>
      <div>
        <p class="picco-metric__label">Jami buyurtmalar</p>
        <p class="picco-metric__value">${totalQuantity}</p>
      </div>
    </article>
    <article class="picco-metric">
      <div class="picco-metric__icon"><span class="material-icons">groups</span></div>
      <div>
        <p class="picco-metric__label">Faol agentlar</p>
        <p class="picco-metric__value">${agentSales.length}</p>
      </div>
    </article>
  `;

  if (!agentSales.length) {
    renderEmptyState(topAgentsContainer, 'Hali statistik ma\'lumotlar mavjud emas.');
  } else {
    topAgentsContainer.innerHTML = agentSales
      .map(
        (agent) => `
        <li class="picco-list__item">
          <div>
            <p class="font-semibold">${agent.agentName}</p>
            <p class="text-sm text-slate-300">${agent.storeCount ?? 0} ta do'kon</p>
          </div>
          <div class="picco-chip">
            <span class="material-icons">payments</span>
            ${formatCurrency(agent.totalRevenue ?? 0)}
          </div>
        </li>
      `
      )
      .join('');
  }

  const chartCanvas = document.getElementById('admin-dashboard-chart');
  if (chartCanvas && window.Chart) {
    const ctx = chartCanvas.getContext('2d');
    const labels = monthlySales.map((item) => item.month);
    const data = monthlySales.map((item) => item.totalRevenue ?? 0);

    new window.Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Tushum',
            data,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.25)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        plugins: { legend: { display: false } }
      }
    });
  }
}

async function initProductsPage() {
  const formWrapper = document.getElementById('product-form-wrapper');
  const productForm = document.getElementById('product-form');
  const cancelButton = document.getElementById('product-form-cancel');
  const tableBody = document.getElementById('products-table-body');
  const editForm = document.getElementById('product-edit-form');
  const editModal = document.getElementById('product-edit-modal');
  const deleteModal = document.getElementById('product-delete-modal');
  const deleteConfirmButton = document.getElementById('product-delete-confirm');

  if (!productForm || !tableBody) return;

  let editingProductId = null;
  let deletingProductId = null;

  const toggleForm = (open) => {
    if (!formWrapper) return;
    if (open) {
      formWrapper.classList.add('is-open');
    } else {
      formWrapper.classList.remove('is-open');
    }
  };

  cancelButton?.addEventListener('click', () => {
    productForm.reset();
    toggleForm(false);
  });

  const renderProducts = (products) => {
    if (!products.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-slate-300">Mahsulotlar hali qo'shilmagan.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = products
      .map(
        (product) => `
        <tr>
          <td>${product.name}</td>
          <td>${product.description ?? '-'}</td>
          <td class="text-right">${formatCurrency(product.price)}</td>
          <td class="text-center">${product.stock ?? 0}</td>
          <td>
            <div class="flex justify-end gap-2">
              <button type="button" class="picco-chip" data-action="edit" data-id="${product.id}">
                <span class="material-icons">edit</span>
                Tahrirlash
              </button>
              <button type="button" class="picco-chip picco-chip--danger" data-action="delete" data-id="${product.id}">
                <span class="material-icons">delete</span>
                O'chirish
              </button>
            </div>
          </td>
        </tr>
      `
      )
      .join('');
  };

  const refresh = async () => {
    const { products } = await fetchAdminProducts();
    productCache = products ?? [];
    renderProducts(productCache);
  };

  tableBody.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!(target instanceof HTMLElement)) return;

    const { id, action } = target.dataset;
    if (!id || !action) return;

    if (action === 'edit') {
      editingProductId = id;
      const product = productCache.find((item) => item.id === id);
      if (!product || !editForm) return;
      editForm.elements.namedItem('id').value = product.id;
      editForm.elements.namedItem('name').value = product.name ?? '';
      editForm.elements.namedItem('description').value = product.description ?? '';
      editForm.elements.namedItem('price').value = product.price ?? 0;
      editForm.elements.namedItem('stock').value = product.stock ?? 0;
      openModalById('product-edit-modal');
    }

    if (action === 'delete') {
      deletingProductId = id;
      openModalById('product-delete-modal');
    }
  });

  productForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(productForm);
    const payload = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: Number(formData.get('price') ?? 0),
      stock: Number(formData.get('stock') ?? 0)
    };

    try {
      await createAdminProduct(payload);
      showToast('Mahsulot qo\'shildi', 'success');
      productForm.reset();
      toggleForm(false);
      refresh();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  editForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!editingProductId) return;
    const formData = new FormData(editForm);
    const payload = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: Number(formData.get('price') ?? 0),
      stock: Number(formData.get('stock') ?? 0)
    };

    try {
      await updateAdminProduct(editingProductId, payload);
      showToast('Mahsulot yangilandi', 'success');
      closeModal(editModal);
      editingProductId = null;
      refresh();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  deleteConfirmButton?.addEventListener('click', async () => {
    if (!deletingProductId) return;
    try {
      await deleteAdminProduct(deletingProductId);
      showToast('Mahsulot o\'chirildi', 'success');
      closeModal(deleteModal);
      deletingProductId = null;
      refresh();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  refresh();
}

async function initStoresPage() {
  const storeList = document.getElementById('admin-stores-list');
  const storeFormWrapper = document.getElementById('store-form-wrapper');
  const storeForm = document.getElementById('store-form');
  const storeCancel = document.getElementById('store-form-cancel');
  const editForm = document.getElementById('store-edit-form');
  const editModal = document.getElementById('store-edit-modal');
  const deleteModal = document.getElementById('store-delete-modal');
  const deleteConfirmButton = document.getElementById('store-delete-confirm');

  if (!storeList || !storeForm) return;

  let editingStoreId = null;
  let deletingStoreId = null;

  const toggleStoreForm = (open) => {
    if (!storeFormWrapper) return;
    storeFormWrapper.classList.toggle('is-open', open);
  };

  storeCancel?.addEventListener('click', () => {
    storeForm.reset();
    toggleStoreForm(false);
  });

  const renderStores = (stores) => {
    if (!stores.length) {
      renderEmptyState(storeList, 'Do\'konlar ro\'yxati bo\'sh.');
      return;
    }

    storeList.innerHTML = stores
      .map(
        (store) => `
        <li class="picco-list__item">
          <div>
            <p class="font-semibold">${store.name}</p>
            <p class="text-sm text-slate-300">${store.phone ?? 'Telefon mavjud emas'}</p>
            <p class="text-sm text-slate-400">${store.address ?? 'Manzil kiritilmagan'}</p>
          </div>
          <div class="picco-tile__actions">
            <button type="button" class="picco-chip" data-action="edit" data-id="${store.id}">
              <span class="material-icons">edit</span>
              Tahrirlash
            </button>
            <button type="button" class="picco-chip picco-chip--danger" data-action="delete" data-id="${store.id}">
              <span class="material-icons">delete</span>
              O'chirish
            </button>
          </div>
        </li>
      `
      )
      .join('');
  };

  const refresh = async () => {
    const { stores } = await fetchAdminStores();
    storeCache = stores ?? [];
    renderStores(storeCache);
  };

  storeList.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!(target instanceof HTMLElement)) return;
    const { id, action } = target.dataset;
    if (!id || !action) return;

    if (action === 'edit') {
      editingStoreId = id;
      const store = storeCache.find((item) => item.id === id);
      if (!store || !editForm) return;
      editForm.elements.namedItem('id').value = store.id;
      editForm.elements.namedItem('name').value = store.name ?? '';
      editForm.elements.namedItem('phone').value = store.phone ?? '';
      editForm.elements.namedItem('address').value = store.address ?? '';
      openModalById('store-edit-modal');
    }

    if (action === 'delete') {
      deletingStoreId = id;
      openModalById('store-delete-modal');
    }
  });

  storeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(storeForm);
    const payload = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      address: formData.get('address')
    };

    try {
      await createAdminStore(payload);
      showToast('Do\'kon qo\'shildi', 'success');
      storeForm.reset();
      toggleStoreForm(false);
      refresh();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  editForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!editingStoreId) return;
    const formData = new FormData(editForm);
    const payload = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      address: formData.get('address')
    };

    try {
      await updateAdminStore(editingStoreId, payload);
      showToast('Do\'kon yangilandi', 'success');
      closeModal(editModal);
      editingStoreId = null;
      refresh();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  deleteConfirmButton?.addEventListener('click', async () => {
    if (!deletingStoreId) return;
    try {
      await deleteAdminStore(deletingStoreId);
      showToast('Do\'kon o\'chirildi', 'success');
      closeModal(deleteModal);
      deletingStoreId = null;
      refresh();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  refresh();
}

async function initAgentsPage() {
  const tableBody = document.getElementById('agents-table-body');
  if (!tableBody) return;

  const { agents } = await fetchAdminAgents();

  if (!agents.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-slate-300">Agentlar hali qo'shilmagan.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = agents
    .map(
      (agent) => `
      <tr>
        <td>${agent.name}</td>
        <td>${agent.phone}</td>
        <td>${agent.telegram_id}</td>
        <td>${formatDate(agent.created_at)}</td>
        <td class="text-right">
          <span class="picco-chip">
            <span class="material-icons">payments</span>
            ${formatCurrency(agent.stats?.totalRevenue ?? 0)}
          </span>
        </td>
      </tr>
    `
    )
    .join('');
}

async function initStatsPage() {
  const chartLib = window.Chart;
  if (!chartLib) return;

  const agentCtx = document.getElementById('stats-agent-chart');
  const productCtx = document.getElementById('stats-product-chart');
  const monthlyCtx = document.getElementById('stats-monthly-chart');

  const { agentSales, productShare, monthlySales } = await fetchAdminStats();

  if (agentCtx) {
    const agentLabels = agentSales.map((item) => item.agentName);
    const agentData = agentSales.map((item) => item.totalRevenue ?? 0);
    new chartLib(agentCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: agentLabels,
        datasets: [
          {
            label: 'Tushum',
            data: agentData,
            backgroundColor: '#38bdf8'
          }
        ]
      },
      options: {
        plugins: { legend: { display: false } }
      }
    });
  }

  if (productCtx) {
    const productLabels = productShare.map((item) => item.productName);
    const productData = productShare.map((item) => item.totalRevenue ?? 0);
    new chartLib(productCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: productLabels,
        datasets: [
          {
            data: productData,
            backgroundColor: ['#38bdf8', '#2563eb', '#0ea5e9', '#c084fc', '#f97316']
          }
        ]
      }
    });
  }

  if (monthlyCtx) {
    const monthlyLabels = monthlySales.map((item) => item.month);
    const monthlyData = monthlySales.map((item) => item.totalRevenue ?? 0);
    new chartLib(monthlyCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: monthlyLabels,
        datasets: [
          {
            label: 'Tushum',
            data: monthlyData,
            borderColor: '#a855f7',
            backgroundColor: 'rgba(168, 85, 247, 0.25)',
            tension: 0.4,
            fill: true
          }
        ]
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

function initSettingsPage() {
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
    if (!confirm('Barcha ma\'lumotlarni tozalashni tasdiqlaysizmi?')) return;
    try {
      await resetPlatform();
      showToast('Ma\'lumotlar tozalandi', 'warning');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

function main() {
  if (page === 'admin-login') {
    initLoginPage();
    return;
  }

  ensureAuthenticated();
  setupShell();
  initCollapsibles();
  setupModals();
  bindLogout();

  switch (page) {
    case 'admin-dashboard':
      initAdminDashboard();
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
