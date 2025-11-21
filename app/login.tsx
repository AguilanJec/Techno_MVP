import React, { useState, useEffect } from "react";
import {
    ScrollView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithCredential,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "../firebaseConfig";
// --- ADD THESE IMPORTS ---
import { getDoc, doc } from "firebase/firestore"; // Import getDoc and doc
import { db } from "../firebaseConfig"; // Import your db instance
// --- END OF NEW IMPORTS ---
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const router = useRouter();
    const navigation = useNavigation();

    // --- GOOGLE SIGN-IN CONFIG ---
    // Make sure promptAsync is destructured here
    const [request, response, promptAsync] =
        Platform.OS === "ios"
            ? [null, null, () => Alert.alert("Google login is not available on iOS yet.")]
            : Google.useAuthRequest({
                webClientId: "308001835959-7m2cefe3rpp9l1lj0m3v2veo0aeai1da.apps.googleusercontent.com",
                androidClientId: "308001835959-1hpdmie9dfth2h7rvkdsuujetg13kfis.apps.googleusercontent.com",
            });

    useEffect(() => {
        if (response?.type === "success") {
            const { id_token } = response.params;
            const credential = GoogleAuthProvider.credential(id_token);

            signInWithCredential(auth, credential)
                .then(() => {
                    Alert.alert("Success", "Logged in with Google!");
                    // You might want to fetch user role here too for Google login
                    // For now, default to home or implement role check
                    router.replace("/user/home");
                })
                .catch((error) => {
                    console.error(error);
                    Alert.alert("Error", error.message);
                });
        }
    }, [response]);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // --- EMAIL/PASSWORD LOGIN ---
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter both email and password.");
            return;
        }

        try {
            console.log(email, password);
            await signInWithEmailAndPassword(auth, email, password);

            // After successful login, fetch user data to determine role
            const user = auth.currentUser;
            if (user) {
                let userData = null;
                let userRole = null;

                // First, try to get data from the 'users' collection (for parents)
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    userData = userDoc.data();
                    userRole = userData.role;
                } else {
                    // If not found in 'users', try 'providers' collection (for babysitters/tutors)
                    const providerDoc = await getDoc(doc(db, "providers", user.uid));
                    if (providerDoc.exists()) {
                        userData = providerDoc.data();
                        userRole = userData.role; // Role should be saved here in edit_address_provider
                    }
                }

                if (userData) {
                    // Check the role from either collection
                    if (userRole === "babysitting" || userRole === "tutoring") {
                        router.push("/service_home"); // Navigate service providers to their home
                    } else {
                        // Default to parent home or handle other roles if needed
                        router.push("/user/home");
                    }
                } else {
                    // Handle case where user doc doesn't exist in either collection
                    Alert.alert("Error", "User data not found. Please contact support.");
                }
            } else {
                // This shouldn't happen after successful signIn, but just in case
                Alert.alert("Error", "Login failed. Please try again.");
            }

        } catch (error) {
            console.error("Login error:", error);

            if (error instanceof FirebaseError) {
                switch (error.code) {
                    case "auth/invalid-credential":
                    case "auth/wrong-password":
                        Alert.alert("Error", "Invalid email or password.");
                        break;
                    case "auth/user-not-found":
                        Alert.alert("Error", "No account found with this email.");
                        break;
                    case "auth/invalid-email":
                        Alert.alert("Error", "Invalid email format.");
                        break;
                    case "auth/too-many-requests":
                        Alert.alert("Error", "Too many failed attempts. Try again later.");
                        break;
                    default:
                        Alert.alert("Error", error.message);
                        break;
                }
            } else {
                Alert.alert("Error", "An unexpected error occurred. Please try again.");
            }
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.topSection}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.push("/")}
                >
                    <Text>← Back</Text>
                </TouchableOpacity>
                <Image
                    source={require("../assets/Hirayag_Logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            <View style={styles.formContainer}>
                <Text style={styles.loginTitle}>Log In</Text>
                <Text style={styles.subText}>Login to your Account</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                    <Text style={styles.loginButtonText}>Log In</Text>
                </TouchableOpacity>

                <Text style={styles.orText}>or sign in with</Text>

                <View style={styles.socialRow}>
                    <TouchableOpacity style={styles.socialButton} onPress={() => promptAsync()}>
                        <Image
                            source={require("../assets/Google_Logo.png")}
                            style={styles.socialIcon}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.registerRow}>
                    <Text style={styles.registerText}>Don’t have an account? </Text>
                    <TouchableOpacity onPress={() => router.push("/authentication/register")}>
                        <Text style={styles.registerLink}>Register</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: "#fff" },
    topSection: {
        backgroundColor: "#E8D8F5",
        alignItems: "center",
        paddingVertical: 50,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    backButton: { position: "absolute", top: 40, left: 20 },
    logo: { width: 180, height: 180 },
    formContainer: { padding: 25 },
    loginTitle: { fontSize: 22, fontWeight: "bold", color: "#7B52AB", textAlign: "center" },
    subText: { textAlign: "center", marginBottom: 20 },
    input: {
        borderWidth: 1,
        borderColor: "#DDD",
        borderRadius: 10,
        padding: 12,
        marginVertical: 8,
    },
    loginButton: {
        backgroundColor: "#BFA2E0",
        padding: 14,
        borderRadius: 10,
        marginTop: 10,
    },
    loginButtonText: { textAlign: "center", color: "#fff", fontWeight: "600" },
    orText: { textAlign: "center", marginVertical: 15 },
    socialRow: { flexDirection: "row", justifyContent: "center", gap: 20 },
    socialButton: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#DDD",
        borderRadius: 10,
        padding: 10,
    },
    socialIcon: { width: 30, height: 30 },
    registerRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 20,
    },
    registerText: { color: "#000" },
    registerLink: {
        color: "#7B52AB",
        fontWeight: "bold",
        textDecorationLine: "underline",
    },
});
