import {
  createContext,
  useContext,
  useCallback,
  useReducer,
  useMemo,
  useEffect,
  type ReactNode
} from 'react';
import { addDays } from 'date-fns';

type Role = 'agent' | 'admin';
export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: AlertVariant;
  duration?: number;
}

interface Agent {
  id: string;
  name: string;
  role: Role;
  region: string;
  phone: string;
  avatar: string;
}

interface Store {
  id: string;
  title: string;
  address: string;
  manager: string;
  status: 'active' | 'pending';
  coordinates: [number, number];
  lastVisit: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  inventory: number;
  updatedAt: string;
}

interface Order {
  id: string;
  storeId: string;
  agentId: string;
  amount: number;
  status: 'completed' | 'processing' | 'pending';
  createdAt: string;
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
}

interface AppContextActions {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  showToast: (toast: Omit<Toast, 'id'>) => string | void;
  addStore: (store: Omit<Store, 'id'>) => void;
  updateStore: (id: string, store: Partial<Store>) => void;
  deleteStore: (id: string) => void;
  setUser: (user: Agent | null) => void;
  setLoading: (loading: boolean) => void;
  addAgent: (agent: Omit<Agent, 'id'>) => void;
  updateAgent: (id: string, agent: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addOrder: (order: Omit<Order, 'id'>) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  setPeriod: (period: [Date, Date]) => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: Agent | null) => void;
  logout: () => void;
  loginAdmin: (credentials: { username: string; password: string }) => Promise<string>;
  logoutAdmin: () => void;
}

export interface AppContextValue extends AppState, AppContextActions {
  state: AppState;
}

const AppContext = createContext<AppContextValue | null>(null);

const defaultPeriod: [Date, Date] = [
  addDays(new Date(), -30),
  new Date()
];

const initialState: AppState = {
  toasts: [],
  stores: [],
  agents: [],
  products: [],
  orders: [],
  user: null,
  loading: false,
  telegramId: null,
  authError: null,
  adminToken: null,
  adminLoading: false,
  period: defaultPeriod
};

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
  | { type: 'SET_PERIOD'; period: [Date, Date] }
  | { type: 'SET_USER'; user: Agent | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_TELEGRAM_ID'; telegramId: string | null }
  | { type: 'SET_AUTH_ERROR'; error: string | null }
  | { type: 'SET_ADMIN_TOKEN'; token: string | null }
  | { type: 'SET_ADMIN_LOADING'; loading: boolean };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.toast]
      };
    case 'DISMISS_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.id)
      };
    case 'ADD_STORE':
      return {
        ...state,
        stores: [...state.stores, action.store]
      };
    case 'UPDATE_STORE':
      return {
        ...state,
        stores: state.stores.map(store =>
          store.id === action.id ? { ...store, ...action.store } : store
        )
      };
    case 'DELETE_STORE':
      return {
        ...state,
        stores: state.stores.filter(store => store.id !== action.id)
      };
    case 'ADD_AGENT':
      return {
        ...state,
        agents: [...state.agents, action.agent]
      };
    case 'UPDATE_AGENT':
      return {
        ...state,
        agents: state.agents.map(agent =>
          agent.id === action.id ? { ...agent, ...action.agent } : agent
        )
      };
    case 'DELETE_AGENT':
      return {
        ...state,
        agents: state.agents.filter(agent => agent.id !== action.id)
      };
    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [...state.products, action.product]
      };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(product =>
          product.id === action.id ? { ...product, ...action.product } : product
        )
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(product => product.id !== action.id)
      };
    case 'ADD_ORDER':
      return {
        ...state,
        orders: [...state.orders, action.order]
      };
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.id ? { ...order, ...action.order } : order
        )
      };
    case 'SET_PERIOD':
      return {
        ...state,
        period: action.period
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.user
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.loading
      };
    case 'SET_TELEGRAM_ID':
      return {
        ...state,
        telegramId: action.telegramId
      };
    case 'SET_AUTH_ERROR':
      return {
        ...state,
        authError: action.error
      };
    case 'SET_ADMIN_TOKEN':
      return {
        ...state,
        adminToken: action.token
      };
    case 'SET_ADMIN_LOADING':
      return {
        ...state,
        adminLoading: action.loading
      };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

  const resolveTelegramId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (tgUserId) return String(tgUserId);

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('tg_id')) {
      const value = searchParams.get('tg_id');
      searchParams.delete('tg_id');
      const query = searchParams.toString();
      const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', newUrl);
      return value;
    }

    const stored = window.localStorage.getItem('picco.telegramId');
    return stored ?? null;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedToken = window.localStorage.getItem('picco.adminToken');
    if (storedToken) {
      dispatch({ type: 'SET_ADMIN_TOKEN', token: storedToken });
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
          throw new Error('Agent ma\'lumotini olishda xatolik');
        }

        const payload: { user?: Partial<Agent> & { role?: Role; phone?: string } } = await response.json();
        if (!payload.user) {
          dispatch({ type: 'SET_USER', user: null });
          window.localStorage.removeItem('picco.telegramId');
          return;
        }

        const mappedUser: Agent = {
          id: telegramId,
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
        // eslint-disable-next-line no-console
        console.error('Agent verification error:', error);
        dispatch({
          type: 'SET_AUTH_ERROR',
          error: error instanceof Error ? error.message : 'Agentni tekshirishda xatolik yuz berdi.'
        });
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

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    dispatch({ type: 'ADD_TOAST', toast: { ...toast, id } });
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_TOAST', id });
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    return addToast(toast);
  }, [addToast]);

  const addStore = useCallback((store: Omit<Store, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    dispatch({ type: 'ADD_STORE', store: { ...store, id } });
  }, []);

  const updateStore = useCallback((id: string, store: Partial<Store>) => {
    dispatch({ type: 'UPDATE_STORE', id, store });
  }, []);

  const deleteStore = useCallback((id: string) => {
    dispatch({ type: 'DELETE_STORE', id });
  }, []);

  const addAgent = useCallback((agent: Omit<Agent, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    dispatch({ type: 'ADD_AGENT', agent: { ...agent, id } });
  }, []);

  const updateAgent = useCallback((id: string, agent: Partial<Agent>) => {
    dispatch({ type: 'UPDATE_AGENT', id, agent });
  }, []);

  const deleteAgent = useCallback((id: string) => {
    dispatch({ type: 'DELETE_AGENT', id });
  }, []);

  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    dispatch({ type: 'ADD_PRODUCT', product: { ...product, id } });
  }, []);

  const updateProduct = useCallback((id: string, product: Partial<Product>) => {
    dispatch({ type: 'UPDATE_PRODUCT', id, product });
  }, []);

  const deleteProduct = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PRODUCT', id });
  }, []);

  const addOrder = useCallback((order: Omit<Order, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    dispatch({ type: 'ADD_ORDER', order: { ...order, id } });
  }, []);

  const updateOrder = useCallback((id: string, order: Partial<Order>) => {
    dispatch({ type: 'UPDATE_ORDER', id, order });
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

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('picco.telegramId');
    }
    dispatch({ type: 'SET_USER', user: null });
  }, []);

  const loginAdmin = useCallback(
    async ({ username, password }: { username: string; password: string }) => {
      if (!apiBaseUrl) {
        throw new Error('API manzili topilmadi');
      }

      dispatch({ type: 'SET_ADMIN_LOADING', loading: true });
      try {
        const response = await fetch(`${apiBaseUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? 'Kirish ma\'lumotlari noto\'g\'ri.');
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

  const value = useMemo(() => ({
    state,
    ...state,
    addToast,
    dismissToast,
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
    setPeriod,
    showToast,
    setUser,
    setLoading,
    logout,
    loginAdmin,
    logoutAdmin
  }), [
    state,
    addToast,
    dismissToast,
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
    setPeriod,
    showToast,
    setUser,
    setLoading,
    logout,
    loginAdmin,
    logoutAdmin
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Backwards-compatible alias for existing code that expects `useAppContext`
export const useAppContext = useApp;
