import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TextInputProps,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AuthInputProps = TextInputProps & {
    label: string;
    error?: string;
    isPassword?: boolean;
};

const AuthInput = ({
    label,
    error,
    isPassword = false,
    ...inputProps
}: AuthInputProps) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <View style={styles.wrapper}>
            <Text style={styles.label}>{label}</Text>

            <View
                style={[
                    styles.inputContainer,
                    error ? styles.inputError : undefined,
                ]}
            >
                <TextInput
                    style={styles.input}
                    placeholderTextColor="#999"
                    secureTextEntry={isPassword && !showPassword}
                    autoCapitalize="none"
                    {...inputProps}
                />

                {isPassword && (
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={21}
                            color="#777"
                        />
                    </TouchableOpacity>
                )}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

export default AuthInput;

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 18,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#222",
        marginBottom: 8,
    },
    inputContainer: {
        height: 54,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        paddingHorizontal: 15,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: "#222",
    },
    inputError: {
        borderColor: "#E53935",
    },
    errorText: {
        color: "#E53935",
        fontSize: 12,
        marginTop: 5,
    },
});