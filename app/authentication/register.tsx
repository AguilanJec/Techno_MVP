import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";

export default function RegisterScreen() {
    const navigation = useNavigation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // State for validation feedback
    const [passwordError, setPasswordError] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");
    const [emailError, setEmailError] = useState("");

    // State for input styling
    const [passwordValid, setPasswordValid] = useState(true);
    const [confirmPasswordValid, setConfirmPasswordValid] = useState(true);
    const [emailValid, setEmailValid] = useState(true);

    // Validate password in real-time
    useEffect(() => {
        if (password.length > 0 && password.length < 6) {
            setPasswordError("Password must be at least 6 characters");
            setPasswordValid(false);
        } else {
            setPasswordError("");
            setPasswordValid(true);
        }

        if (password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword) {
            setConfirmPasswordError("Passwords do not match");
            setConfirmPasswordValid(false);
        } else {
            setConfirmPasswordError("");
            setConfirmPasswordValid(true);
        }
    }, [password, confirmPassword]);

    const handleSignUp = () => {
        let valid = true;

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            setEmailError("Email is required");
            setEmailValid(false);
            valid = false;
        } else if (!emailRegex.test(email)) {
            setEmailError("Please enter a valid email");
            setEmailValid(false);
            valid = false;
        } else {
            setEmailError("");
            setEmailValid(true);
        }

        // Validate password
        if (!password) {
            setPasswordError("Password is required");
            setPasswordValid(false);
            valid = false;
        } else if (password.length < 6) {
            setPasswordError("Password must be at least 6 characters");
            setPasswordValid(false);
            valid = false;
        } else {
            setPasswordError("");
            setPasswordValid(true);
        }

        // Validate confirm password
        if (!confirmPassword) {
            setConfirmPasswordError("Please confirm your password");
            setConfirmPasswordValid(false);
            valid = false;
        } else if (password !== confirmPassword) {
            setConfirmPasswordError("Passwords do not match");
            setConfirmPasswordValid(false);
            valid = false;
        } else {
            setConfirmPasswordError("");
            setConfirmPasswordValid(true);
        }

        if (valid) {
            // Navigate to Role Selection page with user info
            router.push({
                pathname: "/authentication/role",
                params: {
                    email: String(email),
                    password: String(password),
                    confirmPassword: String(confirmPassword),
                },
            });
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <Image
                source={require("../../assets/Hirayag_Logo.png")}
                style={styles.logo}
                resizeMode="contain"
            />

            <Text style={styles.title}>Sign Up</Text>
            <Text style={styles.subtitle}>Create your Account</Text>

            {/* Email Input */}
            <TextInput
                style={[styles.input, !emailValid && styles.inputError]}
                placeholder="Email"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            {/* Password Input */}
            <TextInput
                style={[styles.input, !passwordValid && styles.inputError]}
                placeholder="Password"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            {/* Confirm Password Input */}
            <TextInput
                style={[styles.input, !confirmPasswordValid && styles.inputError]}
                placeholder="Confirm Password"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />
            {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

            <TouchableOpacity
                style={styles.signUpButton}
                onPress={() => {
                    if (!email || !password || !confirmPassword) {
                        Alert.alert("Error", "Please fill out all fields.");
                        return;
                    }

                    if (password.length < 6) {
                        Alert.alert("Password Too Weak", "Password must be at least 6 characters long.");
                        return;
                    }

                    if (password !== confirmPassword) {
                        Alert.alert("Error", "Passwords do not match.");
                        return;
                    }

                    // Navigate to Terms & Conditions page with user info
                    router.push({
                        pathname: "/authentication/terms_conditions",
                        params: {
                            email,
                            password,
                            confirmPassword,
                        },
                    });
                }}
            >
                <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.divider} />
            </View>

            <Text style={styles.socialText}>sign up with</Text>
            <View style={styles.socialContainer}>
                <TouchableOpacity style={styles.socialButton}>
                    <Image source={require("../../assets/Facebook_Logo.png")} style={styles.socialIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                    <Image source={require("../../assets/Google_Logo.png")} style={styles.socialIcon} />
                </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>
                Already have an account?{" "}
                <Text style={styles.loginLink} onPress={() => router.push("/login")}>
                    Login
                </Text>
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#EDE0FF",
        alignItems: "center",
        paddingTop: 80,
    },
    backButton: {
        position: "absolute",
        top: 50,
        left: 20,
    },
    backText: {
        fontSize: 16,
        color: "#333",
    },
    logo: {
        width: 160,
        height: 160,
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#6A4BBC",
        marginTop: 10,
    },
    subtitle: {
        fontSize: 14,
        color: "#444",
        marginBottom: 20,
    },
    input: {
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 12,
        marginBottom: 5, // Reduced margin
        fontSize: 16,
        elevation: 2,
    },
    inputError: {
        borderColor: "#FF0000",
        borderWidth: 2,
        backgroundColor: "#FFE6E6", // Light red background
    },
    errorText: {
        width: "80%",
        color: "#FF0000",
        fontSize: 12,
        marginBottom: 10,
        paddingLeft: 10,
    },
    signUpButton: {
        backgroundColor: "#B7A1E5",
        borderRadius: 10,
        paddingVertical: 12,
        width: "80%",
        alignItems: "center",
        marginTop: 10,
    },
    signUpText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 15,
    },
    divider: {
        height: 1,
        width: 60,
        backgroundColor: "#aaa",
    },
    orText: {
        marginHorizontal: 8,
        color: "#444",
    },
    socialText: {
        fontSize: 14,
        color: "#444",
    },
    socialContainer: {
        flexDirection: "row",
        marginVertical: 10,
    },
    socialButton: {
        marginHorizontal: 10,
    },
    socialIcon: {
        width: 40,
        height: 40,
    },
    footerText: {
        marginTop: 15,
        color: "#444",
    },
    loginLink: {
        color: "#6A4BBC",
        fontWeight: "bold",
    },
});