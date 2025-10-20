import { ScrollView, View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function LoginScreen() {
    const router = useRouter();

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.topSection}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text>Back</Text>
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

                <TextInput style={styles.input} placeholder="Phone or Email" />
                <TextInput style={styles.input} placeholder="Password" secureTextEntry />

                <TouchableOpacity style={styles.loginButton} onPress={() => router.replace("/")}>
                    <Text style={styles.loginButtonText}>Log In</Text>
                </TouchableOpacity>

                <Text style={styles.orText}>or sign in with</Text>
                <View style={styles.socialRow}>
                    <TouchableOpacity style={styles.socialButton}>
                        <Image source={require("../assets/Facebook_Logo.png")} style={styles.socialIcon} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialButton}>
                        <Image source={require("../assets/Google_Logo.png")} style={styles.socialIcon} />
                    </TouchableOpacity>
                </View>

h                <View style={styles.registerRow}>
                    <Text style={styles.registerText}>Don’t have an account? </Text>
                    <TouchableOpacity onPress={() => router.push("/register")}>
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
