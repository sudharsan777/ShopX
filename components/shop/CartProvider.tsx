import React, { createContext, useContext, useState, type PropsWithChildren } from 'react';

import type { CatalogProduct } from '@/types/catalog.types';

type CartLine = { product: CatalogProduct; quantity: number };

type Cart = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (product: CatalogProduct) => void;
  decrease: (id: number) => void;
  remove: (id: number) => void;
};

const CartContext = createContext<Cart | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const add = (product: CatalogProduct) => {
    setLines(current => {
      const existing = current.find(line => line.product.id === product.id);
      if (!existing) return [...current, { product, quantity: 1 }];

      return current.map(line =>
        line === existing ? { product, quantity: line.quantity + 1 } : line,
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
