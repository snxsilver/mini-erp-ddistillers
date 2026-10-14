export type MovementType = 'IN' | 'OUT';
export type Role = 'ADMIN_GUDANG' | 'OWNER';

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  priceIdr: number;
  currentStock: number;
  openingStock: number;
  image?: string;
}

export interface Movement {
  id: string;
  timestamp: string; // ISO 8601
  productId: number;
  sku: string;
  productName: string;
  type: MovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  userId: string;
  userName: string;
  description: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Raw form input. `quantity` is deliberately `unknown`: validation lives in the logic layer. */
export interface MovementInput {
  productId: number | null;
  type: MovementType;
  quantity: unknown;
  description: string;
}