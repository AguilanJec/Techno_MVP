import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function PaymentMethodsScreen() {
    const router = useRouter();

    const [methods, setMethods] = useState([
        { id: "1", type: "Credit Card", last4: "1234" },
        { id: "2", type: "Paypal", last4: "" },
        { id: "3", type: "Gcash", last4: "5678" },
    ]);

    const addPayment = () => {
        Alert.alert("Add Payment", "This will open payment setup screen.");
    };

    const removePayment = (id: string) => {
        Alert.alert(
            "Remove Payment",
            "Are you sure you want to remove this payment method?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => setMethods(methods.filter((m) => m.id !== id)),
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment Methods</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                contentContainerStyle={styles.scroll}
                data={methods}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.item}>
                        <View>
                            <Text style={styles.itemText}>{item.type}</Text>
                            {item.last4 ? <Text style={styles.itemRight}>**** {item.last4}</Text> : null}
                        </View>
                        <TouchableOpacity onPress={() => removePayment(item.id)}>
                            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                        </TouchableOpacity>
                    </View>
                )}
            />

            <TouchableOpacity style={styles.addButton} onPress={addPayment}>
                <Text style={styles.addButtonText}>Add Payment Method</Text>
            </TouchableOpacity>

            {/* Bottom Nav */}
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

    scroll: { paddingBottom: 120, paddingHorizontal: 20, paddingTop: 10 },
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

    addButton: {
        backgroundColor: "#b58dde",
        padding: 14,
        borderRadius: 20,
        alignItems: "center",
        marginHorizontal: 20,
        marginVertical: 10,
    },
    addButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
});
