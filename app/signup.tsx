
import React, { useState } from 'react';

import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import { router, Stack } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/Colors';
import Inputfeild from './components/inputfeild';
import SocialLoginButton from './components/Auth/SocialLoginButton';
import { registerUser } from './service/authService';

type ApiErrorResponse = {
  error?: string;
  detail?: string;
  message?: string;
};

const Signup = () => {
  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  // UI states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Signup API function
  const handleSignup = async () => {
    setErrorMessage('');

    // 1. Validate empty fields
    if (
      !username.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    // 2. Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    // 3. Validate password
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      // 4. Send registration data to backend
      const response = await registerUser({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password,
      });

      console.log('REGISTRATION SUCCESSFUL:', response);

      // 5. Navigate to signin after successful registration
      console.log('REGISTRATION SUCCESSFUL:', response);

      setIsRegistered(true);

    } catch (error: unknown) {
      console.log('REGISTRATION ERROR:', error);

      if (axios.isAxiosError(error)) {
        const data = error.response?.data as
          | ApiErrorResponse
          | undefined;

        const message =
          data?.error ||
          data?.detail ||
          data?.message ||
          'Registration failed. Please try again.';

        setErrorMessage(message);
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }

    } finally {
      setLoading(false);
    }
  };

  // Signup screen UI

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: isRegistered ? 'Account Created' : 'Sign Up',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={24} color={Colors.black} />
            </TouchableOpacity>
          ),
        }}
      />

      {isRegistered ? (
        <View style={styles.successContainer}>
          <Ionicons
            name="checkmark-circle"
            size={85}
            color="#22C55E"
          />

          <Text style={styles.successTitle}>
            Account Created Successfully!
          </Text>

          <Text style={styles.successMessage}>
            Your ShopX account has been created successfully.
            You can now sign in using your credentials.
          </Text>

          <TouchableOpacity
            style={styles.btntext}
            onPress={() => router.replace('/signin')}
          >
            <Text style={styles.btntext1}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <Text style={styles.title}>Create An Account</Text>

            <Text style={styles.subtitle}>
              Create your account to get started.
            </Text>

            <Inputfeild
              placeholder="Username"
              placeholderTextColor={Colors.gray}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Inputfeild
              placeholder="Email"
              placeholderTextColor={Colors.gray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Inputfeild
              placeholder="Password"
              placeholderTextColor={Colors.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Inputfeild
              placeholder="Confirm Password"
              placeholderTextColor={Colors.gray}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            {errorMessage ? (
              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.btntext,
                loading && styles.disabledButton,
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.btntext1}>
                  Create Account
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.socialContainer}>
            <SocialLoginButton emailHref="/signin" />
          </View>
        </ScrollView>
      )}
    </>
  );

};

export default Signup;

// Styles
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 35,
    paddingBottom: 30,
  },

  form: {
    width: '100%',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 8,
    marginVertical: 100
  },

  subtitle: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 28,
  },

  closeButton: {
    padding: 5,
  },

  btntext: {
    height: 54,
    backgroundColor: Colors.black,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  btntext1: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 50
  },

  disabledButton: {
    opacity: 0.6,
  },

  errorText: {
    color: 'red',
    fontSize: 13,
    marginTop: 10,
  },

  socialContainer: {
    marginTop: 25,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.black,
    textAlign: 'center',
    marginTop: 20,
  },

  successMessage: {
    fontSize: 15,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 12,
    marginBottom: 25,
  },
});
