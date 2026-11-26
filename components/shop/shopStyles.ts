import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/Colors';

export const shopStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  title: { color: Colors.black, fontSize: 30, fontWeight: '700', letterSpacing: -0.7 },
  bodyText: { color: Colors.gray, fontSize: 14, lineHeight: 20 },
  surface: { backgroundColor: Colors.white, borderWidth: 1, borderColor: '#e2e2e2', borderRadius: 16 },
  button: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: { color: Colors.white, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.7 },
});

export const priceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
