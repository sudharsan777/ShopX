import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import axios from 'axios';

import { useSession } from '@/components/auth/SessionProvider';
import { fetchProduct, useCatalog } from '@/components/shop/CatalogProvider';
import { stockLimit, useCart } from '@/components/shop/CartProvider';
import ProductImage from '@/components/shop/ProductImage';
import { priceFormatter } from '@/components/shop/shopStyles';
import { modes, supportsTryOn } from '@/components/try-on/catalog';
import type { CatalogProduct } from '@/types/catalog.types';

const gold = '#8a611f';

function IconButton({ icon, label, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.icon}>
    <Ionicons name={icon} size={23} color={gold} />
  </Pressable>;
}

function ZoomImage({ uri, close }: { uri: string; close: () => void }) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const pinch = Gesture.Pinch().onUpdate(event => {
    scale.value = Math.max(1, Math.min(4, saved.value * event.scale));
  }).onEnd(() => { saved.value = scale.value; });
  const animation = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const step = (change: number) => {
    const next = Math.max(1, Math.min(4, saved.value + change));
    saved.value = next;
    scale.value = withTiming(next, { duration: 140 });
  };

  return <Modal visible animationType="fade" onRequestClose={close}>
    <GestureHandlerRootView style={styles.screen}>
      <SafeAreaView style={styles.zoomScreen}>
        <View style={[styles.toolbar, styles.zoomToolbar]}>
          <IconButton icon="close" label="Close image" onPress={close} />
          <View style={styles.inline}>
            <IconButton icon="remove" label="Zoom out" onPress={() => step(-.5)} />
            <IconButton icon="add" label="Zoom in" onPress={() => step(.5)} />
          </View>
        </View>
        <GestureDetector gesture={pinch}>
          <Animated.View style={[styles.zoomImage, animation]}>
            <ProductImage uri={uri} style={styles.photo} resizeMode="contain" />
          </Animated.View>
        </GestureDetector>
      </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, restoring } = useSession();
  if (restoring) return <View style={styles.screen} />;
  if (!accessToken) return <Redirect href="/signin" />;
  return <ProductContent key={id} id={Number(id)} />;
}

function ProductContent({ id }: { id: number }) {
  const { width } = useWindowDimensions();
  const { products, favorites, toggleFavorite } = useCatalog();
  const { add, lines } = useCart();
  const [product, setProduct] = useState<CatalogProduct>();
  const [state, setState] = useState<'loading' | 'error' | 'missing' | 'ready'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoom, setZoom] = useState<string>();
  const [imageIndex, setImageIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const galleryWidth = Math.min(width, 640);

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) { setState('missing'); return; }
    const request = new AbortController();
    fetchProduct(id, request.signal).then(result => {
      if (!request.signal.aborted) { setProduct(result); setState('ready'); }
    }).catch(error => {
      if (!request.signal.aborted) setState(axios.isAxiosError(error) && error.response?.status === 404 ? 'missing' : 'error');
    });
    return () => request.abort();
  }, [attempt, id]);

  const back = () => router.canGoBack() ? router.back() : router.replace('/(tabs)');
  const liked = favorites.includes(id);
  const share = async (item: CatalogProduct) => {
    try {
      await Share.share({ message: `${item.name}\n${Linking.createURL(`product/${id}`)}` });
    } catch { Alert.alert('Sharing unavailable', 'Please try again.'); }
  };

  const inCart = lines.find(line => line.product.id === id)?.quantity ?? 0;
  const limit = product ? Math.min(stockLimit(product) - inCart, Number.MAX_SAFE_INTEGER) : 0;
  const selected = Math.min(quantity, Math.max(1, limit));
  const available = product && stockLimit(product) > 0;
  const isPurchasable = available && limit > 0 && Number.isFinite(product.price);
  const images = product ? Array.from(new Set([
    product.image_url,
    ...(Array.isArray(product.images) ? product.images.map(image => typeof image === 'string' ? image : image?.image_url) : []),
  ].filter((image): image is string => typeof image === 'string' && image.length > 0))) : [];
  const related = product ? products.filter(item => item.id !== id && item.category_slug === product.category_slug).slice(0, 8) : [];
  const canTryOn = product && modes.some(mode => supportsTryOn(product, mode.id));
  const specs = product ? [
    ['Gold purity', product.gold_purity], ['Weight', product.weight],
    ['Material', product.material], ['Size', product.size],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '') : [];
  const discount = product ? product.discount_percentage ??
    (typeof product.original_price === 'number' && product.original_price > product.price
      ? Math.round((1 - product.price / product.original_price) * 100) : 0) : 0;
  const price = (value: number) => `${product?.currency ? product.currency + ' ' : ''}${priceFormatter.format(value)}`;

  return <SafeAreaView style={styles.screen}>
    <View style={styles.toolbar}>
      <IconButton icon="arrow-back" label="Back" onPress={back} />
      <Text style={styles.toolbarText}>Product details</Text>
      {product ? <View style={styles.inline}>
        <IconButton icon={liked ? 'heart' : 'heart-outline'} label={liked ? 'Remove from wishlist' : 'Add to wishlist'} onPress={() => toggleFavorite(id)} />
        <IconButton icon="share-outline" label="Share product" onPress={() => void share(product)} />
      </View> : <View style={styles.icon} />}
    </View>
    {state === 'loading' ? <View style={styles.skeleton} accessibilityLabel="Loading product details">
      <View style={[styles.block, styles.skeletonImage]} /><View style={[styles.block, styles.skeletonTitle]} />
      <View style={styles.block} /><View style={styles.block} />
    </View> : !product ? <View style={styles.message}>
      <Text accessibilityRole="alert" style={styles.heading}>{state === 'missing' ? 'Product unavailable' : 'Couldn’t load this product'}</Text>
      <Pressable style={styles.outline} accessibilityRole="button"
        onPress={() => { setState('loading'); setAttempt(value => value + 1); }}>
        <Text style={styles.gold}>Retry</Text>
      </Pressable>
    </View> : <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(180)}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: galleryWidth }}
            onMomentumScrollEnd={event => setImageIndex(Math.round(event.nativeEvent.contentOffset.x / galleryWidth))}>
            {(images.length ? images : ['']).map(uri => (
              <Pressable key={uri} style={{ width: galleryWidth }} disabled={!uri} accessibilityRole="button"
                accessibilityLabel="Zoom product image" onPress={() => setZoom(uri)}>
                <ProductImage uri={uri} style={styles.photo} resizeMode="contain" />
              </Pressable>
            ))}
          </ScrollView>
          {images.length > 1 ? <Text style={styles.indicator}>{Math.min(imageIndex + 1, images.length)} / {images.length}</Text> : null}
        </Animated.View>
        <View style={styles.section}>
          <Text style={styles.gold}>{product.category}</Text>
          <Text accessibilityRole="header" style={styles.name}>{product.name}</Text>
          <View style={styles.inline}>
            <Text style={styles.heading}>{price(product.price)}</Text>
            {typeof product.original_price === 'number' && product.original_price > product.price ?
              <Text style={styles.original}>{price(product.original_price)}</Text> : null}
            {discount > 0 ?
              <Text style={styles.gold}>{discount}% off</Text> : null}
          </View>
          <Text style={styles.muted}>{available ? (Number.isFinite(stockLimit(product)) ? `${stockLimit(product)} available` : 'Available') : 'Out of stock'}</Text>
        </View>
        {product.description?.trim() ? <View style={styles.section}>
          <Text style={styles.heading}>Description</Text><Text style={styles.muted}>{product.description}</Text>
        </View> : null}
        {specs.length ? <View style={styles.section}>
          <Text style={styles.heading}>Specifications</Text>
          {specs.map(([label, value]) => <View key={label} style={styles.between}>
            <Text style={styles.muted}>{label}</Text><Text style={styles.specValue}>{value}</Text>
          </View>)}
        </View> : null}
        <View style={styles.section}>
          <View style={styles.between}>
            <Text style={styles.heading}>Quantity</Text>
            <View style={styles.inline}>
              <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" disabled={selected <= 1}
                onPress={() => { setQuantity(selected - 1); setFeedback(''); }} style={styles.icon}><Text style={styles.gold}>−</Text></Pressable>
              <Text>{available ? selected : 0}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" disabled={!isPurchasable || selected >= limit}
                onPress={() => { setQuantity(selected + 1); setFeedback(''); }} style={styles.icon}><Text style={styles.gold}>+</Text></Pressable>
            </View>
          </View>
          {canTryOn ? <Pressable accessibilityRole="button" style={styles.outline}
            onPress={() => router.navigate({ pathname: '/(tabs)/try-on', params: { productId: String(id) } })}>
            <Text style={styles.gold}>Virtual Try-On</Text>
          </Pressable> : null}
        </View>
        {related.length ? <View style={styles.section}>
          <Text style={styles.heading}>Related jewellery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inline}>
            {related.map(item => <Pressable key={item.id} style={styles.related}
              accessibilityRole="button" accessibilityLabel={`View ${item.name} details`}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(item.id) } })}>
              <ProductImage uri={item.image_url} /><Text numberOfLines={2} style={styles.relatedName}>{item.name}</Text>
            </Pressable>)}
          </ScrollView>
        </View> : null}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.between}>
          <Text style={styles.heading}>Total {price(isPurchasable ? Math.round(product.price * 100) * selected / 100 : 0)}</Text>
          <Text accessibilityLiveRegion="polite" style={styles.muted}>{feedback || (available && limit <= 0 ? 'Stock limit reached' : '')}</Text>
        </View>
        <View style={styles.inline}>
          <Pressable style={[styles.action, !isPurchasable && styles.disabled]} accessibilityRole="button" disabled={!isPurchasable}
            onPress={() => { add(product, selected); setFeedback('Added to cart'); }}>
            <Text style={styles.actionText}>Add to Cart</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityHint="Checkout is currently unavailable" disabled style={[styles.outline, styles.buy]}>
            <Text style={styles.muted}>Buy Now</Text>
          </Pressable>
        </View>
        <Text style={styles.checkoutNote}>Checkout is currently unavailable</Text>
      </View>
      {zoom ? <ZoomImage uri={zoom} close={() => setZoom(undefined)} /> : null}
    </>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, minHeight: 52 },
  toolbarText: { color: '#30281e', fontWeight: '600', flex: 1, textAlign: 'center' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 20 },
  photo: { aspectRatio: 1.12, backgroundColor: '#f6f3ee' },
  indicator: { textAlign: 'center', marginTop: 8, color: '#665b4d' },
  section: { marginHorizontal: 16, paddingVertical: 16, gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e4dcca' },
  name: { color: '#241c14', fontSize: 29, fontWeight: '700' },
  heading: { color: '#30281e', fontSize: 16, fontWeight: '700' },
  gold: { color: gold, fontWeight: '700' },
  muted: { color: '#665b4d', lineHeight: 21 },
  original: { color: '#665b4d', textDecorationLine: 'line-through' },
  specValue: { flexShrink: 1, color: '#30281e' },
  related: { width: 112, borderRadius: 12, backgroundColor: '#f8f5ef', overflow: 'hidden' },
  relatedName: { padding: 8, color: '#30281e', fontWeight: '600' },
  footer: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 14, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#dfd3bc', backgroundColor: '#fff', elevation: 3 },
  action: { flex: 1, minHeight: 48, padding: 10, borderRadius: 12, backgroundColor: '#3f301d', alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#fff8e8', fontWeight: '700' },
  outline: { minHeight: 48, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#d4ba88', alignItems: 'center', justifyContent: 'center' },
  checkoutNote: { color: '#665b4d', fontSize: 12, textAlign: 'right' },
  buy: { flex: 1, opacity: .6 },
  disabled: { opacity: .45 },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20 },
  skeleton: { padding: 16, gap: 12 },
  block: { height: 16, borderRadius: 8, backgroundColor: '#eee9df' },
  skeletonTitle: { width: '65%', height: 28 },
  skeletonImage: { width: '100%', height: undefined, aspectRatio: 1.12 },
  zoomScreen: { flex: 1, justifyContent: 'space-between', backgroundColor: '#fff', overflow: 'hidden' },
  zoomToolbar: { zIndex: 1, backgroundColor: '#fff' },
  zoomImage: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
});
