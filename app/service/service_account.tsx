// app/service/service_account.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Platform,
    Image,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth, db } from "../../firebaseConfig"; // Adjust path if needed
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function ServiceAccountScreen() {
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [providerPictureUri, setProviderPictureUri] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Fetch from "providers" collection
                    const userDoc = await getDoc(doc(db, "providers", user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserData(data);

                        // sanitize picture field (handles url(...), data:..., http(s) and raw base64)
                        const pic = sanitizePictureRaw(data?.picture);
                        setProviderPictureUri(pic);
                        console.log("[ServiceAccount] provider picture uri length:", pic ? pic.length : "none");
                    } else {
                        console.log("No provider document found for user ID:", user.uid);
                    }
                } catch (error) {
                    console.error("Error fetching provider data:", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // sanitize base64 -> data uri or url
    const sanitizePictureRaw = (raw?: string | null): string | null => {
        if (!raw) return null;
        let s = String(raw).trim();

        // Remove surrounding quotes if present
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
            s = s.slice(1, -1).trim();
        }

        // Remove url(...) wrapper if present
        const urlMatch = s.match(/^url\(["']?(.*?)["']?\)$/i);
        if (urlMatch) {
            s = urlMatch[1].trim();
        }

        // After stripping wrappers, remove any leftover surrounding quotes again
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
            s = s.slice(1, -1).trim();
        }

        // Quick sanity: too short likely not valid
        if (s.length < 20) return null;

        // Already proper data URI
        if (/^data:image\/[a-zA-Z]+;base64,/.test(s)) {
            return s;
        }

        // Remote URL
        if (/^https?:\/\//i.test(s)) {
            return s;
        }

        // If it *looks* like base64 (only base64 chars and padding), assume raw base64 and prefix
        const cleaned = s.replace(/\s+/g, ""); // remove whitespace/newlines
        if (/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
            return `data:image/jpeg;base64,${cleaned}`;
        }

        // Nothing matched — return null so UI falls back to icon
        return null;
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/login");
        } catch (error) {
            console.error("Error signing out:", error);
            Alert.alert("Error", "Failed to log out. Please try again.");
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#b58dde" />
                <Text style={{ marginTop: 8 }}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/service/service_home")}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Account</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Provider Info Card */}
                <View style={styles.section}>
                    <View style={styles.profileContainer}>
                        {providerPictureUri ? (
                            <Image
                                source={{ uri: providerPictureUri }}
                                style={styles.profileImage}
                                onError={(e) => {
                                    console.error("Provider profile image error:", e.nativeEvent || e);
                                    // if image fails, clear uri so it falls back to icon
                                    setProviderPictureUri(null);
                                }}
                            />
                        ) : (
                            <Ionicons name="person-circle-outline" size={70} color="#b58dde" />
                        )}

                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>
                                {userData?.name || "Unknown Provider"}
                            </Text>
                            <Text style={styles.profileEmail}>
                                {userData?.email || userData?.contactEmail || "No email"}
                            </Text>
                            <TouchableOpacity
                                style={styles.viewProfileButton}
                                onPress={() => router.push("/service/service_profile")}
                            >
                                <Text style={styles.viewProfileButtonText}>View full profile</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Account Links */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => router.push("/service/service_bookings")}
                    >
                        <Text style={styles.itemText}>My bookings</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => router.push("/service/service_message")}
                    >
                        <Text style={styles.itemText}>My messages</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => router.push("/service/service_edit_profile")}
                    >
                        <Text style={styles.itemText}>Edit profile</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => router.push("../service/location")}
                    >
                        <Text style={styles.itemText}>My location</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                </View>

                {/* Support */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => router.push("/feedback")}
                    >
                        <Text style={styles.itemText}>Help centre</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                </View>

                {/* Preferences */}
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

                {/* Logout */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("../service/service_home")}>
                    <Ionicons name="home-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("../service/service_bookings")}>
                    <Ionicons name="calendar-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("../service/service_message")}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("../service/service_account")}>
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
        paddingTop: Platform.OS === "android" ? 45 : 60,
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
    scroll: { paddingVertical: 16, paddingBottom: 140 }, // more bottom padding so content not hidden behind bottom nav
    section: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: "#eee",
    },
    sectionTitle: { fontWeight: "700", fontSize: 16, marginBottom: 10, color: "#333" },
    profileContainer: { flexDirection: "row", alignItems: "center" },
    profileImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#eee",
    },
    profileInfo: { marginLeft: 15, flex: 1 },
    profileName: { fontSize: 18, fontWeight: "600", color: "#333" },
    profileEmail: { fontSize: 14, color: "#777", marginTop: 2 },
    viewProfileButton: {
        backgroundColor: "#b58dde",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 8,
        alignSelf: "flex-start",
    },
    viewProfileButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
    item: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    itemText: { fontSize: 15, color: "#333" },
    itemRight: { fontSize: 14, color: "#777" },
    logoutButton: {
        backgroundColor: "#b58dde",
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 20,
        alignSelf: "center",
        width: "60%",
    },
    logoutText: { color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" },
    bottomNav: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff",
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
});
