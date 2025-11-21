import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ApplyChildServiceScreen() {
    const router = useRouter();
    const [childName, setChildName] = useState("");
    const [age, setAge] = useState("");
    const [parentName, setParentName] = useState("");
    const [contact, setContact] = useState("");
    const [notes, setNotes] = useState("");

    const submit = () => {
        if (!childName || !age || !parentName || !contact) {
            Alert.alert("Please fill all required fields.");
            return;
        }
        // replace with real submit logic / API call
        console.log({ childName, age, parentName, contact, notes });
        Alert.alert("Application submitted!");
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Apply child service</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.scroll}>
                <Text style={styles.sectionTitle}>Child information</Text>
                <TextInput
                    value={childName}
                    onChangeText={setChildName}
                    placeholder="Child's full name"
                    style={styles.input}
                />

                <TextInput
                    value={age}
                    onChangeText={setAge}
                    placeholder="Age"
                    keyboardType="numeric"
                    style={styles.input}
                />

                <TextInput
                    value={parentName}
                    onChangeText={setParentName}
                    placeholder="Parent / Guardian name"
                    style={styles.input}
                />

                <TextInput
                    value={contact}
                    onChangeText={setContact}
                    placeholder="Contact number"
                    keyboardType="phone-pad"
                    style={styles.input}
                />

                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Service details</Text>
                <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Additional notes"
                    multiline
                    style={[styles.input, { height: 100, textAlignVertical: "top" }]}
                />

                <TouchableOpacity style={styles.submitButton} onPress={submit}>
                    <Text style={styles.submitText}>Submit application</Text>
                </TouchableOpacity>
            </View>

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
    sectionTitle: { fontWeight: "700", fontSize: 16, marginBottom: 10, color: "#333" },

    input: {
        backgroundColor: "#f4f4f4",
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
        fontSize: 14,
    },

    submitButton: {
        backgroundColor: "#b58dde",
        padding: 12,
        borderRadius: 20,
        alignItems: "center",
        marginTop: 6,
    },
    submitText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
});
