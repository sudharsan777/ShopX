import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCart } from '@/components/shop/CartProvider';
import ProductImage from '@/components/shop/ProductImage';
import { priceFormatter, shopStyles } from '@/components/shop/shopStyles';
import { Colors } from '@/constants/Colors';

export default function CartScreen() {
  const { lines, count, subtotal, add, decrease, remove } = useCart();

  return (
    <SafeAreaView style={shopStyles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.layout}>
        <FlatList
          data={lines}
          keyExtractor={line => String(line.product.id)}
          contentContainerStyle={styles.content}
          ListHeaderComponent={(
            <View style={styles.header}>
              <Text accessibilityRole="header" style={shopStyles.title}>Cart</Text>
              <Text accessibilityLiveRegion="polite" style={shopStyles.bodyText}>
                {count} {count === 1 ? 'item' : 'items'}
              </Text>
            </View>
          )}
          ListEmptyComponent={(
            <View style={[shopStyles.surface, styles.empty]}>
              <Ionicons name="bag-handle-outline" size={32} color={Colors.gray} />
              <Text style={styles.productName}>Your cart is empty</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate('/(tabs)/explore')}
                style={({ pressed }) => [shopStyles.button, pressed && shopStyles.pressed]}
              >
                <Text style={shopStyles.buttonText}>Explore products</Text>
              </Pressable>
            </View>
          )}
          renderItem={({ item: { product, quantity } }) => (
            <View style={[shopStyles.surface, styles.line]}>
              <View style={styles.lineHeader}>
                <ProductImage uri={product.image_url} style={styles.thumbnail} />
                <View style={styles.lineDetails}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={shopStyles.bodyText}>{priceFormatter.format(product.price)} each</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <View style={styles.quantityControls}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Decrease quantity for ${product.name}`}
                    disabled={quantity === 1}
                    onPress={() => decrease(product.id)}
                    style={({ pressed }) => [
                      styles.quantityButton,
                      (pressed || quantity === 1) && styles.dimmed,
                    ]}
                  >
                    <Ionicons name="remove" size={18} color={Colors.black} />
                  </Pressable>
                  <Text accessibilityLabel={`Quantity: ${quantity}`} style={styles.quantity}>{quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Increase quantity for ${product.name}`}
                    onPress={() => add(product)}
                    style={({ pressed }) => [styles.quantityButton, pressed && shopStyles.pressed]}
                  >
                    <Ionicons name="add" size={18} color={Colors.black} />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${product.name} from cart`}
                  onPress={() => remove(product.id)}
                  style={({ pressed }) => [styles.remove, pressed && shopStyles.pressed]}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.gray} />
                  <Text style={shopStyles.bodyText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          )}
        />

        {count > 0 ? (
          <View style={[shopStyles.surface, styles.summary]}>
            <Text style={styles.productName}>Subtotal</Text>
            <Text accessibilityLiveRegion="polite" style={styles.subtotal}>{priceFormatter.format(subtotal)}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, width: '100%', maxWidth: 650, alignSelf: 'center' },
  content: { flexGrow: 1, padding: 16, gap: 10 },
  header: { gap: 4, marginBottom: 3 },
  empty: { alignItems: 'center', padding: 24, gap: 14 },
  line: { padding: 12, gap: 12 },
  lineHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbnail: { width: 62, borderRadius: 10 },
  lineDetails: { flex: 1, gap: 4 },
  productName: { color: Colors.black, fontSize: 16, fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 9,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.4 },
  quantity: { color: Colors.black, fontSize: 15, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  remove: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 6 },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  subtotal: { color: Colors.black, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
