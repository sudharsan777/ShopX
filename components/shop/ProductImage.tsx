import React, { useState } from 'react';
import { Image, StyleSheet, View, type ImageResizeMode, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';

export default function ProductImage({ uri, style, resizeMode }: { uri: string; style?: StyleProp<ViewStyle>; resizeMode?: ImageResizeMode }) {
  const [failedUri, setFailedUri] = useState<string>();

  return (
    <View style={[styles.frame, style]}>
      {uri && uri !== failedUri ? (
        <Image resizeMode={resizeMode} source={{ uri }} style={styles.image} onError={() => setFailedUri(uri)} accessible={false} />
      ) : (
        <Ionicons name="image-outline" size={26} color={Colors.gray} accessible={false} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 1,
    backgroundColor: '#eae8e5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
});
