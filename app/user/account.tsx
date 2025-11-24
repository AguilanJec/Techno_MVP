import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

export default function AccountScreen() {
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch user data from Firestore
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        setUserData(userDoc.data());
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/user/home")}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Account</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* ACCOUNT INFO */}
                <View style={styles.section}>
                    <View style={styles.profileContainer}>
                        <Ionicons name="person-circle-outline" size={70} color="#b58dde" />
                        <View>
                            <Text style={styles.profileName}>
                                {loading ? "Loading..." : (userData?.name || "Tony Stark")}
                            </Text>
                            <Text style={styles.profileEmail}>
                                {userData?.email || ""}
                            </Text>
                            <TouchableOpacity style={styles.profileButton} onPress={() => router.push("/profile")}>
                                <Text style={styles.profileButtonText}>View full profile</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ACCOUNT LINKS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <TouchableOpacity style={styles.item} onPress={() => router.push("/user/bookinglists")}>
                        <Text style={styles.itemText}>My bookings</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.item} onPress={() => router.push("/message")}>
                        <Text style={styles.itemText}>My messages</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.item} >
                        <View style={styles.locationItem}>
                            <Text style={styles.itemText}>My location</Text>
                            {userData?.address && (
                                <Text style={styles.locationAddress} numberOfLines={1}>
                                    {userData.address}
                                </Text>
                            )}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                </View>

                {/* SUPPORT */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    <TouchableOpacity style={styles.item} onPress={() => router.push("/feedback")}>
                        <Text style={styles.itemText}>Help centre</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                </View>

                {/* PREFERENCES */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <TouchableOpacity style={styles.itemRow}>
                        <Text style={styles.itemText}>Language</Text>
                        <Text style={styles.itemRight}>English (Philippines)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.itemRow}>
                        <Text style={styles.itemText}>Currency</Text>
                        <Text style={styles.itemRight}>₱ (PHP)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.item}>
                        <Text style={styles.itemText}>Notification</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                </View>

                {/* PAYMENT */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment</Text>
                    <TouchableOpacity style={styles.item}>
                        <Text style={styles.itemText}>Payment methods</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* BOTTOM NAVIGATION BAR */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/user/home")}>
                    <Ionicons name="home-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/bookinglists")}>
                    <Ionicons name="calendar-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/search")}>
                    <Ionicons name="search-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/message")}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/account")}>
                    <Ionicons name="person" size={24} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
        backgroundColor: "#b58dde",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 45,
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
    scroll: { paddingBottom: 80 },
    section: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 8,
        borderBottomColor: "#f2f2f2",
    },
    sectionTitle: { fontWeight: "700", fontSize: 16, marginBottom: 10, color: "#333" },
    profileContainer: { flexDirection: "row", alignItems: "center" },
    profileName: { fontSize: 18, fontWeight: "600", color: "#333" },
    profileEmail: { fontSize: 14, color: "#777", marginTop: 2 },
    profileButton: {
        backgroundColor: "#b58dde",
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 6,
    },
    profileButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
    item: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    locationItem: {
        flex: 1,
    },
    locationAddress: {
        fontSize: 12,
        color: "#777",
        marginTop: 4,
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    itemText: { color: "#333", fontSize: 15 },
    itemRight: { color: "#777", fontSize: 14 },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff",
    },
});