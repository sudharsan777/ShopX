import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/components/auth/SessionProvider';
import { shopStyles } from '@/components/shop/shopStyles';
import { Colors } from '@/constants/Colors';
import type { UserProfile } from '@/types/auth.types';
import { getUserProfile } from '../service/authService';

export default function ProfileScreen() {
  const { accessToken, signOut } = useSession();
  const navigation = useNavigation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  useEffect(() => {
    if (!accessToken || loggingOut) return;
    const controller = new AbortController();

    getUserProfile(accessToken, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setProfile(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfileError(true);
      });

    return () => controller.abort();
  }, [accessToken, attempt, loggingOut]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(false);

    try {
      const rootStack = navigation.getParent();
      await signOut();
      setProfile(null);
      rootStack?.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'signin' }] }));
    } catch {
      setLogoutError(true);
      setLoggingOut(false);
    }
  };

  const username = profile?.username;
  const initial = username ? Array.from(username)[0].toLocaleUpperCase() : '';

  return (
    <SafeAreaView style={shopStyles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={shopStyles.title}>Profile</Text>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            {initial ? <Text style={styles.initial}>{initial}</Text> : (
              <Ionicons name="person-outline" size={26} color="#f6e9d8" />
            )}
          </View>
          {profile ? (
            <Text style={styles.username}>{username || 'ShopX member'}</Text>
          ) : profileError ? (
            <View style={styles.identityDetails}>
              <Text accessibilityRole="alert" style={styles.identityMessage}>Couldn’t load your profile.</Text>
              <Pressable
                accessibilityRole="button"
                disabled={loggingOut}
                style={styles.retry}
                onPress={() => {
                  setProfileError(false);
                  setAttempt(previous => previous + 1);
                }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <ActivityIndicator accessibilityLabel="Loading profile" color={Colors.white} />
          )}
        </View>

        {profile?.email ? (
          <View style={[shopStyles.surface, styles.emailCard]}>
            <View style={styles.emailIcon}>
              <Ionicons name="mail-outline" size={20} color={Colors.black} />
            </View>
            <View style={styles.details}>
              <Text style={styles.emailLabel}>Email address</Text>
              <Text selectable style={shopStyles.bodyText}>{profile.email}</Text>
            </View>
          </View>
        ) : null}

        {logoutError ? (
          <Text accessibilityRole="alert" style={shopStyles.bodyText}>Couldn’t log out. Please try again.</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Logout"
          accessibilityState={{ busy: loggingOut, disabled: loggingOut }}
          disabled={loggingOut}
          onPress={handleLogout}
          style={({ pressed }) => [shopStyles.button, styles.logout, (pressed || loggingOut) && shopStyles.pressed]}
        >
          {loggingOut ? <ActivityIndicator color={Colors.white} /> : (
            <>
              <Ionicons name="log-out-outline" size={20} color={Colors.white} />
              <Text style={shopStyles.buttonText}>Logout</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 16, gap: 16 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 118,
    gap: 16,
    backgroundColor: '#242220',
    borderRadius: 18,
    padding: 18,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#47403a',
    borderWidth: 1,
    borderColor: '#6d5d4e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: { color: '#f6e9d8', fontSize: 24, fontWeight: '700' },
  username: { flex: 1, color: Colors.white, fontSize: 23, fontWeight: '700' },
  identityDetails: { flex: 1 },
  identityMessage: { color: Colors.white, fontSize: 14 },
  retry: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingEnd: 16 },
  retryText: { color: '#f6e9d8', fontWeight: '700' },
  emailCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  emailIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: { flex: 1, gap: 2 },
  emailLabel: { color: Colors.black, fontSize: 14, fontWeight: '700' },
  logout: { flexDirection: 'row', minHeight: 48, gap: 8 },
});
