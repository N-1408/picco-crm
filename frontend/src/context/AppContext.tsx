import { createContext, useContext, useCallback, useReducer, useMemo, type ReactNode } from 'react';
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
  user?: Agent | null;
  loading?: boolean;
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
}

export interface AppContextValue extends AppState, AppContextActions {}

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
  | { type: 'SET_USER'; user: Agent | null };

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
        user: (action as any).user
      };
    case 'SET_USER':
      return {
        ...state,
        user: (action as any).user
      };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

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
    // loading is not handled by reducer; no-op for now
    // Provide this function for compatibility
    void loading;
  }, []);

  const value = useMemo(() => ({
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
    setLoading
  }), [state, addToast, dismissToast, addStore, updateStore, deleteStore,
      addAgent, updateAgent, deleteAgent, addProduct, updateProduct, deleteProduct,
      addOrder, updateOrder, setPeriod]);

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