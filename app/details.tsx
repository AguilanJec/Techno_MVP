import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

interface Tutor {
    id: string;
    name: string;
    distance: string;
    rate: string;
    rating: number;
    reviews: number;
    bio: string;
    skills: string[];
}

export default function Details() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [tutor, setTutor] = useState<Tutor | null>(null);

    // Ensure id is string
    const tutorId = Array.isArray(id) ? id[0] : id;

    useEffect(() => {
        if (!tutorId) return;

        const fetchTutor = async () => {
            try {
                const ref = doc(db, "providers", tutorId);
                const snap = await getDoc(ref);
                if (snap.exists()) setTutor({ id: snap.id, ...(snap.data() as Omit<Tutor, "id">) });
            } catch (error) {
                console.error("Error fetching tutor:", error);
            }
        };

        fetchTutor();
    }, [tutorId]);

    if (!tutor)
        return <Text style={styles.loading}>Loading tutor details...</Text>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/search")}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Tutor Card */}
                <View style={styles.card}>
                    <Text style={styles.name}>{tutor.name}</Text>
                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={14} color="#777" />
                        <Text style={styles.details}> {tutor.distance}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="star-outline" size={14} color="#FFD700" />
                        <Text style={styles.details}> {tutor.rating} ({tutor.reviews} reviews)</Text>
                    </View>
                    <Text style={styles.rate}>{tutor.rate}</Text>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.paragraph}>{tutor.bio}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Skills</Text>
                    <View style={styles.skillsContainer}>
                        {tutor.skills.map((skill) => (
                            <View key={skill} style={styles.skillPill}>
                                <Text style={styles.skillText}>{skill}</Text>
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
                <TouchableOpacity onPress={() => router.push("/home")}>
                    <Ionicons name="home-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/bookinglists")}>
                    <Ionicons name="calendar-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/search")}>
                    <Ionicons name="search-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/message")}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/account")}>
                    <Ionicons name="person-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5F5F5" },

    header: {
        backgroundColor: "#b58dde", //8e44ad
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 45,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600" },

    loading: { marginTop: 150, textAlign: "center", fontSize: 16, color: "#555" },
    scrollContent: { padding: 20, paddingBottom: 120 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    name: { fontSize: 22, fontWeight: "700", color: "#333", marginBottom: 8 },
    infoRow: { flexDirection: "row", alignItems: "center", marginVertical: 2 },
    details: { fontSize: 14, color: "#777", marginLeft: 4 },
    rate: { fontSize: 18, fontWeight: "600", color: "#b58dde", marginTop: 10 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 6 },
    paragraph: {
        fontSize: 14,
        color: "#555",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 10,
        lineHeight: 20,
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    appointmentButton: {
        backgroundColor: "#b58dde",
        borderRadius: 30,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    appointmentText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 14,
        borderTopWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
    },
    skillsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8, // for spacing between pills
    },
    skillPill: {
        backgroundColor: "#EDE4F7",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 6,
        marginBottom: 6,
    },
    skillText: {
        fontSize: 13,
        color: "#7B52AB",
        fontWeight: "500",
    },

});
