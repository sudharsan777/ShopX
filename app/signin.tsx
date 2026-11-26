import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView, ActivityIndicator
} from 'react-native';

import { Link, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useSession } from '@/components/auth/SessionProvider';
import { Colors } from '@/constants/Colors';
import Inputfeild from './components/inputfeild';
import SocialLoginButton from './components/Auth/SocialLoginButton';
import { loginUser } from '../app/service/authService'

const Signin = () => {
  const { setAccessToken, restoring } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // LOGIN FUNCTION
  const handleLogin = async () => {
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);

      const response = await loginUser({
        username: email.trim().toLowerCase(),
        password: password,
      });

      setAccessToken(response.access);
      router.replace('/(tabs)');

    } catch (error: unknown) {
      console.log('LOGIN ERROR:', error);

      if (axios.isAxiosError(error)) {
        const data = error.response?.data;

        const message =
          data?.detail ||
          data?.message ||
          'Invalid email or password. Please try again.';

        setErrorMessage(
          typeof message === 'string'
            ? message
            : 'Invalid login credentials.',
        );
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }

    } finally {
      setLoading(false);
    }
  };

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
        <View style={styles.form}>
          <Text style={styles.title}>Login Your Account</Text>

          <Inputfeild
            placeholder="Email address"
            placeholderTextColor={Colors.gray}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Inputfeild
            placeholder="Password"
            placeholderTextColor={Colors.gray}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            secureTextEntry
          />

          {errorMessage ? (
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>
          ) : null}

          <Link href="/(tabs)" asChild>
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotText}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </Link>

          <TouchableOpacity
            style={[
              styles.btntext,
              loading && styles.disabledButton,
            ]}
            onPress={handleLogin}
            disabled={loading || restoring}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.btntext1}>Login</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.socialContainer}>
          <SocialLoginButton emailHref="/signup" />
        </View>
      </ScrollView>
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

  disabledButton: {
    opacity: 0.6,
  },

  errorText: {
    color: 'red',
    fontSize: 13,
    marginTop: 12,
    alignSelf: 'flex-start',
  },

  socialContainer: {
    width: '100%',
  },
});

export default Signin;