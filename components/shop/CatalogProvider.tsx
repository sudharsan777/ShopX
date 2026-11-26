import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import axios from 'axios';

import { env } from '@/app/config/env';
import type { CatalogProduct } from '@/types/catalog.types';

const productsClient = axios.create({ timeout: 15000, headers: { Authorization: null } });

type RequestState = 'loading' | 'refreshing' | 'ready' | 'error';

type Catalog = {
  products: CatalogProduct[];
  requestState: RequestState;
  loadProducts: (refresh?: boolean) => Promise<void>;
};

const CatalogContext = createContext<Catalog | null>(null);

export function CatalogProvider({ children }: PropsWithChildren) {
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
    void loadProducts();

    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [loadProducts]);

  return (
    <CatalogContext.Provider value={{ products, requestState, loadProducts }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error('CatalogProvider is required');
  return catalog;
}
