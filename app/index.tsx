import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";

export default function SplashScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            {/* Decorative bubbles */}
            <View style={[styles.bubble, styles.bubble1]} />
            <View style={[styles.bubble, styles.bubble2]} />
            <View style={[styles.bubble, styles.bubble3]} />

            {/* Main content */}
            <Image
                source={require("../assets/Hirayag_Logo.png")}
                style={styles.logo}
                resizeMode="contain"
            />
            <Text style={styles.title}>Hirayág</Text>

            <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace("/login")} // replace ensures no back cache
            >
                <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4EDFF", // soft background
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    logo: {
        width: 220,
        height: 220,
        marginBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: "700",
        marginBottom: 50,
        color: "#4B3C88",
    },
    button: {
        backgroundColor: "#BFA2E0",
        paddingVertical: 14,
        paddingHorizontal: 80,
        borderRadius: 30,
        elevation: 3,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
    },
    bubble: {
        position: "absolute",
        borderRadius: 9999,
        opacity: 0.3,
    },
    bubble1: {
        width: 250,
        height: 250,
        backgroundColor: "#BFA2E0",
        top: -60,
        left: -60,
    },
    bubble2: {
        width: 180,
        height: 180,
        backgroundColor: "#FFD6E0",
        bottom: 50,
        right: -40,
    },
    bubble3: {
        width: 120,
        height: 120,
        backgroundColor: "#FFF1B5",
        top: 120,
        right: 80,
    },
});
