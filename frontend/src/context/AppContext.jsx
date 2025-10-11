import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer
} from 'react';
import { addDays, formatISO } from 'date-fns';

const STORAGE_KEY = 'picco.crm.session';

const defaultAgents = [
  {
    id: 'agt-001',
    name: 'Asal Karimova',
    role: 'agent',
    region: 'Toshkent',
    phone: '+998 90 123 45 67',
    avatar: 'https://i.pravatar.cc/120?img=5'
  },
  {
    id: 'agt-002',
    name: 'Sardor Mamatov',
    role: 'agent',
    region: 'Samarqand',
    phone: '+998 91 765 43 21',
    avatar: 'https://i.pravatar.cc/120?img=12'
  },
  {
    id: 'adm-001',
    name: 'Adiba Yusufova',
    role: 'admin',
    region: 'Toshkent',
    phone: '+998 93 222 33 44',
    avatar: 'https://i.pravatar.cc/120?img=20'
  }
];

const defaultStores = [
  {
    id: 'st-001',
    title: 'Chilonzor Supermarket',
    address: 'Chilonzor 9, Toshkent',
    manager: 'Dilshod D.',
    status: 'active',
    coordinates: [69.2401, 41.2853],
    lastVisit: formatISO(addDays(new Date(), -3))
  },
  {
    id: 'st-002',
    title: 'Samarkand Fresh',
    address: 'Registon ko\'chasi, Samarqand',
    manager: 'Malika A.',
    status: 'pending',
    coordinates: [66.9597, 39.6542],
    lastVisit: formatISO(addDays(new Date(), -7))
  },
  {
    id: 'st-003',
    title: 'Fergana Market',
    address: 'Navbahor ko\'chasi, Farg\'ona',
    manager: 'Sherzod N.',
    status: 'active',
    coordinates: [71.7843, 40.3864],
    lastVisit: formatISO(addDays(new Date(), -1))
  }
];

const defaultProducts = [
  {
    id: 'prd-001',
    name: 'PICCO Premium Tea',
    category: 'Ichimliklar',
    price: 180000,
    inventory: 240,
    updatedAt: formatISO(addDays(new Date(), -2))
  },
  {
    id: 'prd-002',
    name: 'PICCO Smart Scale',
    category: 'Jihozlar',
    price: 1250000,
    inventory: 64,
    updatedAt: formatISO(addDays(new Date(), -5))
  },
  {
    id: 'prd-003',
    name: 'PICCO Loyalty Kit',
    category: 'Marketing',
    price: 420000,
    inventory: 310,
    updatedAt: formatISO(addDays(new Date(), -8))
  }
];

const defaultOrders = [
  {
    id: 'ord-5012',
    storeId: 'st-001',
    agentId: 'agt-001',
    amount: 3250000,
    status: 'completed',
    createdAt: formatISO(addDays(new Date(), -5))
  },
  {
    id: 'ord-5013',
    storeId: 'st-002',
    agentId: 'agt-002',
    amount: 2480000,
    status: 'processing',
    createdAt: formatISO(addDays(new Date(), -2))
  },
  {
    id: 'ord-5014',
    storeId: 'st-003',
    agentId: 'agt-001',
    amount: 1875000,
    status: 'pending',
    createdAt: formatISO(addDays(new Date(), -1))
  }
];

const initialState = {
  ready: false,
  user: null,
  agents: defaultAgents,
  stores: defaultStores,
  products: defaultProducts,
  orders: defaultOrders,
  activeFilters: {
    dateRange: [addDays(new Date(), -7).toISOString(), new Date().toISOString()],
    status: 'all'
  },
  modals: {},
  toasts: [],
  preferences: {
    haptics: true,
    language: 'uz'
  }
};

const AppContext = createContext();

const ACTIONS = {
  READY: 'READY',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  UPDATE_ORDERS: 'UPDATE_ORDERS',
  UPSERT_ORDER: 'UPSERT_ORDER',
  UPDATE_STORE: 'UPDATE_STORE',
  SET_FILTERS: 'SET_FILTERS',
  PUSH_TOAST: 'PUSH_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  TOGGLE_MODAL: 'TOGGLE_MODAL',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  ADD_PRODUCT: 'ADD_PRODUCT',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES'
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.READY:
      return { ...state, ready: true, user: action.payload };
    case ACTIONS.LOGIN:
      return { ...state, user: action.payload };
    case ACTIONS.LOGOUT:
      return { ...state, user: null };
    case ACTIONS.UPDATE_ORDERS:
      return { ...state, orders: action.payload };
    case ACTIONS.UPSERT_ORDER: {
      const exists = state.orders.some((order) => order.id === action.payload.id);
      return {
        ...state,
        orders: exists
          ? state.orders.map((order) =>
              order.id === action.payload.id ? { ...order, ...action.payload } : order
            )
          : [action.payload, ...state.orders]
      };
    }
    case ACTIONS.UPDATE_STORE:
      return {
        ...state,
        stores: state.stores.map((store) =>
          store.id === action.payload.id ? { ...store, ...action.payload } : store
        )
      };
    case ACTIONS.UPDATE_PRODUCT:
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.payload.id ? { ...product, ...action.payload } : product
        )
      };
    case ACTIONS.ADD_PRODUCT:
      return {
        ...state,
        products: [action.payload, ...state.products]
      };
    case ACTIONS.SET_FILTERS:
      return {
        ...state,
        activeFilters: { ...state.activeFilters, ...action.payload }
      };
    case ACTIONS.PUSH_TOAST:
      return {
        ...state,
        toasts: [...state.toasts, action.payload]
      };
    case ACTIONS.DISMISS_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.payload)
      };
    case ACTIONS.TOGGLE_MODAL:
      return {
        ...state,
        modals: { ...state.modals, [action.payload]: !state.modals[action.payload] }
      };
    case ACTIONS.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload }
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const persisted = localStorage.getItem(STORAGE_KEY);
    if (persisted) {
      try {
        const parsed = JSON.parse(persisted);
        dispatch({ type: ACTIONS.READY, payload: parsed });
        return;
      } catch (error) {
        console.error('Failed to parse stored session', error);
      }
    }
    dispatch({ type: ACTIONS.READY, payload: null });
  }, []);

  const persistUser = useCallback((payload) => {
    if (payload) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    (credentials) => {
      const selectedAgent =
        defaultAgents.find(
          (agent) =>
            agent.phone.replace(/\s|-/g, '') === credentials.phone.replace(/\s|-/g, '') &&
            agent.role === credentials.role
        ) || {
          id: `session-${Date.now()}`,
          name: credentials.fullName,
          role: credentials.role,
          region: 'Toshkent',
          phone: credentials.phone,
          avatar: 'https://i.pravatar.cc/120?img=60'
        };

      dispatch({ type: ACTIONS.LOGIN, payload: selectedAgent });
      persistUser(selectedAgent);
      return selectedAgent;
    },
    [persistUser]
  );

  const logout = useCallback(() => {
    dispatch({ type: ACTIONS.LOGOUT });
    persistUser(null);
  }, [persistUser]);

  const upsertOrder = useCallback((order) => {
    dispatch({ type: ACTIONS.UPSERT_ORDER, payload: order });
  }, []);

  const updateStore = useCallback((payload) => {
    dispatch({ type: ACTIONS.UPDATE_STORE, payload });
  }, []);

  const setFilters = useCallback((payload) => {
    dispatch({ type: ACTIONS.SET_FILTERS, payload });
  }, []);

  const addToast = useCallback((toast) => {
    const id = `toast-${Date.now()}`;
    dispatch({
      type: ACTIONS.PUSH_TOAST,
      payload: { id, ...toast }
    });
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    dispatch({ type: ACTIONS.DISMISS_TOAST, payload: id });
  }, []);

  const toggleModal = useCallback((key) => {
    dispatch({ type: ACTIONS.TOGGLE_MODAL, payload: key });
  }, []);

  const updateProduct = useCallback((product) => {
    dispatch({ type: ACTIONS.UPDATE_PRODUCT, payload: product });
  }, []);

  const addProduct = useCallback((product) => {
    dispatch({ type: ACTIONS.ADD_PRODUCT, payload: product });
  }, []);

  const updatePreferences = useCallback((payload) => {
    dispatch({ type: ACTIONS.UPDATE_PREFERENCES, payload });
  }, []);

  const value = useMemo(
    () => ({
      state,
      login,
      logout,
      upsertOrder,
      updateStore,
      updateProduct,
      addProduct,
      updatePreferences,
      setFilters,
      addToast,
      dismissToast,
      toggleModal
    }),
    [
      state,
      login,
      logout,
      upsertOrder,
      updateStore,
      updateProduct,
      addProduct,
      updatePreferences,
      setFilters,
      addToast,
      dismissToast,
      toggleModal
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
