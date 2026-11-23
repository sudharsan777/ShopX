
import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';

import { Link, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import Inputfeild from './components/inputfeild';
import SocialLoginButton from './components/Auth/SocialLoginButton';

const Signup = () => {
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Sign Up',
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
        {/* Signup Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Create An Account</Text>

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

          <Inputfeild
            placeholder="Confirm Password"
            placeholderTextColor={Colors.gray}
            autoCapitalize="none"
            secureTextEntry
          />

          <TouchableOpacity style={styles.btntext}>
            <Text style={styles.btntext1}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Social Login */}
        <View style={styles.socialContainer}>
          <SocialLoginButton emailHref="/signin" />
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
    marginBottom: 45,
  },

  btntext: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 7,
    alignSelf: 'center',
    marginTop: 15,
  },

  btntext1: {
    color: Colors.white,
    fontWeight: '600',
  },

  socialContainer: {
    width: '100%',
  },
});

export default Signup;
