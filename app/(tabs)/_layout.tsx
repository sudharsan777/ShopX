import React from 'react';
import { Image } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useSession } from '@/components/auth/SessionProvider';
import { useCart } from '@/components/shop/CartProvider';
import TryOnTabIcon from '@/components/try-on/TryOnTabIcon';

import MyTabBar from '../components/tabBar';

export default function TabLayout() {
  const { accessToken, restoring } = useSession();

  if (restoring) return null;

  if (!accessToken) {
    return <Redirect href="/signin" />;
  }

  return <ShopTabs />;
}

function ShopTabs() {
  const { count } = useCart();

  return (
    <Tabs
      tabBar={(props) => <MyTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../assets/images/Homeicon.jpg')}
              resizeMode="contain"
              style={{
                width: focused ? 30 : 24,
                height: focused ? 30 : 24,
                opacity: focused ? 1 : 0.7,
              }}
            />
          ),
        }}
      />

      {/* Explore */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="search-outline"
              size={focused ? 26 : 22}
              color={color}
            />
          ),
        }}
      />

      {/* Virtual Try On */}
      <Tabs.Screen
        name="try-on"
        options={{
          title: 'Try On',
          tabBarIcon: ({ focused }) => (
            <TryOnTabIcon focused={focused} />
          ),
        }}
      />

      {/* Cart */}
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarBadge:
            count > 99 ? '99+' : count || undefined,

          tabBarAccessibilityLabel: count
            ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}`
            : 'Cart',

          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="cart-outline"
              size={focused ? 26 : 22}
              color={color}
            />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="person-outline"
              size={focused ? 26 : 22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}