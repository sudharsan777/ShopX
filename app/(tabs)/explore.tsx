import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useCatalog } from '@/components/shop/CatalogProvider';
import ProductGrid from '@/components/shop/ProductGrid';
import { shopStyles } from '@/components/shop/shopStyles';
import { Colors } from '@/constants/Colors';

export default function ExploreScreen() {
  const { products, requestState } = useCatalog();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = products.filter(product => {
    const searchableText = [product.name, product.category, product.material, product.description]
      .join(' ')
      .toLowerCase();
    return terms.every(term => searchableText.includes(term));
  });

  const search = () => {
    setQuery(input.trim());
    Keyboard.dismiss();
  };

  return (
    <ProductGrid
      products={results}
      emptyMessage={query ? 'No products match your search' : undefined}
      header={(
        <View style={styles.header}>
          <Text accessibilityRole="header" style={shopStyles.title}>Explore</Text>
          <View style={styles.searchRow}>
            <View style={[shopStyles.surface, styles.field]}>
              <Ionicons name="search-outline" size={20} color={Colors.gray} />
              <TextInput
                accessibilityLabel="Search catalog"
                placeholder="Search products"
                placeholderTextColor={Colors.gray}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={search}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              {input || query ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  style={styles.clear}
                  onPress={() => {
                    setInput('');
                    setQuery('');
                  }}
                >
                  <Ionicons name="close-circle" size={19} color={Colors.gray} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={search}
              style={({ pressed }) => [shopStyles.button, pressed && shopStyles.pressed]}
            >
              <Text style={shopStyles.buttonText}>Search</Text>
            </Pressable>
          </View>
          {requestState === 'ready' ? (
            <Text accessibilityLiveRegion="polite" style={shopStyles.bodyText}>
              {results.length} {results.length === 1 ? 'product' : 'products'}{query ? ` for “${query}”` : ''}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: 13 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 11, borderRadius: 10 },
  input: { flex: 1, color: Colors.black, paddingVertical: 9, minHeight: 46, fontSize: 14 },
  clear: { minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
});
