import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function HelpCentreScreen() {
    const router = useRouter();
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    const helpItems = [
        {
            id: "1",
            title: "FAQs",
            content:
                "Here are the frequently asked questions and their answers. You can find information about account management, booking services, and troubleshooting common issues.",
        },
        {
            id: "2",
            title: "Report a problem",
            content:
                "To report a problem, please provide detailed information including screenshots if possible. Our support team will respond within 24 hours.",
        },
        {
            id: "3",
            title: "App walkthrough",
            content:
                "This walkthrough will guide you step-by-step on how to navigate the app, book services, manage payments, and use all features efficiently.",
        },
        {
            id: "4",
            title: "Contact support",
            content:
                "You can contact support via email at 2243364@gmail.com or via in-app chat.",
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => selectedItem ? setSelectedItem(null) : router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help Centre</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {!selectedItem ? (
                    // LIST VIEW
                    helpItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.item}
                            onPress={() => setSelectedItem(item.id)}
                        >
                            <Text style={styles.itemText}>{item.title}</Text>
                            <Ionicons name="chevron-forward" size={18} color="#777" />
                        </TouchableOpacity>
                    ))
                ) : (
                    // DETAIL VIEW
                    <View style={styles.detailContainer}>
                        <Text style={styles.detailTitle}>{helpItems.find(i => i.id === selectedItem)?.title}</Text>
                        <Text style={styles.detailContent}>{helpItems.find(i => i.id === selectedItem)?.content}</Text>
                        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedItem(null)}>
                            <Text style={styles.backText}>Back</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/service_home")}><Ionicons name="home-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/apply_child_service")}><Ionicons name="calendar-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/help_centre")}><Ionicons name="search-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/notification")}><Ionicons name="chatbubble-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/account")}><Ionicons name="person-outline" size={24} color="#8e44ad" /></TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: { backgroundColor: "#b58dde", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, paddingTop: 45 },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },

    scroll: { paddingBottom: 100, paddingHorizontal: 20 },
    item: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
    itemText: { color: "#333", fontSize: 15 },

    detailContainer: { paddingVertical: 20 },
    detailTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12, color: "#333" },
    detailContent: { fontSize: 15, color: "#555", lineHeight: 22 },
    backButton: { marginTop: 20, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#b58dde", borderRadius: 20 },
    backText: { color: "#fff", fontWeight: "600", fontSize: 14 },

    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
});
