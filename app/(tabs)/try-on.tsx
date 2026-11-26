import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, AppState, Image, Linking, PermissionsAndroid, Platform,
  Pressable, ScrollView, StyleSheet, Text, View, type ViewProps,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { requireOptionalNativeModule } from 'expo';
import { requireNativeViewManager } from 'expo-modules-core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog } from '@/components/shop/CatalogProvider';
import ProductImage from '@/components/shop/ProductImage';
import { bracelets, modes, supportsTryOn, type Mode } from '@/components/try-on/catalog';

type CameraStatus = 'starting' | 'searching' | 'tracking' | 'cameraError' | 'noCamera' | 'modelError' | 'permission';
type Cameras = { front: boolean; rear: boolean };

const native = Platform.OS === 'android' ?
  requireOptionalNativeModule<{ getCameras: () => Cameras }>('ShopXTryOn') : null;
const CameraView = native ? requireNativeViewManager<ViewProps & {
  active: boolean;
  front: boolean;
  productId: number;
  onTrackingStatus: (event: { nativeEvent: { status: CameraStatus } }) => void;
}>('ShopXTryOn') : undefined;

const permission = PermissionsAndroid.PERMISSIONS.CAMERA;

export default function TryOnScreen() {
  const { products, requestState, loadProducts } = useCatalog();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const focused = useIsFocused();
  const { top } = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('earrings');
  const [front, setFront] = useState(true);
  const [chosenId, setChosenId] = useState<number>();
  const [cameras, setCameras] = useState<Cameras>();
  const [granted, setGranted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(Boolean(native));
  const [requesting, setRequesting] = useState(false);
  const [status, setStatus] = useState<CameraStatus>('starting');
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [attempt, setAttempt] = useState(0);
  const available = mode === 'bracelet' ? bracelets : products.filter(item => supportsTryOn(item, mode));
  const product = available.find(item => item.id === chosenId) ?? available[0];
  const active = focused && appActive;
  const useFront = cameras?.front && cameras?.rear ? front : Boolean(cameras?.front);
  const canSwitch = cameras?.front && cameras?.rear;
  const modeInfo = modes.find(item => item.id === mode)!;

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!native || !active) return;
    let current = true;
    PermissionsAndroid.check(permission)
      .then(value => {
        if (current) setGranted(value);
      })
      .catch(() => { if (current) setGranted(false); })
      .finally(() => { if (current) setChecking(false); });
    Promise.resolve()
      .then(() => native.getCameras())
      .then(value => { if (current) setCameras(value); })
      .catch(() => { if (current) setCameras({ front: false, rear: false }); });
    return () => { current = false; };
  }, [active]);

  useEffect(() => {
    if (!focused || !productId) return;
    const item = products.find(candidate => String(candidate.id) === productId);
    const match = item && modes.find(candidate => supportsTryOn(item, candidate.id));
    if (!item || !match) return;
    setChosenId(item.id);
    setMode(match.id);
    setFront(match.id !== 'ring' && match.id !== 'bracelet');
    setStatus('starting');
  }, [focused, productId, products]);

  const askPermission = async () => {
    setRequesting(true);
    try {
      const result = await PermissionsAndroid.request(permission);
      setGranted(result === PermissionsAndroid.RESULTS.GRANTED);
      setBlocked(result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
      setStatus('starting');
    } catch {
      setGranted(false);
    } finally {
      setRequesting(false);
    }
  };

  const hasCamera = cameras?.front || cameras?.rear;
  const canPreview = active && granted && hasCamera && product && CameraView;
  const failed = status === 'cameraError' || status === 'modelError' || status === 'noCamera';

  let message = status === 'tracking' ? 'Tracking' : modeInfo.guidance;
  let action: { label: string; run: () => void } | undefined;

  if (!CameraView) {
    message = Platform.OS === 'android' ? 'Open the ShopX Android development build to use the camera.' :
      'Live Try On is available on Android.';
  } else if (checking) {
    message = 'Checking camera access…';
  } else if (!granted || status === 'permission') {
    message = 'Allow camera access to try on jewellery.';
    action = blocked ? { label: 'Open settings', run: () => { void Linking.openSettings(); } } :
      { label: 'Enable camera', run: () => { void askPermission(); } };
  } else if (cameras && !hasCamera) {
    message = 'No front or rear camera is available.';
  } else if (requestState === 'error' && !product) {
    message = 'Couldn’t load the Try On catalog.';
    action = { label: 'Retry', run: () => { void loadProducts(); } };
  } else if (!product) {
    message = requestState === 'loading' || requestState === 'refreshing' ?
      'Loading jewellery…' : 'No verified Try On items in this category.';
  } else if (failed) {
    message = status === 'modelError' ? 'Landmark tracking could not start.' :
      status === 'noCamera' ? 'This camera is unavailable.' : 'The camera could not start.';
    action = { label: 'Retry camera', run: () => { setStatus('starting'); setAttempt(value => value + 1); } };
  } else if (status === 'starting') {
    message = 'Starting camera…';
  }

  return (
    <View style={styles.screen}>
      {canPreview && CameraView ? (
        <CameraView
          key={attempt}
          style={StyleSheet.absoluteFill}
          active={active}
          front={useFront}
          productId={product.id}
          onTrackingStatus={event => setStatus(event.nativeEvent.status)}
        />
      ) : null}
      <LinearGradient pointerEvents="none" colors={['#14100fcf', '#14100f00']} style={styles.topShade} />
      <View style={[styles.top, { paddingTop: top + 7 }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>Try On</Text>
          {canSwitch ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={useFront ? 'Switch to rear camera' : 'Switch to front camera'}
              onPress={() => { setStatus('starting'); setFront(!useFront); }}
              style={styles.switch}
            >
              <Ionicons name="camera-reverse-outline" size={23} color="#fff3db" />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.filters}>
          {modes.map(item => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === item.id }}
              onPress={() => {
                if (item.id === mode) return;
                setStatus('starting');
                setChosenId(undefined);
                setFront(item.id !== 'ring' && item.id !== 'bracelet');
                setMode(item.id);
              }}
              style={[styles.filter, mode === item.id && styles.filterSelected]}
            >
              <Text style={[styles.filterText, mode === item.id && styles.filterTextSelected]}>{item.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {action ? (
        <View style={styles.notice}>
          <Ionicons name="camera-outline" size={27} color="#e9c582" />
          <Text style={styles.noticeText}>{message}</Text>
          <Pressable accessibilityRole="button" onPress={action.run} style={styles.action} disabled={requesting}>
            {requesting ? <ActivityIndicator color="#251b13" /> : <Text style={styles.actionText}>{action.label}</Text>}
          </Pressable>
        </View>
      ) : null}

      <View style={styles.bottom}>
        <LinearGradient pointerEvents="none" colors={['#14100f00', '#14100feb', '#14100f']} style={StyleSheet.absoluteFill} />
        {action ? null : (
          <View style={styles.guidance}>
            <View style={[styles.statusDot, status === 'tracking' && canPreview && styles.trackingDot]} />
            <Text accessibilityLiveRegion="polite" style={styles.guidanceText}>{message}</Text>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.products}>
          {available.map(item => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              accessibilityState={{ selected: item.id === product?.id }}
              onPress={() => {
                if (item.id !== product?.id) setStatus('starting');
                setChosenId(item.id);
              }}
              style={[styles.item, item.id === product?.id && styles.itemSelected]}
            >
              {'thumbnail' in item ? (
                <Image source={item.thumbnail} style={styles.modelThumbnail} resizeMode="contain" />
              ) : <ProductImage uri={item.image_url} style={styles.thumbnail} />}
              <Text numberOfLines={2} style={styles.itemText}>{item.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'space-between', backgroundColor: '#14100f' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 210 },
  top: { paddingHorizontal: 14, gap: 8 },
  header: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff3db', fontSize: 33, fontWeight: '700', letterSpacing: -0.9 },
  switch: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#211916dd', borderColor: '#efd39a66', borderWidth: 1,
  },
  filters: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filter: {
    minHeight: 44, borderRadius: 24, borderWidth: 1, borderColor: '#d7b97755',
    backgroundColor: '#211916e6', paddingHorizontal: 11, justifyContent: 'center',
  },
  filterSelected: { backgroundColor: '#edcc8d', borderColor: '#edcc8d' },
  filterText: { color: '#fff0d6', fontSize: 13, fontWeight: '600' },
  filterTextSelected: { color: '#281a10' },
  notice: {
    alignSelf: 'center', width: '86%', maxWidth: 340, backgroundColor: '#251e1bf5',
    padding: 20, borderRadius: 17, alignItems: 'center', gap: 12,
  },
  noticeText: { color: '#fff3db', textAlign: 'center', fontSize: 16 },
  action: { backgroundColor: '#edcc8d', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12 },
  actionText: { color: '#281a10', fontWeight: '700' },
  bottom: { gap: 9, paddingTop: 16, paddingBottom: 11 },
  guidance: {
    alignSelf: 'center', maxWidth: '94%', backgroundColor: '#211916e8', borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 7,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#9f8361' },
  trackingDot: { backgroundColor: '#efce85' },
  guidanceText: { color: '#fff3db', flexShrink: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  products: { paddingHorizontal: 14, gap: 9 },
  item: { width: 117, flexDirection: 'row', alignItems: 'center', padding: 6, gap: 6, borderRadius: 11, borderWidth: 1, borderColor: '#746452', backgroundColor: '#211916' },
  itemSelected: { borderColor: '#f3cd7e', backgroundColor: '#3d2b1a' },
  modelThumbnail: { width: 38, height: 38, borderRadius: 6, backgroundColor: '#e9ddca' },
  thumbnail: { width: 38, borderRadius: 6, backgroundColor: '#e9ddca' },
  itemText: { color: '#fff3db', flex: 1, fontSize: 10, fontWeight: '700' },
});
