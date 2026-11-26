import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useCatalog } from '@/components/shop/CatalogProvider';
import ProductGrid from '@/components/shop/ProductGrid';
import ProductImage from '@/components/shop/ProductImage';
import { shopStyles } from '@/components/shop/shopStyles';
import { Colors } from '@/constants/Colors';

export default function HomeScreen() {
  const { products } = useCatalog();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = new Map(products.map(product => [product.category_slug, product.category]));
  const category = selectedCategory && categories.has(selectedCategory) ? selectedCategory : null;
  const visibleProducts = category ? products.filter(product => product.category_slug === category) : products;
  const featuredImage = products.find(product => product.image_url)?.image_url;

  return (
    <ProductGrid
      products={visibleProducts}
      header={(
        <View style={styles.header}>
          <View style={styles.headingRow}>
            <Text accessibilityRole="header" style={shopStyles.title}>ShopX</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search products"
              onPress={() => router.navigate('/(tabs)/explore')}
              style={({ pressed }) => [styles.searchButton, pressed && shopStyles.pressed]}
            >
              <Ionicons name="search-outline" size={21} color={Colors.black} />
            </Pressable>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureCopy}>
              <Text style={styles.featureTitle}>Shop the collection</Text>
              <Text style={styles.featureText}>Browse the catalog by category.</Text>
            </View>
            {featuredImage ? <ProductImage uri={featuredImage} style={styles.featureImage} /> : null}
          </View>

          {categories.size > 0 ? (
            <View style={styles.categorySection}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Categories</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {[{ slug: null, name: 'All' }, ...Array.from(categories, ([slug, name]) => ({ slug, name }))]
                  .map(({ slug, name }) => {
                    const selected = category === slug;

                    return (
                      <Pressable
                        key={slug ?? 'all-categories'}
                        accessibilityRole="button"
                        accessibilityLabel={slug ? `Filter by ${name}` : 'Show all categories'}
                        accessibilityState={{ selected }}
                        onPress={() => setSelectedCategory(slug)}
                        style={({ pressed }) => [
                          styles.categoryButton,
                          selected && styles.selectedCategory,
                          pressed && shopStyles.pressed,
                        ]}
                      >
                        <Text style={[styles.categoryText, selected && styles.selectedText]}>{name}</Text>
                      </Pressable>
                    );
                  })}
              </ScrollView>
            </View>
          ) : null}

          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {category ? categories.get(category) : 'All products'}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: 16 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feature: {
    backgroundColor: '#242220',
    borderRadius: 18,
    padding: 16,
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureCopy: { flex: 1, gap: 5 },
  featureTitle: { color: Colors.white, fontSize: 23, fontWeight: '700', letterSpacing: -0.4 },
  featureText: { color: '#ded8d0', fontSize: 13, lineHeight: 19 },
  featureImage: { width: '29%', maxWidth: 118, borderRadius: 10 },
  categorySection: { gap: 9 },
  categoryRow: { gap: 8 },
  categoryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 22,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#e2e2e2',
  },
  selectedCategory: { backgroundColor: '#242220', borderColor: '#242220' },
  categoryText: { color: Colors.black, fontSize: 14, fontWeight: '600' },
  selectedText: { color: Colors.white },
  sectionTitle: { color: Colors.black, fontSize: 18, fontWeight: '700' },
});
