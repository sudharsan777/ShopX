
import React from 'react';
import {
  StyleSheet,
  Text,
  ImageBackground, View, TouchableOpacity
} from 'react-native';

import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import SocialLoginButton from './components/Auth/SocialLoginButton';
import { Router, Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ImageBackground
        resizeMode="cover"
        style={styles.background}
        source={require('../assets/images/ecommerce-splash.jpg')}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.85)',
            'rgba(255,255,255,1)',
          ]}
          locations={[0, 0.55, 1]}
          style={styles.gradient}
        >
          <Animated.Text
            entering={FadeInDown.duration(800)}
            style={styles.title}
          >
            ShopX
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.duration(800)}
            style={styles.description}
          >
            One Stop Solution for All Your Needs
          </Animated.Text>



          <SocialLoginButton emailHref="/signup" />
          <View style={styles.signbtn}>
            <Text>Already have an Account? </Text>

            <Link href="/signin" asChild>
              <TouchableOpacity>
                <Text style={styles.signLink}>Signin?</Text>
              </TouchableOpacity>
            </Link>
          </View>


        </LinearGradient>

      </ImageBackground>
    </>
  );
}
const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  gradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 35,
  },

  title: {
    width: '100%',
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    alignSelf: 'stretch',
    marginBottom: 5,
  },

  description: {
    width: '100%',
    fontSize: 14,
    color: Colors.gray,
    letterSpacing: 1.1,
    textAlign: 'center',
    alignSelf: 'stretch',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  signbtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  signLink: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
});
