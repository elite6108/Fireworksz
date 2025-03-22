export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image_url: string;
  category: string;
  price: number;
  stock: number;
  created_at: string;
}

export interface CartItem {
  product_id: string;
  id?: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  images?: string[];
  description?: string;
  product?: Product;
}

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  product: Product;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  total: number;
  shipping_cost: number;
  shipping_rate_id?: string;
  shipping_method?: {
    name: string;
    cost: number;
  } | null;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
  email: string;
  phone: string;
  shipping_address: {
    full_name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  items: OrderItem[];
}