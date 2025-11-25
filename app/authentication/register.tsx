import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { auth, db } from "../../firebaseConfig";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";


export default function RegisterScreen() {
    const navigation = useNavigation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Error messages
    const [passwordError, setPasswordError] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");
    const [emailError, setEmailError] = useState("");

    // Input validation
    const [passwordValid, setPasswordValid] = useState(true);
    const [confirmPasswordValid, setConfirmPasswordValid] = useState(true);
    const [emailValid, setEmailValid] = useState(true);

    // Live validation
    useEffect(() => {
        if (password.length > 0 && password.length < 6) {
            setPasswordError("Password must be at least 6 characters");
            setPasswordValid(false);
        } else {
            setPasswordError("");
            setPasswordValid(true);
        }

        if (confirmPassword.length > 0 && password !== confirmPassword) {
            setConfirmPasswordError("Passwords do not match");
            setConfirmPasswordValid(false);
        } else {
            setConfirmPasswordError("");
            setConfirmPasswordValid(true);
        }
    }, [password, confirmPassword]);



    const handleSignUp = async () => {
        let valid = true;

        const cleanEmail = email.trim().toLowerCase();

        // Strict email validation
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

        // Email validation
        if (!cleanEmail) {
            setEmailError("Email is required");
            setEmailValid(false);
            valid = false;
        } else if (!emailRegex.test(cleanEmail)) {
            setEmailError("Please enter a valid email");
            setEmailValid(false);
            valid = false;
        } else {
            setEmailError("");
            setEmailValid(true);
        }

        // Password validation
        if (!password) {
            setPasswordError("Password is required");
            setPasswordValid(false);
            valid = false;
        } else if (password.length < 6) {
            setPasswordError("Password must be at least 6 characters");
            setPasswordValid(false);
            valid = false;
        }

        // Confirm password validation
        if (!confirmPassword) {
            setConfirmPasswordError("Please confirm your password");
            setConfirmPasswordValid(false);
            valid = false;
        } else if (password !== confirmPassword) {
            setConfirmPasswordError("Passwords do not match");
            setConfirmPasswordValid(false);
            valid = false;
        }

        if (!valid) return;

        try {
            // 1️⃣ Check Firebase Auth users
            const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
            if (methods.length > 0) {
                setEmailError("Email already in use");
                setEmailValid(false);
                Alert.alert("Account Exists", "This email is already registered.");
                return;
            }

            // 2️⃣ Check Firestore users table
            const usersRef = collection(db, "users");
            const checkUser = query(usersRef, where("email", "==", cleanEmail));
            const userSnap = await getDocs(checkUser);

            if (!userSnap.empty) {
                setEmailError("Email already exists in users");
                setEmailValid(false);
                Alert.alert("Account Exists", "This email is already used by another user.");
                return;
            }

            // 3️⃣ Check Firestore providers table
            const providersRef = collection(db, "providers");
            const checkProvider = query(providersRef, where("email", "==", cleanEmail));
            const providerSnap = await getDocs(checkProvider);

            if (!providerSnap.empty) {
                setEmailError("Email already exists in providers");
                setEmailValid(false);
                Alert.alert("Account Exists", "This email is already used by a provider.");
                return;
            }

            // If all checks pass → move to Terms & Conditions
            router.push({
                pathname: "/authentication/terms_conditions",
                params: { email: cleanEmail, password, confirmPassword },
            });

        } catch (error) {
            console.log("Sign Up Error:", error);
            Alert.alert("Error", "Something went wrong. Please try again later.");
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

            <TextInput
                style={[styles.input, !passwordValid && styles.inputError]}
                placeholder="Password"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            <TextInput
                style={[styles.input, !confirmPasswordValid && styles.inputError]}
                placeholder="Confirm Password"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />
            {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

            {/* ⬇️ FIX: use handleSignUp */}
            <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
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
    container: { flex: 1, backgroundColor: "#EDE0FF", alignItems: "center", paddingTop: 80 },
    backButton: { position: "absolute", top: 50, left: 20 },
    backText: { fontSize: 16, color: "#333" },
    logo: { width: 160, height: 160 },
    title: { fontSize: 26, fontWeight: "bold", color: "#6A4BBC", marginTop: 10 },
    subtitle: { fontSize: 14, color: "#444", marginBottom: 20 },
    input: { width: "80%", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 5, fontSize: 16, elevation: 2 },
    inputError: { borderColor: "#FF0000", borderWidth: 2, backgroundColor: "#FFE6E6" },
    errorText: { width: "80%", color: "#FF0000", fontSize: 12, marginBottom: 10, paddingLeft: 10 },
    signUpButton: { backgroundColor: "#B7A1E5", borderRadius: 10, paddingVertical: 12, width: "80%", alignItems: "center", marginTop: 10 },
    signUpText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
    dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: 15 },
    divider: { height: 1, width: 60, backgroundColor: "#aaa" },
    orText: { marginHorizontal: 8, color: "#444" },
    socialText: { fontSize: 14, color: "#444" },
    socialContainer: { flexDirection: "row", marginVertical: 10 },
    socialButton: { marginHorizontal: 10 },
    socialIcon: { width: 40, height: 40 },
    footerText: { marginTop: 15, color: "#444" },
    loginLink: { color: "#6A4BBC", fontWeight: "bold" },
});
