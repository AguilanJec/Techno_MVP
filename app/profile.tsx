import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";

const ProfileScreen: React.FC = () => {
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [googleLinked, setGoogleLinked] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
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

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut(auth);
                            router.push("/authentication/login");
                        } catch (error) {
                            console.error("Error signing out:", error);
                            Alert.alert("Error", "Failed to logout. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const formatPhoneNumber = (phone: string) => {
        if (!phone) return "0918•••••279";
        if (phone.length <= 4) return phone;
        return `${phone.slice(0, 4)}•••••${phone.slice(-3)}`;
    };

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/user/account")}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* PROFILE IMAGE + NAME */}
                <View style={styles.profileSection}>
                    {userData?.picture ? (
                        <Image
                            source={{
                                uri: userData.picture.trim(),
                            }}
                            style={styles.profileImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <Ionicons name="person-circle" size={120} color="#b58dde" />
                    )}
                    <View style={styles.nameRow}>
                        <Text style={styles.profileName}>
                            {loading ? "Loading..." : (userData?.name || "Tony Stark")}
                        </Text>
                        <TouchableOpacity>
                            <Ionicons name="pencil" size={18} color="#000" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    </View>
                </View>


                {/* PERSONAL INFORMATION */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    {/* Contact Number */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Contact Number:</Text>
                        <Text style={styles.infoValue}>
                            {userData?.phone ? formatPhoneNumber(userData.phone) : "0918•••••279"}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </View>

                    {/* Email */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email Address:</Text>
                        <Text style={styles.infoValue}>
                            {userData?.email || "tonystark@gmail.com"}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </View>

                    {/* Address */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Address:</Text>
                        <Text style={[styles.infoValue, { flex: 2 }]} numberOfLines={1}>
                            {userData?.address || "Not set"}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </View>
                </View>

                {/* LINKED ACCOUNTS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Linked Accounts</Text>

                    <View style={styles.linkRow}>
                        <Image
                            source={require("../assets/Google_Logo.png")}
                            style={styles.icon}
                        />
                        <View style={styles.linkContent}>
                            <Text style={styles.linkLabel}>Google</Text>
                            {googleLinked ? (
                                <Text style={styles.connectedText}>Connected</Text>
                            ) : null}
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.connectButton,
                                googleLinked ? styles.connectedButton : styles.disconnectedButton
                            ]}
                            onPress={() => setGoogleLinked(!googleLinked)}
                        >
                            <Text style={[
                                styles.connectButtonText,
                                googleLinked ? styles.connectedButtonText : styles.disconnectedButtonText
                            ]}>
                                {googleLinked ? "Disconnect" : "Connect"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* LOGOUT BUTTON */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* BOTTOM NAVIGATION */}
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
                <TouchableOpacity onPress={() => router.push("/user/message")}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/account")}>
                    <Ionicons name="person-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ProfileScreen;

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
    headerTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600"
    },
    scroll: { padding: 16 },
    profileSection: {
        alignItems: "center",
        marginBottom: 20,
        marginTop: 10,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
    },
    profileName: {
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: 1,
    },
    section: {
        marginTop: 10,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#eee",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 10,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    infoLabel: { fontSize: 14, color: "#444", width: 120 },
    infoValue: {
        fontSize: 14,
        color: "#777",
        flex: 1,
        textAlign: "right",
        marginRight: 10
    },
    linkRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    linkContent: {
        flex: 1,
        marginLeft: 10,
    },
    icon: {
        width: 25,
        height: 25
    },
    linkLabel: {
        fontSize: 14,
        color: "#444",
        fontWeight: "500",
    },
    connectedText: {
        fontSize: 12,
        color: "#4CAF50",
        marginTop: 2,
    },
    connectButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
    },
    connectedButton: {
        backgroundColor: "#f5f5f5",
        borderColor: "#ddd",
    },
    disconnectedButton: {
        backgroundColor: "#b58dde",
        borderColor: "#b58dde",
    },
    connectButtonText: {
        fontSize: 12,
        fontWeight: "600",
    },
    connectedButtonText: {
        color: "#666",
    },
    disconnectedButtonText: {
        color: "#fff",
    },
    logoutButton: {
        backgroundColor: "#b58dde",
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 20,
        alignSelf: "center",
        width: "60%",
    },
    logoutText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center",
    },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff",
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
});