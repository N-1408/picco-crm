import { createContext, useContext, useCallback, useReducer, useMemo, useState } from 'react';
import { addDays } from 'date-fns';

/**
 * @typedef {'agent' | 'admin'} Role
 */

/**
 * @typedef {Object} Agent
 * @property {string} id
 * @property {string} name
 * @property {Role} role
 * @property {string} region
 * @property {string} phone
 * @property {string} avatar
 */

/**
 * @typedef {Object} Store
 * @property {string} id
 * @property {string} title
 * @property {string} address
 * @property {string} manager
 * @property {'active' | 'pending'} status
 * @property {[number, number]} coordinates
 * @property {string} lastVisit
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {number} price
 * @property {number} inventory
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} storeId
 * @property {string} agentId
 * @property {number} amount
 * @property {'completed' | 'processing' | 'pending'} status
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Toast
 * @property {string} id
 * @property {string} message
 * @property {'success' | 'error' | 'info' | 'warning'} type
 */

/**
 * @typedef {Object} Preferences
 * @property {boolean} haptics
 * @property {'uz' | 'en' | 'ru'} language
 */

/**
 * @typedef {Object} ActiveFilters
 * @property {[string, string]} dateRange
 * @property {'all' | 'pending' | 'completed' | 'processing'} status
 */

/**
 * @typedef {Object} State
 * @property {boolean} ready
 * @property {Agent|null} user
 * @property {Agent[]} agents
 * @property {Store[]} stores
 * @property {Product[]} products
 * @property {Order[]} orders
 * @property {ActiveFilters} activeFilters
 * @property {Record<string, boolean>} modals
 * @property {Toast[]} toasts
 * @property {Preferences} preferences
 */

/** @type {State} */
const initialState = {
  ready: false,
  user: null,
  agents: [],
  stores: [],
  products: [],
  orders: [],
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

const ACTIONS = /** @type {const} */ ({
  SET_STATE: 'SET_STATE',
  SET_USER: 'SET_USER',
  ADD_TOAST: 'ADD_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
  SET_LOADING: 'SET_LOADING'
});

/**
 * @typedef {Object} AppContextValue
 * @property {State} state
 * @property {boolean} loading
 * @property {(nextState: Partial<State>) => void} setState
 * @property {(user: Agent | null) => void} setUser
 * @property {(toast: Omit<Toast, 'id'>) => string} addToast
 * @property {(id: string) => void} removeToast
 * @property {(loading: boolean) => void} setLoading
 */

/** @type {import('react').Context<AppContextValue>} */
const AppContext = createContext(/** @type {any} */ (null));

/**
 * @param {State} state
 * @param {{ type: keyof typeof ACTIONS, payload: any }} action
 */
function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_STATE:
      return { ...state, ...action.payload };
    case ACTIONS.SET_USER:
      return { ...state, user: action.payload };
    case ACTIONS.ADD_TOAST:
      return {
        ...state,
        toasts: [...state.toasts, { id: Date.now().toString(), ...action.payload }]
      };
    case ACTIONS.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.payload)
      };
    default:
      return state;
  }
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(false);

  const setState = useCallback((/** @type {Partial<State>} */ nextState) => {
    dispatch({ type: ACTIONS.SET_STATE, payload: nextState });
  }, []);

  const setUser = useCallback((/** @type {Agent|null} */ user) => {
    dispatch({ type: ACTIONS.SET_USER, payload: user });
  }, []);

  const addToast = useCallback((/** @type {Omit<Toast, 'id'>} */ toast) => {
    const id = Date.now().toString();
    dispatch({ type: ACTIONS.ADD_TOAST, payload: { ...toast, id } });
    return id;
  }, []);

  const removeToast = useCallback((/** @type {string} */ id) => {
    dispatch({ type: ACTIONS.REMOVE_TOAST, payload: id });
  }, []);

  const value = useMemo(
    () => ({
      state,
      loading,
      setState,
      setUser,
      addToast,
      removeToast,
      setLoading
    }),
    [state, loading, setState, setUser, addToast, removeToast, setLoading]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * @returns {AppContextValue}
 */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Backwards-compatible alias for existing imports that expect `useAppContext`
export const useAppContext = useApp;