import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function TermsConditions() {
    const { onAccept } = useLocalSearchParams(); // optional callback from register screen

    return (
        <View style={styles.container}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.header}>Terms & Condition</Text>

            {/* Scrollable Terms */}
            <ScrollView style={styles.scrollBox}>
                <Text style={styles.title}>Hirayág - Terms and Agreement</Text>

                <Text style={styles.paragraph}>
                    Welcome to <Text style={styles.bold}>Hirayág</Text>, a platform designed to provide
                    support and services for the care and development of children with special needs. By
                    using our application, you agree to the following terms and conditions:
                </Text>

                <Text style={styles.section}>1. Acceptance of Terms</Text>
                <Text style={styles.paragraph}>
                    By accessing or using <Text style={styles.bold}>Hirayág</Text>, you agree to these Terms
                    and Agreement. If you do not agree, please discontinue use of the application.
                </Text>

                <Text style={styles.section}>2. Purpose of the Application</Text>
                <Text style={styles.paragraph}>
                    <Text style={styles.bold}>Hirayág</Text> is designed to connect parents, guardians, and
                    caregivers with resources and services for children with special needs. The platform is
                    for informational and organizational purposes only and should not replace professional
                    medical or therapeutic advice.
                </Text>

                <Text style={styles.section}>3. User Responsibilities</Text>
                <Text style={styles.bullet}>• Provide accurate and truthful information when registering.</Text>
                <Text style={styles.bullet}>• Ensure the safety and well-being of the child under your care.</Text>
                <Text style={styles.bullet}>• Do not misuse the platform for unrelated purposes.</Text>

                <Text style={styles.section}>4. Privacy & Data Protection</Text>
                <Text style={styles.paragraph}>
                    <Text style={styles.bold}>Hirayág</Text> values your privacy. Any personal information
                    you provide will be kept confidential and used only for service-related purposes. We do
                    not sell or share your data with unauthorized third parties.
                </Text>

                <Text style={styles.section}>5. Limitation of Liability</Text>
                <Text style={styles.paragraph}>
                    <Text style={styles.bold}>Hirayág</Text> does not provide medical treatment, diagnosis, or
                    guaranteed outcomes. The application and its content are provided “as is.” We are not
                    liable for any damages or issues arising from the misuse of the platform.
                </Text>
            </ScrollView>

            {/* Accept / Decline Buttons */}
            <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.button, styles.decline]} onPress={() => router.back()}>
                    <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.accept]}
                    onPress={() => {
                        // After accepting, go back and trigger sign up
                        router.replace({
                            pathname: "/register",
                            params: { accepted: "true" },
                        });
                    }}
                >
                    <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#EDE0FF",
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    backButton: {
        position: "absolute",
        top: 50,
        left: 20,
    },
    backText: {
        color: "#6A4BBC",
        fontSize: 16,
    },
    header: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#6A4BBC",
        marginBottom: 15,
        textAlign: "center",
    },
    scrollBox: {
        backgroundColor: "#fff",
        borderRadius: 15,
        padding: 15,
        height: "70%",
    },
    title: {
        fontWeight: "bold",
        fontSize: 16,
        marginBottom: 10,
    },
    section: {
        fontWeight: "bold",
        marginTop: 10,
        marginBottom: 5,
    },
    paragraph: {
        marginBottom: 10,
        textAlign: "justify",
        color: "#333",
    },
    bullet: {
        marginLeft: 10,
        marginBottom: 5,
        color: "#333",
    },
    bold: {
        fontWeight: "bold",
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginHorizontal: 5,
    },
    decline: {
        backgroundColor: "#E0D4F7",
    },
    accept: {
        backgroundColor: "#6A4BBC",
    },
    declineText: {
        fontWeight: "bold",
        color: "#333",
    },
    acceptText: {
        fontWeight: "bold",
        color: "#fff",
    },
});
