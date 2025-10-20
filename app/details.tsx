import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Details() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Service Details</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Service Card */}
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Ionicons name="person-circle-outline" size={60} color="#b58dde" />
                        <View style={styles.info}>
                            <Text style={styles.name}>Peter Parker</Text>
                            <Text style={styles.details}>📍 0.5 km away</Text>
                            <Text style={styles.details}>⭐ 5.0 | 12 reviews</Text>
                        </View>
                        <View style={styles.priceContainer}>
                            <Ionicons name="heart" size={20} color="red" />
                            <Text style={styles.price}>₱5</Text>
                            <Text style={styles.perHour}>per hour</Text>
                        </View>
                    </View>

                    <View style={styles.buttons}>
                        <TouchableOpacity style={styles.badge}>
                            <Text style={styles.badgeText}>Full-time</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.messageBtn}>
                            <Ionicons name="chatbubbles-outline" size={14} color="#fff" />
                            <Text style={styles.messageText}>Message now</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Job Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Job description</Text>
                    <Text style={styles.paragraph}>
                        I am a compassionate and responsible nanny with experience in babysitting and providing
                        dedicated care for children, including those with special needs. My goal is to create a safe,
                        nurturing, and supportive environment where the child feels comfortable and encouraged to grow.
                    </Text>
                </View>

                {/* Skills & Experience */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Skills & Experience</Text>
                    <View style={styles.bulletList}>
                        {[
                            "Hands-on experience in babysitting children with unique needs.",
                            "Skilled in assisting with daily routines such as feeding, bathing, dressing, and mobility support.",
                            "Familiar with administering medications and following special care instructions.",
                            "Ability to engage children in learning and play activities tailored to their developmental level.",
                            "Knowledge of CPR and First Aid, ensuring the child’s safety at all times.",
                            "Patient, empathetic, and reliable with a deep passion for child care.",
                        ].map((skill, index) => (
                            <View key={index} style={styles.bulletItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.bulletText}>{skill}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Appointment Button */}
                <TouchableOpacity style={styles.appointmentButton}>
                    <Text style={styles.appointmentText}>Set Appointment</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/")}>
                    <Ionicons name="home-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/")}>
                    <Ionicons name="calendar-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/")}>
                    <Ionicons name="search-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/")}>
                    <Ionicons name="person-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
        backgroundColor: "#b58dde",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginLeft: 10 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    row: { flexDirection: "row", alignItems: "center" },
    info: { flex: 1, marginLeft: 10 },
    name: { fontSize: 18, fontWeight: "600", color: "#333" },
    details: { fontSize: 13, color: "#777" },
    priceContainer: { alignItems: "flex-end" },
    price: { fontSize: 18, fontWeight: "600", color: "#8e44ad" },
    perHour: { fontSize: 11, color: "#777" },
    buttons: { flexDirection: "row", marginTop: 10 },
    badge: {
        backgroundColor: "#f0e6ff",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        marginRight: 8,
    },
    badgeText: { color: "#8e44ad", fontSize: 12, fontWeight: "500" },
    messageBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#8e44ad",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    messageText: { color: "#fff", fontSize: 12, marginLeft: 4 },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 6 },
    paragraph: {
        fontSize: 13,
        color: "#555",
        backgroundColor: "#f9f9f9",
        padding: 10,
        borderRadius: 8,
    },
    bulletList: { marginTop: 8 },
    bulletItem: { flexDirection: "row", marginBottom: 6 },
    bullet: { fontSize: 14, color: "#8e44ad", marginRight: 6 },
    bulletText: { flex: 1, fontSize: 13, color: "#555" },
    appointmentButton: {
        backgroundColor: "#b58dde",
        borderRadius: 25,
        paddingVertical: 12,
        alignItems: "center",
        marginTop: 10,
    },
    appointmentText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 12,
        borderTopWidth: 1,
        borderColor: "#eee",
    },
});
