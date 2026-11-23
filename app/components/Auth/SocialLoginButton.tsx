
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Logo from '../../../assets/images/google-logo.svg';

type Props = {
    emailHref?: Href;
};

const SocialLoginButton = ({
    emailHref = '/signup',
}: Props) => {
    return (
        <Animated.View
            entering={FadeInDown.duration(1200)}
            style={styles.wrapper}
        >
            {/* Email Button */}
            <Link href={emailHref} asChild>
                <TouchableOpacity style={styles.button}>
                    <Ionicons
                        name="mail-outline"
                        size={25}
                        color={Colors.black}
                    />
                    <Text style={styles.buttonText}>
                        Continue with Email
                    </Text>
                </TouchableOpacity>
            </Link>

            {/* Google Button */}
            <TouchableOpacity style={styles.button}>
                <Logo width={25} height={23} />
                <Text style={styles.buttonText}>
                    Continue with Google
                </Text>
            </TouchableOpacity>

            {/* Apple Button */}
            <TouchableOpacity style={styles.button}>
                <Ionicons
                    name="logo-apple"
                    size={22}
                    color={Colors.black}
                />
                <Text style={styles.buttonText}>
                    Continue with Apple
                </Text>
            </TouchableOpacity>

            {/* Sign In */}

        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        paddingHorizontal: 20,
        alignItems: 'center',
        paddingBottom: 20,
    },

    button: {
        backgroundColor: 'white',
        width: '100%',
        height: 55,
        borderRadius: 11,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        marginVertical: 5,
        paddingHorizontal: 18,
        alignSelf: 'center',
        gap: 10,
    },

    buttonText: {
        color: Colors.black,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1.1,
    },
    signText: {
        fontSize: 13,
        fontWeight: '500',
    },

});

export default SocialLoginButton;
