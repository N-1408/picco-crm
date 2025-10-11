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
import { showToast, renderEmptyState, initBottomNavigation } from './ui.js';
import { createMap, createMarker, parseLatLng, formatLatLng as formatLatLngText } from './maps.js';

const page = document.body.dataset.page;

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
    .join(');
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
      .join(');
  }

  if (storesSelect) {
    storesSelect.innerHTML = stores.map((store) => `<option value="${store.id}">${store.name}</option>`).join(');
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
      .join(');
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
  const locationButton = document.getElementById('agent-store-location-btn');
  const locationClearButton = document.getElementById('agent-store-location-clear');
  const locationSummary = document.getElementById('agent-store-location-summary');
  const locationModal = document.getElementById('agent-location-modal');
  const locationMapEl = document.getElementById('agent-location-map');
  const locationSearchInput = document.getElementById('agent-location-search');
  const locationLocateButton = document.getElementById('agent-location-locate');
  const locationConfirmButton = document.getElementById('agent-location-confirm');
  const locationCancelButton = document.getElementById('agent-location-cancel');

  if (!storeList || !storeForm) return;

  const { stores } = await fetchAgentStores(context.profile.id);

  const NOMINATIM_SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
  const NOMINATIM_REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';

  let selectedLocation = null;
  let locationMap = null;
  let locationMarker = null;
  let userPositionMarker = null;
  let mapInitialized = false;
  let reverseLookupController = null;

  const abortReverseLookup = () => {
    if (reverseLookupController) {
      reverseLookupController.abort();
      reverseLookupController = null;
    }
  };

  const updateLocationSummary = () => {
    if (!locationSummary) return;
    if (!selectedLocation) {
      locationSummary.textContent = 'Lokatsiya tanlanmagan';
      return;
    }
    const parts = [];
    if (selectedLocation.address) {
      parts.push(selectedLocation.address);
    }
    parts.push(formatLatLngText(selectedLocation));
    locationSummary.textContent = parts.join(' • ');
  };

  const syncMarker = () => {
    if (!locationMarker || !locationMap) return;
    if (!selectedLocation) {
      locationMarker.remove();
      return;
    }
    locationMarker.setLngLat([selectedLocation.lng, selectedLocation.lat]).addTo(locationMap);
  };

  const lookupAddress = async (lat, lng) => {
    abortReverseLookup();
    const controller = new AbortController();
    reverseLookupController = controller;

    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: lat.toString(),
        lon: lng.toString(),
        zoom: '18',
        addressdetails: '1'
      });
      const response = await fetch(`${NOMINATIM_REVERSE_ENDPOINT}?${params}`, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'uz,en' }
      });
      if (!response.ok) {
        throw new Error('Reverse geocode failed');
      }
      const payload = await response.json();
      if (controller.signal.aborted) return;
      selectedLocation = {
        ...selectedLocation,
        address: payload.display_name ?? selectedLocation?.address ?? '
      };
      updateLocationSummary();
    } catch (error) {
      if (!controller.signal.aborted) {
        // ignore lookup errors silently
      }
    } finally {
      if (!controller.signal.aborted) {
        reverseLookupController = null;
      }
    }
  };

  const setSelectedLocation = (value, { skipReverseLookup = false } = {}) => {
    if (!value) {
      selectedLocation = null;
      abortReverseLookup();
      syncMarker();
      updateLocationSummary();
      return;
    }
    const lat = Number(value.lat);
    const lng = Number(value.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }
    const address = value.address?.trim() || selectedLocation?.address || ';
    selectedLocation = { lat, lng, address };
    syncMarker();
    updateLocationSummary();
    if (locationMap) {
      locationMap.flyTo({ center: [lng, lat], zoom: Math.max(locationMap.getZoom() ?? 12, 14), speed: 0.8 });
    }
    if (!skipReverseLookup) {
      lookupAddress(lat, lng);
    }
  };

  const resetLocationState = () => {
    selectedLocation = null;
    abortReverseLookup();
    if (locationSearchInput) {
      locationSearchInput.value = ';
    }
    syncMarker();
    updateLocationSummary();
  };

  const locateUser = async () => {
    if (!navigator.geolocation) {
      showToast('Geolokatsiya qurilmada mavjud emas.', 'warning');
      return;
    }
    try {
      await ensureMapReady();
    } catch (error) {
      showToast(error.message, 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        if (!userPositionMarker) {
          userPositionMarker = await createMarker({ color: '#34D399' });
        }
        if (locationMap) {
          userPositionMarker.setLngLat([coords.lng, coords.lat]).addTo(locationMap);
          locationMap.flyTo({ center: [coords.lng, coords.lat], zoom: 15, speed: 0.9 });
        }
        showToast('Joriy joylashuv topildi.', 'info');
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Joylashuvga ruxsat berilmadi.'
            : 'Joylashuvni aniqlab bo'lmadi.';
        showToast(message, 'warning');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const closeLocationModal = () => {
    if (!locationModal) return;
    locationModal.classList.add('hidden');
    document.body.classList.remove('picco-modal-open');
    abortReverseLookup();
  };

  const ensureMapReady = async () => {
    if (!locationMapEl) return;
    const initial = selectedLocation ?? { lat: 41.3111, lng: 69.2797 };
    const initialCenter = [initial.lng, initial.lat];

    if (!mapInitialized) {
      locationMap = await createMap(locationMapEl, {
        center: initialCenter,
        zoom: selectedLocation ? 15 : 12
      });

      locationMarker = await createMarker({ color: '#6366F1', draggable: true });
      locationMarker.on('dragend', () => {
        const lngLat = locationMarker.getLngLat();
        setSelectedLocation({ lat: lngLat.lat, lng: lngLat.lng });
      });

      locationMap.on('click', (event) => {
        const { lat, lng } = event.lngLat;
        setSelectedLocation({ lat, lng });
        showToast('Lokatsiya tanlandi.', 'info');
      });

      mapInitialized = true;
    }

    if (locationMap) {
      locationMap.resize();
      if (selectedLocation) {
        locationMap.jumpTo({ center: [selectedLocation.lng, selectedLocation.lat], zoom: Math.max(locationMap.getZoom() ?? 12, 14) });
      }
      syncMarker();
      setTimeout(() => locationMap.resize(), 150);
    }
  };

  const openLocationModal = async () => {
    if (!locationModal) return;
    locationModal.classList.remove('hidden');
    document.body.classList.add('picco-modal-open');
    if (locationSearchInput) {
      locationSearchInput.value = selectedLocation?.address ?? ';
    }
    try {
      await ensureMapReady();
    } catch (error) {
      closeLocationModal();
      showToast(error.message, 'error');
    }
  };

  const searchLocation = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      await ensureMapReady();
      const params = new URLSearchParams({
        q: trimmed,
        format: 'json',
        limit: '1'
      });
      const response = await fetch(`${NOMINATIM_SEARCH_ENDPOINT}?${params}`, {
        headers: { 'Accept-Language': 'uz,en' }
      });
      if (!response.ok) {
        throw new Error('Geocode request failed');
      }
      const results = await response.json();
      if (!Array.isArray(results) || !results.length) {
        showToast('Natija topilmadi.', 'warning');
        return;
      }
      const [result] = results;
      const lat = Number(result.lat);
      const lng = Number(result.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        showToast('Natija noto'g'ri koordinatalarga ega.', 'warning');
        return;
      }
      setSelectedLocation({ lat, lng, address: result.display_name ?? ' }, { skipReverseLookup: true });
      showToast('Manzil topildi.', 'success');
    } catch (error) {
      showToast('Qidiruv vaqtida xatolik yuz berdi.', 'error');
    }
  };

  updateLocationSummary();

  const renderCards = (items) => {
    if (!items.length) {
      renderEmptyState(storeList, 'Hali do'konlar qo'shilmagan.');
      return;
    }

    storeList.innerHTML = items
      .map((store) => {
        let locationMeta = null;
        if (store.location && typeof store.location === 'object') {
          locationMeta = store.location;
        } else if (store.location && typeof store.location === 'string') {
          try {
            locationMeta = JSON.parse(store.location);
          } catch {
            locationMeta = null;
          }
        }
        const point = parseLatLng(locationMeta ?? store.location);
        const addressText = locationMeta?.address ?? store.address ?? 'Manzil kiritilmagan';
        const coordinatesText = point ? `Koordinata: ${formatLatLngText(point)}` : 'Lokatsiya kiritilmagan';

        return `
        <article class="picco-tile" data-store-id="${store.id}">
          <span class="picco-tile__icon material-icons">storefront</span>
          <div class="picco-tile__body">
            <h3>${store.name}</h3>
            <p class="picco-tile__meta">${store.phone ?? 'Telefon mavjud emas'}</p>
            <p class="picco-tile__meta">${addressText}</p>
            <p class="picco-tile__meta">${coordinatesText}</p>
          </div>
        </article>
      `;
      })
      .join(');
  };

  renderCards(stores);

  cancelButton?.addEventListener('click', () => {
    storeForm.reset();
    resetLocationState();
    formWrapper?.classList.remove('is-open');
  });

  storeForm.addEventListener('reset', resetLocationState);

  locationButton?.addEventListener('click', () => {
    openLocationModal();
  });

  locationClearButton?.addEventListener('click', () => {
    resetLocationState();
    showToast('Lokatsiya tozalandi.', 'info');
  });

  locationConfirmButton?.addEventListener('click', () => {
    if (!selectedLocation) {
      showToast('Iltimos, xaritada lokatsiyani tanlang.', 'warning');
      return;
    }
    closeLocationModal();
    updateLocationSummary();
  });

  locationCancelButton?.addEventListener('click', () => {
    closeLocationModal();
  });

  locationLocateButton?.addEventListener('click', () => locateUser());

  locationSearchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchLocation(event.currentTarget.value);
    }
  });

  locationModal?.querySelectorAll('[data-modal-close]')?.forEach((button) => {
    button.addEventListener('click', closeLocationModal);
  });

  locationModal?.addEventListener('click', (event) => {
    if (event.target === locationModal) {
      closeLocationModal();
    }
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

    if (selectedLocation) {
      payload.location = {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        address: selectedLocation.address || formData.get('address') || '
      };
    }

    try {
      await createAgentStore(payload);
      showToast('Do'kon qo'shildi', 'success');
      storeForm.reset();
      resetLocationState();
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
      initBottomNavigation(page);
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




