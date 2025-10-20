import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function RegisterScreen() {
    const navigation = useNavigation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    return (
        <View style={styles.container}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            {/* Logo */}
            <Image
                source={require("../assets/Hirayag_Logo.png")} // put your logo here
                style={styles.logo}
                resizeMode="contain"
            />

            {/* Title */}
            <Text style={styles.title}>Sign Up</Text>
            <Text style={styles.subtitle}>Create your Account</Text>

            {/* Input Fields */}
            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />

            {/* Sign Up Button */}
            <TouchableOpacity style={styles.signUpButton}>
                <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.divider} />
            </View>

            {/* Social Buttons */}
            <Text style={styles.socialText}>sign up with</Text>
            <View style={styles.socialContainer}>
                <TouchableOpacity style={styles.socialButton}>
                    <Image source={require("../assets/Facebook_Logo.png")} style={styles.socialIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                    <Image source={require("../assets/Google_Logo.png")} style={styles.socialIcon} />
                </TouchableOpacity>
            </View>

            {/* Login Redirect */}
            <Text style={styles.footerText}>
                Already have an account?{" "}
                <Text
                    style={styles.loginLink}
                    onPress={() => navigation.navigate("Login" as never)}
                >
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
        marginBottom: 10,
        fontSize: 16,
        elevation: 2,
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
