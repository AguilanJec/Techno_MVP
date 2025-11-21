import React, {useState} from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function NotificationScreen() {
    const router = useRouter();

    const [notifications] = useState([
        { id: "1", title: "Booking confirmed", desc: "Your booking for 10am is confirmed.", time: "2h" },
        { id: "2", title: "Message from provider", desc: "The tutor replied to your message.", time: "6h" },
        { id: "3", title: "Payment received", desc: "We received your payment.", time: "1d" },
    ]);

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                contentContainerStyle={styles.scroll}
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.item} onPress={() => { /* open notification */ }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <View style={styles.avatar}>
                                <Ionicons name="notifications-outline" size={20} color="#b58dde" />
                            </View>
                            <View>
                                <Text style={styles.itemText}>{item.title}</Text>
                                <Text style={styles.itemRight}>{item.desc}</Text>
                            </View>
                        </View>
                        <Text style={styles.timeText}>{item.time}</Text>
                    </TouchableOpacity>
                )}
            />

            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/service_home")}><Ionicons name="home-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/apply_child_service")}><Ionicons name="calendar-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/help_centre")}><Ionicons name="search-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/notification")}><Ionicons name="chatbubble-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/account")}><Ionicons name="person-outline" size={24} color="#8e44ad" /></TouchableOpacity>
            </View>
        </SafeAreaView>
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

    scroll: { paddingBottom: 100, paddingHorizontal: 20, paddingTop: 10 },
    item: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    itemText: { color: "#333", fontSize: 15, fontWeight: "600" },
    itemRight: { color: "#777", fontSize: 13 },
    timeText: { color: "#999", fontSize: 12 },

    avatar: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: "#fafafa",
        alignItems: "center",
        justifyContent: "center",
    },
    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
});
