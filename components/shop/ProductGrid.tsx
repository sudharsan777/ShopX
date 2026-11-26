import React, { type ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import type { CatalogProduct } from '@/types/catalog.types';
import { useCatalog } from './CatalogProvider';
import { useCart } from './CartProvider';
import ProductImage from './ProductImage';
import { priceFormatter, shopStyles } from './shopStyles';

type ProductGridProps = {
  header: ReactElement;
  products: CatalogProduct[];
  emptyMessage?: string;
};

export default function ProductGrid({
  header,
  products,
  emptyMessage = 'No products available yet',
}: ProductGridProps) {
  const { requestState, loadProducts } = useCatalog();
  const { lines, add } = useCart();
  const quantities = new Map(lines.map(line => [line.product.id, line.quantity]));

  const errorNotice = (
    <View style={[shopStyles.surface, styles.notice]}>
      <Text accessibilityRole="alert" style={styles.noticeTitle}>Couldn’t load products</Text>
      <Text style={shopStyles.bodyText}>Check your connection and try again.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void loadProducts(products.length > 0)}
        style={({ pressed }) => [shopStyles.button, pressed && shopStyles.pressed]}
      >
        <Text style={shopStyles.buttonText}>Retry</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={shopStyles.screen} edges={['top', 'left', 'right']}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row}
        data={products}
        numColumns={2}
        keyExtractor={product => String(product.id)}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const quantity = quantities.get(item.id) ?? 0;

          return (
            <View style={styles.cell}>
              <View style={[shopStyles.surface, styles.card]}>
                <ProductImage uri={item.image_url} />
                <View style={styles.details}>
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.price}>{priceFormatter.format(item.price)}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${item.name} to cart`}
                    accessibilityHint={quantity ? `${quantity} already in cart` : undefined}
                    onPress={() => add(item)}
                    style={({ pressed }) => [
                      shopStyles.button,
                      styles.addButton,
                      quantity > 0 && styles.addedButton,
                      pressed && shopStyles.pressed,
                    ]}
                  >
                    <Ionicons name={quantity ? 'checkmark' : 'add'} size={17} color={Colors.black} />
                    <Text style={styles.addText}>{quantity ? `In cart · ${quantity}` : 'Add to cart'}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
        refreshing={requestState === 'refreshing'}
        onRefresh={() => void loadProducts(true)}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>{header}</View>
            {requestState === 'error' && products.length > 0 ? errorNotice : null}
          </View>
        }
        ListEmptyComponent={
          requestState === 'error' ? errorNotice : (
            <View style={[shopStyles.surface, styles.notice]}>
              {requestState === 'loading' || requestState === 'refreshing' ? (
                <ActivityIndicator accessibilityLabel="Loading products" color={Colors.black} />
              ) : (
                <>
                  <Ionicons name="bag-handle-outline" size={28} color={Colors.gray} />
                  <Text style={styles.noticeTitle}>{emptyMessage}</Text>
                </>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, width: '100%', maxWidth: 820, alignSelf: 'center' },
  content: { flexGrow: 1, paddingHorizontal: 10, paddingBottom: 20 },
  header: { paddingHorizontal: 6, paddingVertical: 16 },
  row: { marginBottom: 12 },
  cell: { width: '50%', paddingHorizontal: 6 },
  card: { flex: 1, overflow: 'hidden' },
  details: { flex: 1, padding: 10, gap: 8 },
  name: { flexGrow: 1, color: Colors.black, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  price: { color: Colors.black, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  addButton: { flexDirection: 'row', gap: 4, backgroundColor: '#f0efed', paddingHorizontal: 6 },
  addedButton: { backgroundColor: '#e9e5f7' },
  addText: { flexShrink: 1, color: Colors.black, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  notice: { alignItems: 'center', padding: 24, marginHorizontal: 6, marginBottom: 12, gap: 8 },
  noticeTitle: { color: Colors.black, fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
