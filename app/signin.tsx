import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';

import { Link, router, Stack, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import Inputfeild from './components/inputfeild';
import SocialLoginButton from './components/Auth/SocialLoginButton';

const Signin = () => {
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Login',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons
                name="close"
                size={24}
                color={Colors.black}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Login Your Account</Text>

          <Inputfeild
            placeholder="Email address"
            placeholderTextColor={Colors.gray}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Inputfeild
            placeholder="Password"
            placeholderTextColor={Colors.gray}
            autoCapitalize="none"
            secureTextEntry
          />

          <Link href="/(tabs)" asChild>
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/(tabs)" asChild>
            <TouchableOpacity style={styles.btntext}>
              <Text style={styles.btntext1}>Login</Text>
            </TouchableOpacity>
          </Link>
        </View>


        {/* Social Login */}
        <View style={styles.socialContainer}>
          <SocialLoginButton emailHref="/signup" />
        </View>
      </ScrollView >
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 35,
    paddingHorizontal: 20,
  },

  form: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 35,
  },

  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: Colors.black,
    marginBottom: 35,
  },

  forgotPassword: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: 10,
  },

  forgotText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  btntext: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 7,
    alignSelf: 'center',
    marginTop: 25,
    width: '100%',
    alignItems: 'center',
  },

  btntext1: {
    color: Colors.white,
    fontWeight: '600',
  },

  socialContainer: {
    width: '100%',
  },
});

export default Signin;