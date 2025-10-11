const MAPLIBRE_VERSION = '2.4.0';
const MAPLIBRE_SCRIPT_ID = 'picco-maplibre-script';
const MAPLIBRE_CSS_ID = 'picco-maplibre-css';

const DEFAULT_CENTER = [69.2797, 41.3111]; // Tashkent

const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
    }
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      paint: {
        'raster-saturation': -0.05,
        'raster-contrast': 0.05
      }
    }
  ]
};

let maplibrePromise = null;

function ensureMapLibreCss() {
  if (document.getElementById(MAPLIBRE_CSS_ID)) {
    return;
  }
  const link = document.createElement('link');
  link.id = MAPLIBRE_CSS_ID;
  link.rel = 'stylesheet';
  link.href = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
  document.head.appendChild(link);
}

function injectMapLibreScript() {
  return new Promise((resolve, reject) => {
    if (document.getElementById(MAPLIBRE_SCRIPT_ID)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = MAPLIBRE_SCRIPT_ID;
    script.src = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      reject(new Error('MapLibre GL JS skriptini yuklab bo\'lmadi.'));
    };
    document.head.appendChild(script);
  });
}

export function loadMapLibre() {
  if (window.maplibregl) {
    ensureMapLibreCss();
    return Promise.resolve(window.maplibregl);
  }

  if (!maplibrePromise) {
    ensureMapLibreCss();
    maplibrePromise = injectMapLibreScript().then(() => {
      if (!window.maplibregl) {
        throw new Error('MapLibre GL JS yuklanmadi.');
      }
      return window.maplibregl;
    });
  }

  return maplibrePromise;
}

export async function getMapLibre() {
  return loadMapLibre();
}

function cloneStyle(styleSource) {
  return JSON.parse(JSON.stringify(styleSource));
}

export async function createMap(container, options = {}) {
  const maplibregl = await loadMapLibre();
  const {
    center = DEFAULT_CENTER,
    zoom = 12,
    style = cloneStyle(OSM_RASTER_STYLE),
    interactive = true
  } = options;

  const map = new maplibregl.Map({
    container,
    style,
    center,
    zoom,
    attributionControl: false,
    interactive
  });

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  return map;
}

export async function createMarker(options = {}) {
  const maplibregl = await loadMapLibre();
  const { color = '#6366F1', draggable = false } = options;
  return new maplibregl.Marker({ color, draggable });
}

export async function createPopup(options = {}) {
  const maplibregl = await loadMapLibre();
  return new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 16,
    ...options
  });
}

export function parseLatLng(raw) {
  if (!raw) return null;
  let value = raw;

  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  if (value && typeof value === 'object') {
    if (value.coordinates && typeof value.coordinates === 'object') {
      value = value.coordinates;
    } else if (value.geo && typeof value.geo === 'object') {
      value = value.geo;
    } else if (value.position && typeof value.position === 'object') {
      value = value.position;
    }
  }

  if (Array.isArray(value)) {
    const [latCandidate, lngCandidate] = value;
    const latArray = Number(latCandidate);
    const lngArray = Number(lngCandidate);
    if (Number.isFinite(latArray) && Number.isFinite(lngArray)) {
      return { lat: latArray, lng: lngArray };
    }
    return null;
  }

  const lat = Number(value?.lat ?? value?.latitude ?? value?.y);
  const lng = Number(value?.lng ?? value?.lon ?? value?.longitude ?? value?.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function formatLatLng(latLng) {
  if (!latLng) return 'Lokatsiya tanlanmagan';
  const { lat, lng } = latLng;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
