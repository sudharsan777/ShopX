import React from 'react';
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/components/auth/SessionProvider';
import { CatalogProvider } from '@/components/shop/CatalogProvider';
import { CartProvider, useCart } from '@/components/shop/CartProvider';
import TryOnTabIcon from '@/components/try-on/TryOnTabIcon';
import MyTabBar from '../components/tabBar';

export default function TabLayout() {
  const { accessToken, restoring } = useSession();

  if (restoring) return null;
  if (!accessToken) return <Redirect href="/signin" />;

  return (
    <CatalogProvider>
      <CartProvider>
        <ShopTabs />
      </CartProvider>
    </CatalogProvider>
  );
}

function ShopTabs() {
  const { count } = useCart();

  return (
    <Tabs
      tabBar={(props) => <MyTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name='index' options={{
        title: 'Home',
        tabBarIcon: ({color}) => (
          <Ionicons name='home-outline' size={22} color={color} />
        )
      }} />
      <Tabs.Screen name='explore' options={{
        title: 'Explore',
        tabBarIcon: ({color}) => (
          <Ionicons name='search-outline' size={22} color={color} />
        )
      }} />
      <Tabs.Screen name='try-on' options={{
        title: 'Try On',
        tabBarIcon: ({ focused }) => <TryOnTabIcon focused={focused} />
      }} />
      <Tabs.Screen name='cart' options={{
        title: 'Cart',
        tabBarBadge: count > 99 ? '99+' : count || undefined,
        tabBarAccessibilityLabel: count ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart',
        tabBarIcon: ({color}) => (
          <Ionicons name='cart-outline' size={22} color={color} />
        )
      }} />
      <Tabs.Screen name='profile' options={{
        title: 'Profile',
        tabBarIcon: ({color}) => (
          <Ionicons name='person-outline' size={22} color={color} />
        )
      }} />
    </Tabs>
  );
}