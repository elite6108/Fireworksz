# Midnight Fireworks E-commerce Documentation

## Overview
Midnight Fireworks is a modern e-commerce platform built with React, TypeScript, and Supabase, specializing in fireworks and pyrotechnic products. The application features a responsive design, user authentication, role-based access control, and a complete shopping experience.

## Tech Stack
- Frontend: React + TypeScript
- Styling: Tailwind CSS
- Icons: Lucide React
- State Management: Zustand
- Backend/Database: Supabase
- Authentication: Supabase Auth
- Hosting: Vite Development Server

## Database Schema

### Tables

#### products
```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### orders
```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'delivered')),
  total numeric NOT NULL CHECK (total >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### order_items
```sql
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price >= 0)
);
```

## Security

### Row Level Security (RLS) Policies

#### Products
- Public read access
- Admin-only write operations (INSERT, UPDATE, DELETE)

```sql
-- Read Policy
CREATE POLICY "products_read_policy" 
ON products FOR SELECT TO public
USING (true);

-- Write Policies for Admins
CREATE POLICY "products_insert_policy"
ON products FOR INSERT TO authenticated
WITH CHECK (auth.jwt() IS NOT NULL AND auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "products_update_policy"
ON products FOR UPDATE TO authenticated
USING (auth.jwt() IS NOT NULL AND auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() IS NOT NULL AND auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "products_delete_policy"
ON products FOR DELETE TO authenticated
USING (auth.jwt() IS NOT NULL AND auth.jwt() ->> 'role' = 'admin');
```

#### Orders
- Users can view and create their own orders
- Admins can view all orders

```sql
CREATE POLICY "Users can view their own orders"
ON orders FOR SELECT TO authenticated
USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can create their own orders"
ON orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
```

## Features

### Authentication
- Email/password authentication
- Role-based access (user/admin)
- Protected routes
- Session management

### Product Management (Admin)
- CRUD operations for products
- Stock management
- Category organization
- Image URL management

### Shopping Experience
- Product browsing
- Category filtering
- Shopping cart
- Checkout process

### Order Management
- Order creation
- Order status tracking
- Order history
- Admin order management

## Frontend Structure

### Pages
- `/` - Home page
- `/shop` - Product listing
- `/auth` - Authentication
- `/cart` - Shopping cart
- `/orders` - Order history
- `/admin` - Admin dashboard

### Components
- `Navigation` - Main navigation bar
- `Footer` - Site footer
- `AuthProvider` - Authentication context
- Various product and order components

### State Management
Using Zustand for:
- Cart state
- Authentication state
- UI state

## API Integration

### Supabase Client Setup
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Environment Variables
Required environment variables:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
- Create `.env` file
- Add Supabase credentials

4. Start development server:
```bash
npm run dev
```

## Deployment

### Build
```bash
npm run build
```

### Preview
```bash
npm run preview
```

## Type Definitions

### User
```typescript
interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}
```

### Product
```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  category: string;
  created_at: string;
}
```

### Order
```typescript
interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  total: number;
  created_at: string;
  items: OrderItem[];
}
```

## Best Practices

### Security
- Always validate user roles for protected operations
- Use RLS policies for data access control
- Sanitize user inputs
- Maintain proper session management

### Performance
- Optimize database queries
- Use proper indexing
- Implement lazy loading where appropriate
- Minimize unnecessary re-renders

### Error Handling
- Proper error boundaries
- User-friendly error messages
- Comprehensive error logging
- Graceful fallbacks

## Future Improvements
- Payment integration
- Advanced search functionality
- Product reviews and ratings
- Wishlist feature
- Email notifications
- Social media integration
- Analytics dashboard
- Inventory alerts
- Bulk operations for admins
- Mobile app version