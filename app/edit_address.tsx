import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function EditAddress() {
    const router = useRouter();
    const { userLocation } = useLocalSearchParams();

    // FIX: convert string | string[] to string
    const locationValue =
        Array.isArray(userLocation) ? userLocation[0] : String(userLocation || "");

    const [name, setName] = useState("Tony Stark");
    const [phone, setPhone] = useState("9012398765");
    const [addressDetails, setAddressDetails] = useState("");

    return (
        <ScrollView style={{ flex: 1, backgroundColor: "#fff" }}>
            {/* Back button */}
            <TouchableOpacity onPress={() => router.push("/location")} style={styles.backButton}>
                <Text style={styles.backText}>{"< Back"}</Text>
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>Address Information</Text>

            {/* Name */}
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />

            {/* Phone */}
            <Text style={styles.label}>Phone number *</Text>
            <View style={styles.phoneContainer}>
                <Text style={styles.phonePrefix}>PH +63</Text>
                <TextInput
                    style={styles.phoneInput}
                    keyboardType="number-pad"
                    value={phone}
                    onChangeText={setPhone}
                />
            </View>

            {/* Address */}
            <Text style={styles.label}>Address *</Text>
            <TouchableOpacity style={styles.addressPicker}>
                <Text style={styles.addressText}>{locationValue}</Text>
                <Text style={styles.small}>2600 Session Rd.</Text>
            </TouchableOpacity>

            {/* MAP PREVIEW */}
            <Text style={styles.confirmText}>Confirm your map location</Text>
            <View style={styles.mapContainer}>
                <iframe
                    src={`https://www.google.com/maps?q=${encodeURIComponent(
                        locationValue
                    )}&output=embed`}
                    style={{ width: "100%", height: "100%", border: 0 }}
                />
            </View>

            {/* Address details */}
            <Text style={styles.label}>Address details</Text>
            <TextInput
                style={styles.input}
                placeholder="Near 7/11"
                value={addressDetails}
                onChangeText={setAddressDetails}
            />

            <Text style={styles.privacy}>
                By clicking Save, you acknowledge that you have read the Privacy Policy.
            </Text>

            {/* Save button */}
            <TouchableOpacity
                style={styles.saveButton}
                onPress={() => router.push("/login")}
            >
                <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    backButton: { marginTop: 45, marginLeft: 20 },
    backText: { fontSize: 16 },
    title: {
        textAlign: "center",
        marginTop: 10,
        fontSize: 24,
        fontWeight: "bold"
    },
    label: { marginHorizontal: 20, marginTop: 15, fontWeight: "600", fontSize: 16 },
    input: {
        backgroundColor: "#F5F5F5",
        marginHorizontal: 20,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        marginTop: 5
    },
    phoneContainer: {
        backgroundColor: "#F5F5F5",
        marginHorizontal: 20,
        borderRadius: 10,
        paddingHorizontal: 15,
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
        height: 45
    },
    phonePrefix: { marginRight: 10, fontSize: 16, fontWeight: "600" },
    phoneInput: { flex: 1, fontSize: 16 },
    addressPicker: {
        backgroundColor: "#F5F5F5",
        marginHorizontal: 20,
        borderRadius: 10,
        padding: 12,
        marginTop: 5
    },
    addressText: { fontSize: 17, fontWeight: "600" },
    small: { fontSize: 13, color: "#555" },
    confirmText: { marginTop: 18, marginLeft: 20, fontWeight: "600" },
    mapContainer: {
        width: "90%",
        alignSelf: "center",
        height: 200,
        borderRadius: 15,
        overflow: "hidden",
        marginTop: 10,
        backgroundColor: "#ddd"
    },
    privacy: {
        marginTop: 15,
        textAlign: "center",
        fontSize: 12,
        color: "#555",
        paddingHorizontal: 20
    },
    saveButton: {
        backgroundColor: "#C39BFF",
        margin: 20,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: "center"
    },
    saveText: { fontSize: 18, fontWeight: "700", color: "#fff" }
});
