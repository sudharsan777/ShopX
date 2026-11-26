import React, { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { useSession } from '@/components/auth/SessionProvider';
import type { CatalogProduct } from '@/types/catalog.types';

type CartLine = { product: CatalogProduct; quantity: number };

type Cart = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (product: CatalogProduct, quantity?: number) => void;
  decrease: (id: number) => void;
  remove: (id: number) => void;
};

const CartContext = createContext<Cart | null>(null);

export function stockLimit(product: CatalogProduct): number {
  if (product.is_active === false || product.in_stock === false) return 0;
  return typeof product.stock === 'number' && Number.isFinite(product.stock)
    ? Math.max(0, Math.floor(product.stock)) : Infinity;
}

export function CartProvider({ children }: PropsWithChildren) {
  const { accessToken } = useSession();
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    if (!accessToken) setLines([]);
  }, [accessToken]);

  const add = (product: CatalogProduct, requested = 1) => {
    if (!Number.isSafeInteger(requested) || requested < 1) return;
    setLines(current => {
      const existing = current.find(line => line.product.id === product.id);
      const currentQuantity = existing?.quantity ?? 0;
      const quantity = Math.min(stockLimit(product), currentQuantity + requested);
      if (quantity <= currentQuantity) return current;
      if (!existing) return [...current, { product, quantity }];

      return current.map(line =>
        line === existing ? { product, quantity } : line,
      );
    });
  };

  const decrease = (id: number) => {
    setLines(current => current
      .map(line => line.product.id === id ? { ...line, quantity: line.quantity - 1 } : line)
      .filter(line => line.quantity > 0));
  };

  const remove = (id: number) => setLines(current => current.filter(line => line.product.id !== id));
  const count = lines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = lines.reduce((total, line) => total + Math.round(line.product.price * 100) * line.quantity, 0) / 100;

  return (
    <CartContext.Provider value={{ lines, count, subtotal, add, decrease, remove }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('CartProvider is required');
  return cart;
}
