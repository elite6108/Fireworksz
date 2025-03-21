import { create } from 'zustand';
import { CartItem } from '../types';
import { ShippingRate } from '../hooks/useShippingRates';

interface StoreState {
  cart: CartItem[];
  selectedShippingRate: ShippingRate | null;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setShippingRate: (rate: ShippingRate) => void;
  getSubtotal: () => number;
  getTax: () => number;
  getShipping: () => number;
  getTotal: () => number;
}

export const useStore = create<StoreState>((set, get) => ({
  cart: [],
  selectedShippingRate: null,
  
  addToCart: (item) =>
    set((state) => {
      const existingItem = state.cart.find((i) => i.product_id === item.product_id);
      if (existingItem) {
        return {
          cart: state.cart.map((i) =>
            i.product_id === item.product_id
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        };
      }
      return { 
        cart: [...state.cart, item],
      };
    }),

  removeFromCart: (productId) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.product_id !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      cart: state.cart.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      ),
    })),

  clearCart: () => set({ cart: [] }),

  setShippingRate: (rate) => set({ selectedShippingRate: rate }),

  // Calculate subtotal (sum of all items * their quantities)
  getSubtotal: () => {
    const state = get();
    return state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  // Calculate tax (8% of subtotal)
  getTax: () => {
    const state = get();
    return state.getSubtotal() * 0.08;
  },

  // Calculate shipping based on selected rate or default logic
  getShipping: () => {
    const state = get();
    
    // If a shipping rate is selected, use its cost
    if (state.selectedShippingRate) {
      return state.selectedShippingRate.cost;
    }
    
    // Fallback to default logic (free over $100, otherwise $15)
    return state.getSubtotal() > 100 ? 0 : 15;
  },

  // Calculate total (subtotal + tax + shipping)
  getTotal: () => {
    const state = get();
    return state.getSubtotal() + state.getTax() + state.getShipping();
  },
}));