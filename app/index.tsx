import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";

export default function SplashScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
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
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
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
    },
    button: {
        backgroundColor: "#BFA2E0",
        paddingVertical: 14,
        paddingHorizontal: 80,
        borderRadius: 30,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
    },
});
