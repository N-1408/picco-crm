import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode
} from 'react';
import { addDays } from 'date-fns';

type Role = 'agent' | 'admin';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export const filterStatusOptions = {
  all: 'Barchasi',
  completed: 'Yakunlangan',
  processing: 'Jarayonda',
  pending: 'Kutilmoqda'
} as const;

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: AlertVariant;
  duration?: number;
}

export interface Agent {
  id: string;
  name: string;
  role: Role;
  region: string;
  phone: string;
  avatar: string;
  username?: string;
}

export interface Store {
  id: string;
  title: string;
  address: string;
  manager: string;
  status: 'active' | 'pending';
  coordinates: [number, number] | null;
  lastVisit: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  inventory: number;
  updatedAt: string;
}

export interface Order {
  id: string;
  storeId: string;
  agentId: string;
  amount: number;
  status: 'completed' | 'processing' | 'pending';
  createdAt: string;
}

export interface FiltersState {
  dateRange: [string, string];
  status: keyof typeof filterStatusOptions;
}

export interface PreferencesState {
  haptics: boolean;
  language: 'uz' | 'ru' | 'en';
}

interface AppState {
  toasts: Toast[];
  stores: Store[];
  agents: Agent[];
  products: Product[];
  orders: Order[];
  user: Agent | null;
  loading: boolean;
  telegramId: string | null;
  authError: string | null;
  adminToken: string | null;
  adminLoading: boolean;
  period: [Date, Date];
  activeFilters: FiltersState;
  preferences: PreferencesState;
}

interface AppContextActions {
  addToast: (_toast: Omit<Toast, 'id'>) => string;
  dismissToast: (_id: string) => void;
  showToast: (_toast: Omit<Toast, 'id'>) => string;
  addStore: (_store: Omit<Store, 'id'>) => string;
  updateStore: (_id: string, _store: Partial<Store>) => void;
  deleteStore: (_id: string) => void;
  addAgent: (_agent: Omit<Agent, 'id'>) => string;
  updateAgent: (_id: string, _agent: Partial<Agent>) => void;
  deleteAgent: (_id: string) => void;
  addProduct: (_product: Omit<Product, 'id'>) => string;
  updateProduct: (_id: string, _product: Partial<Product>) => void;
  deleteProduct: (_id: string) => void;
  addOrder: (_order: Omit<Order, 'id'>) => string;
  updateOrder: (_id: string, _order: Partial<Order>) => void;
  upsertOrder: (_order: Order) => void;
  setPeriod: (_period: [Date, Date]) => void;
  setLoading: (_loading: boolean) => void;
  setUser: (_user: Agent | null) => void;
  setFilters: (_filters: Partial<FiltersState>) => void;
  updatePreferences: (_preferences: Partial<PreferencesState>) => void;
  logout: () => void;
  loginAdmin: (_credentials: { username: string; password: string }) => Promise<string>;
  logoutAdmin: () => void;
}

export interface AppContextValue extends AppState, AppContextActions {
  state: AppState;
}

type AppAction =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'DISMISS_TOAST'; id: string }
  | { type: 'ADD_STORE'; store: Store }
  | { type: 'UPDATE_STORE'; id: string; store: Partial<Store> }
  | { type: 'DELETE_STORE'; id: string }
  | { type: 'ADD_AGENT'; agent: Agent }
  | { type: 'UPDATE_AGENT'; id: string; agent: Partial<Agent> }
  | { type: 'DELETE_AGENT'; id: string }
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'UPDATE_PRODUCT'; id: string; product: Partial<Product> }
  | { type: 'DELETE_PRODUCT'; id: string }
  | { type: 'ADD_ORDER'; order: Order }
  | { type: 'UPDATE_ORDER'; id: string; order: Partial<Order> }
  | { type: 'UPSERT_ORDER'; order: Order }
  | { type: 'SET_PERIOD'; period: [Date, Date] }
  | { type: 'SET_USER'; user: Agent | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_TELEGRAM_ID'; telegramId: string | null }
  | { type: 'SET_AUTH_ERROR'; error: string | null }
  | { type: 'SET_ADMIN_TOKEN'; token: string | null }
  | { type: 'SET_ADMIN_LOADING'; loading: boolean }
  | { type: 'SET_FILTERS'; filters: Partial<FiltersState> }
  | { type: 'SET_PREFERENCES'; preferences: Partial<PreferencesState> };

const AppContext = createContext<AppContextValue | null>(null);

const defaultPeriod: [Date, Date] = [addDays(new Date(), -30), new Date()];

const defaultPreferences: PreferencesState = {
  haptics: true,
  language: 'uz'
};

const demoAgents: Agent[] = [
  {
    id: 'agent-ali',
    name: 'Ali Valiyev',
    role: 'agent',
    region: 'Toshkent',
    phone: '+998 90 111 11 11',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Ali%20Valiyev'
  },
  {
    id: 'agent-aziz',
    name: 'Aziz Karimov',
    role: 'agent',
    region: 'Namangan',
    phone: '+998 90 222 22 22',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Aziz%20Karimov'
  },
  {
    id: 'admin-01',
    name: 'Dilshod Xolmurodov',
    role: 'admin',
    region: 'Markaziy ofis',
    phone: '+998 90 555 55 55',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Dilshod%20Xolmurodov'
  }
];

const demoStores: Store[] = [
  {
    id: 'store-1',
    title: 'Toshkent Savdo',
    address: "Chilonzor tumani, Bunyodkor ko'chasi 15",
    manager: 'Umid Jumaev',
    status: 'active',
    coordinates: [69.2401, 41.2859],
    lastVisit: addDays(new Date(), -3).toISOString()
  },
  {
    id: 'store-2',
    title: 'Andijon Market',
    address: "Bog'bon ko'chasi 12",
    manager: 'Shahnoza Umarova',
    status: 'pending',
    coordinates: [72.3498, 40.7821],
    lastVisit: addDays(new Date(), -9).toISOString()
  },
  {
    id: 'store-3',
    title: "Namangan Do'kon",
    address: "Mustaqillik ko'chasi 7",
    manager: 'Otabek Sodiqov',
    status: 'active',
    coordinates: [71.6726, 41.0056],
    lastVisit: addDays(new Date(), -1).toISOString()
  }
];

const demoProducts: Product[] = [
  {
    id: 'product-1',
    name: 'Nam salfetka Classic',
    category: 'Gigiyena',
    price: 15000,
    inventory: 480,
    updatedAt: addDays(new Date(), -2).toISOString()
  },
  {
    id: 'product-2',
    name: 'Bolalar tagligi',
    category: 'Bolalar',
    price: 80000,
    inventory: 180,
    updatedAt: addDays(new Date(), -6).toISOString()
  },
  {
    id: 'product-3',
    name: "Gigiyenik quruq sochiq",
    category: 'Gigiyena',
    price: 12000,
    inventory: 260,
    updatedAt: addDays(new Date(), -4).toISOString()
  }
];

const demoOrders: Order[] = [
  {
    id: 'ord-1001',
    storeId: 'store-1',
    agentId: 'agent-ali',
    amount: 1850000,
    status: 'completed',
    createdAt: addDays(new Date(), -2).toISOString()
  },
  {
    id: 'ord-1002',
    storeId: 'store-2',
    agentId: 'agent-aziz',
    amount: 1260000,
    status: 'processing',
    createdAt: addDays(new Date(), -5).toISOString()
  },
  {
    id: 'ord-1003',
    storeId: 'store-3',
    agentId: 'agent-ali',
    amount: 940000,
    status: 'pending',
    createdAt: addDays(new Date(), -7).toISOString()
  }
];

const initialState: AppState = {
  toasts: [],
  stores: demoStores,
  agents: demoAgents,
  products: demoProducts,
  orders: demoOrders,
  user: null,
  loading: true,
  telegramId: null,
  authError: null,
  adminToken: null,
  adminLoading: false,
  period: defaultPeriod,
  activeFilters: {
    dateRange: [addDays(new Date(), -7).toISOString(), new Date().toISOString()],
    status: 'all'
  },
  preferences: defaultPreferences
};

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast] };
    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.filter((toast) => toast.id !== action.id) };
    case 'ADD_STORE':
      return { ...state, stores: [...state.stores, action.store] };
    case 'UPDATE_STORE':
      return {
        ...state,
        stores: state.stores.map((store) =>
          store.id === action.id ? { ...store, ...action.store } : store
        )
      };
    case 'DELETE_STORE':
      return { ...state, stores: state.stores.filter((store) => store.id !== action.id) };
    case 'ADD_AGENT':
      return { ...state, agents: [...state.agents, action.agent] };
    case 'UPDATE_AGENT':
      return {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === action.id ? { ...agent, ...action.agent } : agent
        )
      };
    case 'DELETE_AGENT':
      return { ...state, agents: state.agents.filter((agent) => agent.id !== action.id) };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.product] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.id ? { ...product, ...action.product } : product
        )
      };
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter((product) => product.id !== action.id) };
    case 'ADD_ORDER':
      return { ...state, orders: [...state.orders, action.order] };
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map((order) =>
          order.id === action.id ? { ...order, ...action.order } : order
        )
      };
    case 'UPSERT_ORDER': {
      const exists = state.orders.some((order) => order.id === action.order.id);
      if (exists) {
        return {
          ...state,
          orders: state.orders.map((order) =>
            order.id === action.order.id ? { ...order, ...action.order } : order
          )
        };
      }
      return { ...state, orders: [...state.orders, action.order] };
    }
    case 'SET_PERIOD':
      return { ...state, period: action.period };
    case 'SET_USER':
      return { ...state, user: action.user };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_TELEGRAM_ID':
      return { ...state, telegramId: action.telegramId };
    case 'SET_AUTH_ERROR':
      return { ...state, authError: action.error };
    case 'SET_ADMIN_TOKEN':
      return { ...state, adminToken: action.token };
    case 'SET_ADMIN_LOADING':
      return { ...state, adminLoading: action.loading };
    case 'SET_FILTERS':
      return {
        ...state,
        activeFilters: { ...state.activeFilters, ...action.filters }
      };
    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.preferences }
      };
    default:
      return state;
  }
}

function resolveRuntimeApiBase(): string {
  const envValue = (import.meta.env.VITE_API_URL ?? '').trim();
  if (envValue) {
    return envValue.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const runtimeConfig = (window as unknown as { __PICCO_CONFIG?: { apiBaseUrl?: string } })
      ?.__PICCO_CONFIG;
    if (runtimeConfig?.apiBaseUrl) {
      return runtimeConfig.apiBaseUrl.replace(/\/+$/, '');
    }
  }
  return '';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const apiBaseUrl = resolveRuntimeApiBase();

  const resolveTelegramId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    const tgId =
      window.Telegram?.WebApp?.initDataUnsafe?.user?.id ??
      new URLSearchParams(window.location.search).get('tg_id') ??
      window.localStorage.getItem('picco.telegramId');
    return tgId ? String(tgId) : null;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedToken = window.localStorage.getItem('picco.adminToken');
    if (storedToken) {
      dispatch({ type: 'SET_ADMIN_TOKEN', token: storedToken });
    }

    const storedPreferences = window.localStorage.getItem('picco.preferences');
    if (storedPreferences) {
      try {
        const parsed = JSON.parse(storedPreferences) as Partial<PreferencesState>;
        dispatch({ type: 'SET_PREFERENCES', preferences: parsed });
      } catch {
        // ignore malformed payload
      }
    }

    let isMounted = true;
    const controller = new AbortController();

    const bootstrapAgent = async () => {
      const telegramId = resolveTelegramId();
      if (!isMounted) return;
      dispatch({ type: 'SET_TELEGRAM_ID', telegramId });

      if (!telegramId || !apiBaseUrl) {
        dispatch({ type: 'SET_USER', user: null });
        dispatch({ type: 'SET_LOADING', loading: false });
        return;
      }

      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_AUTH_ERROR', error: null });

      try {
        const response = await fetch(`${apiBaseUrl}/auth/agent/${telegramId}`, {
          signal: controller.signal
        });

        if (!isMounted) return;

        if (response.status === 404) {
          dispatch({ type: 'SET_USER', user: null });
          window.localStorage.removeItem('picco.telegramId');
          return;
        }

        if (!response.ok) {
          throw new Error("Agent ma'lumotini olishda xatolik yuz berdi.");
        }

        const payload: { user?: { id?: string; name?: string; phone?: string } } =
          await response.json();
        if (!payload.user) {
          dispatch({ type: 'SET_USER', user: null });
          window.localStorage.removeItem('picco.telegramId');
          return;
        }

        const mappedUser: Agent = {
          id: payload.user.id ?? telegramId,
          name: payload.user.name ?? 'PICCO Agent',
          role: 'agent',
          region: 'Toshkent',
          phone: payload.user.phone ?? '',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            payload.user.name ?? 'PICCO Agent'
          )}`
        };

        dispatch({ type: 'SET_USER', user: mappedUser });
        window.localStorage.setItem('picco.telegramId', telegramId);
      } catch (error) {
        if (!isMounted || controller.signal.aborted) return;
        console.error('Agent verification error:', error);
        const message =
          error instanceof Error ? error.message : "Agentni tekshirishda xatolik yuz berdi.";
        dispatch({ type: 'SET_AUTH_ERROR', error: message });
        dispatch({ type: 'SET_USER', user: null });
      } finally {
        if (isMounted) {
          dispatch({ type: 'SET_LOADING', loading: false });
        }
      }
    };

    bootstrapAgent();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [apiBaseUrl, resolveTelegramId]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = generateId('toast');
    dispatch({ type: 'ADD_TOAST', toast: { ...toast, id } });
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_TOAST', id });
  }, []);

  const showToast = useCallback(
    (toast: Omit<Toast, 'id'>): string => {
      return addToast(toast);
    },
    [addToast]
  );

  const addStore = useCallback((store: Omit<Store, 'id'>): string => {
    const id = generateId('store');
    dispatch({ type: 'ADD_STORE', store: { ...store, id } });
    return id;
  }, []);

  const updateStore = useCallback((id: string, store: Partial<Store>) => {
    dispatch({ type: 'UPDATE_STORE', id, store });
  }, []);

  const deleteStore = useCallback((id: string) => {
    dispatch({ type: 'DELETE_STORE', id });
  }, []);

  const addAgent = useCallback((agent: Omit<Agent, 'id'>): string => {
    const id = generateId('agent');
    dispatch({ type: 'ADD_AGENT', agent: { ...agent, id } });
    return id;
  }, []);

  const updateAgent = useCallback((id: string, agent: Partial<Agent>) => {
    dispatch({ type: 'UPDATE_AGENT', id, agent });
  }, []);

  const deleteAgent = useCallback((id: string) => {
    dispatch({ type: 'DELETE_AGENT', id });
  }, []);

  const addProduct = useCallback((product: Omit<Product, 'id'>): string => {
    const id = generateId('product');
    dispatch({ type: 'ADD_PRODUCT', product: { ...product, id } });
    return id;
  }, []);

  const updateProduct = useCallback((id: string, product: Partial<Product>) => {
    dispatch({ type: 'UPDATE_PRODUCT', id, product });
  }, []);

  const deleteProduct = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PRODUCT', id });
  }, []);

  const addOrder = useCallback((order: Omit<Order, 'id'>): string => {
    const id = generateId('order');
    dispatch({ type: 'ADD_ORDER', order: { ...order, id } });
    return id;
  }, []);

  const updateOrder = useCallback((id: string, order: Partial<Order>) => {
    dispatch({ type: 'UPDATE_ORDER', id, order });
  }, []);

  const upsertOrder = useCallback((order: Order) => {
    dispatch({ type: 'UPSERT_ORDER', order });
  }, []);

  const setPeriod = useCallback((period: [Date, Date]) => {
    dispatch({ type: 'SET_PERIOD', period });
  }, []);

  const setUser = useCallback((user: Agent | null) => {
    dispatch({ type: 'SET_USER', user });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', loading });
  }, []);

  const setFilters = useCallback((filters: Partial<FiltersState>) => {
    dispatch({ type: 'SET_FILTERS', filters });
  }, []);

  const updatePreferences = useCallback(
    (preferences: Partial<PreferencesState>) => {
      dispatch({ type: 'SET_PREFERENCES', preferences });
      if (typeof window !== 'undefined') {
        const next = { ...state.preferences, ...preferences };
        window.localStorage.setItem('picco.preferences', JSON.stringify(next));
      }
    },
    [state.preferences]
  );

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('picco.telegramId');
    }
    dispatch({ type: 'SET_USER', user: null });
  }, []);

  const loginAdmin = useCallback(
    async ({ username, password }: { username: string; password: string }) => {
      if (!apiBaseUrl) {
        throw new Error('API manzili topilmadi.');
      }

      dispatch({ type: 'SET_ADMIN_LOADING', loading: true });
      try {
        const response = await fetch(`${apiBaseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Kirish ma'lumotlari noto'g'ri.");
        }

        const { token } = await response.json();
        if (!token) {
          throw new Error('Serverdan token olinmadi.');
        }

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('picco.adminToken', token);
        }

        dispatch({ type: 'SET_ADMIN_TOKEN', token });
        return token;
      } finally {
        dispatch({ type: 'SET_ADMIN_LOADING', loading: false });
      }
    },
    [apiBaseUrl]
  );

  const logoutAdmin = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('picco.adminToken');
    }
    dispatch({ type: 'SET_ADMIN_TOKEN', token: null });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      ...state,
      addToast,
      dismissToast,
      showToast,
      addStore,
      updateStore,
      deleteStore,
      addAgent,
      updateAgent,
      deleteAgent,
      addProduct,
      updateProduct,
      deleteProduct,
      addOrder,
      updateOrder,
      upsertOrder,
      setPeriod,
      setUser,
      setLoading,
      setFilters,
      updatePreferences,
      logout,
      loginAdmin,
      logoutAdmin
    }),
    [
      state,
      addToast,
      dismissToast,
      showToast,
      addStore,
      updateStore,
      deleteStore,
      addAgent,
      updateAgent,
      deleteAgent,
      addProduct,
      updateProduct,
      deleteProduct,
      addOrder,
      updateOrder,
      upsertOrder,
      setPeriod,
      setUser,
      setLoading,
      setFilters,
      updatePreferences,
      logout,
      loginAdmin,
      logoutAdmin
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export const useAppContext = useApp;

