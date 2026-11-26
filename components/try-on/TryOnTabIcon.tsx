import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export default function TryOnTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.icon, focused && styles.selected]}>
      <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
        <Defs>
          <LinearGradient id="try-on-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={focused ? '#ffe7a2' : '#bd872b'} />
            <Stop offset="52%" stopColor={focused ? '#dfae53' : '#926019'} />
            <Stop offset="100%" stopColor={focused ? '#f8ce80' : '#ad751d'} />
          </LinearGradient>
        </Defs>
        <Path d="M2 3h6.6v1.3H7.1l5.7 12.2 5.1-12.2h-2V3H22v1.3h-1.7L12.9 22h-1.4L3.3 4.3H2z" fill="url(#try-on-gold)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { height: 25, width: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: '#332615' },
});
