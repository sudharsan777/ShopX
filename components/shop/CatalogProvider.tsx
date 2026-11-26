import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import axios from 'axios';

import { useSession } from '@/components/auth/SessionProvider';
import { env } from '@/app/config/env';
import type { CatalogProduct } from '@/types/catalog.types';

const productsClient = axios.create({ timeout: 15000, headers: { Authorization: null } });

export async function fetchProduct(id: number, signal: AbortSignal) {
  const endpoint = env.PRODUCTS_API_URL;
  if (!endpoint) throw new Error('Product API is not configured');
  const { data } = await productsClient.get<CatalogProduct>(
    `${endpoint.replace(/\/+$/, '')}/${id}/`, { signal },
  );
  if (data?.id !== id) throw new Error('Invalid product response');
  return data;
}

type RequestState = 'loading' | 'refreshing' | 'ready' | 'error';

type Catalog = {
  products: CatalogProduct[];
  favorites: readonly number[];
  toggleFavorite: (id: number) => void;
  requestState: RequestState;
  loadProducts: (refresh?: boolean) => Promise<void>;
};

const CatalogContext = createContext<Catalog | null>(null);

export function CatalogProvider({ children }: PropsWithChildren) {
  const { accessToken } = useSession();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [requestState, setRequestState] = useState<RequestState>('loading');
  const activeRequest = useRef<AbortController | null>(null);

  const loadProducts = useCallback(async (refresh = false) => {
    if (activeRequest.current) return;

    const controller = new AbortController();
    activeRequest.current = controller;
    setRequestState(refresh ? 'refreshing' : 'loading');

    try {
      const url = env.PRODUCTS_API_URL;
      if (!url) throw new Error('EXPO_PUBLIC_PRODUCTS_API_URL is missing');

      const { data } = await productsClient.get<CatalogProduct[]>(url, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!Array.isArray(data)) throw new Error('Expected a product array');

      setProducts(data);
      setRequestState('ready');
    } catch {
      if (!controller.signal.aborted) setRequestState('error');
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setFavorites([]);
      setProducts([]);
      setRequestState('loading');
      return;
    }
    void loadProducts();

    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [accessToken, loadProducts]);

  return (
    <CatalogContext.Provider value={{ products, requestState, loadProducts, favorites, toggleFavorite: id => setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]) }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error('CatalogProvider is required');
  return catalog;
}
