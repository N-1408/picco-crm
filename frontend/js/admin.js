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
import { showToast, renderEmptyState, initBottomNavigation } from './ui.js';\nimport { initTelegram } from './telegram.js';
import { createMap, createMarker, createPopup, parseLatLng, formatLatLng as formatLatLngText, getMapLibre } from './maps.js';

const page = document.body.dataset.page;

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
  initBottomNavigation(page);
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
  const storeList = document.getElementById("admin-stores-list");
  const storeFormWrapper = document.getElementById("store-form-wrapper");
  const storeForm = document.getElementById("store-form");
  const storeCancel = document.getElementById("store-form-cancel");
  const editForm = document.getElementById("store-edit-form");
  const editModal = document.getElementById("store-edit-modal");
  const deleteModal = document.getElementById("store-delete-modal");
  const deleteConfirmButton = document.getElementById("store-delete-confirm");
  const mapContainer = document.getElementById("admin-stores-map");
  const mapEmptyState = document.getElementById("admin-stores-map-empty");

  if (!storeList || !storeForm) return;

  let editingStoreId = null;
  let deletingStoreId = null;
  let storesMap = null;
  let storeMarkers = [];
  let storePopup = null;
  let activeStoreId = null;

  const toggleStoreForm = (open) => {
    if (!storeFormWrapper) return;
    storeFormWrapper.classList.toggle("is-open", open);
  };

  storeCancel?.addEventListener("click", () => {
    storeForm.reset();
    toggleStoreForm(false);
  });

  const resolveLocationMeta = (rawLocation) => {
    if (!rawLocation) return null;
    if (typeof rawLocation === "object") return rawLocation;
    if (typeof rawLocation === "string") {
      try {
        return JSON.parse(rawLocation);
      } catch {
        return null;
      }
    }
    return null;
  };

  const highlightStoreInList = (storeId, { scrollIntoView = false } = {}) => {
    storeList.querySelectorAll(".picco-list__item.is-active").forEach((item) => {
      item.classList.remove("is-active");
    });
    activeStoreId = null;
    if (!storeId) return;
    const target = storeList.querySelector(.picco-list__item[data-store-id=""]);
    if (target) {
      target.classList.add("is-active");
      if (scrollIntoView) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      activeStoreId = storeId;
    }
  };

  const renderStores = (stores) => {
  if (!stores.length) {
    renderEmptyState(storeList, "Do'konlar ro'yxati bo'sh.");
    return;
  }

  storeList.innerHTML = stores
    .map((store) => {
      const locationMeta = resolveLocationMeta(store.location);
      const point = parseLatLng(locationMeta ?? store.location);
      const addressText = locationMeta?.address ?? store.address ?? "Manzil kiritilmagan";
      const coordinatesText = point ? `Koordinata: ${formatLatLngText(point)}` : "Lokatsiya kiritilmagan";

      return `
        <li class="picco-list__item" data-store-id="${store.id}">
          <div class="space-y-1">
            <p class="font-semibold">${store.name}</p>
            <p class="text-sm text-slate-300">${store.phone ?? "Telefon mavjud emas"}</p>
            <p class="text-sm text-slate-400">${addressText}</p>
            <p class="text-xs text-slate-400">${coordinatesText}</p>
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
      `;
    })
    .join("");

  if (activeStoreId) {
    highlightStoreInList(activeStoreId);
  }
};

  const focusStoreOnMap = async (storeId, { scrollIntoView = false } = {}) => {
  if (!storeId) return;
  if (!storesMap) {
    await renderStoreMap(storeCache);
  }
  const target = storeMarkers.find((entry) => entry.storeId === storeId);
  if (!target || !storesMap) return;

  storesMap.flyTo({
    center: [target.coords.lng, target.coords.lat],
    zoom: Math.max(storesMap.getZoom() ?? 12, 14),
    speed: 0.9
  });

  if (!storePopup) {
    storePopup = await createPopup();
  }

  const addressLine = target.address || "Manzil kiritilmagan";
  storePopup
    .setLngLat([target.coords.lng, target.coords.lat])
    .setHTML(`
      <div class="picco-map-popup">
        <strong>${target.name}</strong>
        <span>${addressLine}</span>
        <span>${formatLatLngText(target.coords)}</span>
      </div>
    `)
    .addTo(storesMap);

  highlightStoreInList(storeId, { scrollIntoView });
};

  const renderStoreMap = async (stores) => {
    if (!mapContainer) return;
    const maplibre = await getMapLibre();

    const items = (stores ?? [])
      .map((store) => {
        const locationMeta = resolveLocationMeta(store.location);
        const coords = parseLatLng(locationMeta ?? store.location);
        if (!coords) return null;
        return {
          id: store.id,
          name: store.name,
          coords,
          address: locationMeta?.address ?? store.address ?? ""
        };
      })
      .filter(Boolean);

    if (!items.length) {
      mapEmptyState?.classList.remove("hidden");
      storeMarkers.forEach((entry) => entry.marker.remove());
      storeMarkers = [];
      if (storePopup) {
        storePopup.remove();
        storePopup = null;
      }
      highlightStoreInList(null);
      return;
    }

    mapEmptyState?.classList.add("hidden");

    if (!storesMap) {
      storesMap = await createMap(mapContainer, {
        center: [items[0].coords.lng, items[0].coords.lat],
        zoom: 6
      });
    }

    if (!storePopup) {
      storePopup = await createPopup();
    }

    storeMarkers.forEach((entry) => entry.marker.remove());
    storeMarkers = [];

    const bounds = new maplibre.LngLatBounds();

    for (const item of items) {
      const marker = await createMarker({ color: "#38BDF8" });
      marker.setLngLat([item.coords.lng, item.coords.lat]).addTo(storesMap);
      marker.getElement().addEventListener("click", () => {
        focusStoreOnMap(item.id, { scrollIntoView: true });
      });

      storeMarkers.push({
        storeId: item.id,
        marker,
        coords: item.coords,
        address: item.address,
        name: item.name
      });

      bounds.extend([item.coords.lng, item.coords.lat]);
    }

    if (!bounds.isEmpty()) {
      storesMap.fitBounds(bounds, { padding: 60, maxZoom: 15 });
      if (items.length === 1) {
        storesMap.easeTo({
          center: [items[0].coords.lng, items[0].coords.lat],
          zoom: 14,
          duration: 600
        });
      }
    }

    if (activeStoreId) {
      highlightStoreInList(activeStoreId);
    }
  };

  const refresh = async () => {
    const { stores } = await fetchAdminStores();
    storeCache = stores ?? [];
    renderStores(storeCache);
    await renderStoreMap(storeCache);
  };

  storeList.addEventListener("click", (event) => {
    const actionTarget = event.target.closest("[data-action]");
    if (actionTarget instanceof HTMLElement) {
      const { id, action } = actionTarget.dataset;
      if (!id || !action) return;

      if (action === "edit") {
        editingStoreId = id;
        const store = storeCache.find((item) => item.id === id);
        if (!store || !editForm) return;
        editForm.elements.namedItem("id").value = store.id;
        editForm.elements.namedItem("name").value = store.name ?? "";
        editForm.elements.namedItem("phone").value = store.phone ?? "";
        editForm.elements.namedItem("address").value = store.address ?? "";
        openModalById("store-edit-modal");
      }

      if (action === "delete") {
        deletingStoreId = id;
        openModalById("store-delete-modal");
      }
      return;
    }

    const item = event.target.closest(".picco-list__item");
    if (item instanceof HTMLElement && item.dataset.storeId) {
      focusStoreOnMap(item.dataset.storeId, { scrollIntoView: false });
    }
  });

  storeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(storeForm);
    const payload = {
      name: formData.get("name"),
      phone: formData.get("phone"),
      address: formData.get("address")
    };

    try {
      await createAdminStore(payload);
      showToast("Do'kon qo'shildi", "success");
      storeForm.reset();
      toggleStoreForm(false);
      await refresh();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  editForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editingStoreId) return;
    const formData = new FormData(editForm);
    const payload = {
      name: formData.get("name"),
      phone: formData.get("phone"),
      address: formData.get("address")
    };

    try {
      await updateAdminStore(editingStoreId, payload);
      showToast("Do'kon yangilandi", "success");
      closeModal(editModal);
      editingStoreId = null;
      await refresh();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  deleteConfirmButton?.addEventListener("click", async () => {
    if (!deletingStoreId) return;
    try {
      await deleteAdminStore(deletingStoreId);
      showToast("Do'kon o'chirildi", "success");
      closeModal(deleteModal);
      deletingStoreId = null;
      await refresh();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  await refresh();
}async function initAgentsPage() {
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



