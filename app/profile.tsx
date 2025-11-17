import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const ProfileScreen: React.FC = () => {
    const router = useRouter();
    const [facebookLinked, setFacebookLinked] = useState(true);
    const [googleLinked, setGoogleLinked] = useState(true);

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/account")}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* PROFILE IMAGE + NAME */}
                <View style={styles.profileSection}>
                    <Ionicons name="person-circle" size={120} color="#b58dde" />
                    <View style={styles.nameRow}>
                        <Text style={styles.profileName}>Tony Stark</Text>
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
                        <Text style={styles.infoValue}>0918•••••279</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </View>

                    {/* Email */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email Address:</Text>
                        <Text style={styles.infoValue}>tonystark@gmail.com</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </View>

                    {/* Gender */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Gender:</Text>
                        <Text style={styles.infoValue}>Male</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </View>
                </View>

                {/* LINKED ACCOUNTS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Linked Accounts:</Text>

                    <View style={styles.linkRow}>
                        <Image
                            source={require("../assets/Facebook_Logo.png")}
                            style={styles.icon}
                        />
                        <Text style={styles.linkLabel}>Facebook</Text>
                        <Switch
                            trackColor={{ false: "#ccc", true: "#b58dde" }}
                            thumbColor="#fff"
                            value={facebookLinked}
                            onValueChange={setFacebookLinked}
                        />
                    </View>

                    <View style={styles.linkRow}>
                        <Image
                            source={require("../assets/Google_Logo.png")}
                            style={styles.icon}
                        />
                        <Text style={styles.linkLabel}>Google</Text>
                        <Switch
                            trackColor={{ false: "#ccc", true: "#b58dde" }}
                            thumbColor="#fff"
                            value={googleLinked}
                            onValueChange={setGoogleLinked}
                        />
                    </View>
                </View>

                {/* LOGOUT BUTTON */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={() => router.push("/")}
                >
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* BOTTOM NAVIGATION */}
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
        fontWeight: "600" },

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

    infoLabel: { fontSize: 14, color: "#444" },
    infoValue: { fontSize: 14, color: "#777", flex: 1, textAlign: "right", marginRight: 10 },

    linkRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },

    icon: { width: 25, height: 25, marginRight: 10 },

    linkLabel: {
        flex: 1,
        fontSize: 14,
        color: "#444",
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
});
