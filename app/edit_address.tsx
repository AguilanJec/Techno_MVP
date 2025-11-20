import React, { useState } from "react";
import { Alert } from "react-native";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

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
    const params = useLocalSearchParams();

    // Extract parameters once to avoid re-declaration
    const { email, password, userLocation: locationParam } = params;

    // FIX: convert string | string[] to string
    const locationValue = Array.isArray(locationParam)
        ? locationParam[0]
        : String(locationParam || "");

    const [name, setName] = useState("Tony Stark");
    const [phone, setPhone] = useState("9012398765");
    const [addressDetails, setAddressDetails] = useState("");

    const handleSave = async () => {
        console.log("handleSave called"); // Debug log

        try {
            // Convert email and password to strings safely
            const emailString = Array.isArray(email) ? email[0] : String(email || "");
            const passwordString = Array.isArray(password) ? password[0] : String(password || "");

            console.log("Email:", emailString, "Password:", passwordString); // Debug log

            if (!emailString || !passwordString) {
                Alert.alert("Error", "Missing email or password");
                return;
            }

            // Check if email already exists
            const existingMethods = await fetchSignInMethodsForEmail(auth, emailString);
            console.log("Existing methods:", existingMethods); // Debug log

            if (existingMethods.length > 0) {
                Alert.alert("Error", "Email already exists.");
                return;
            }

            // Create user account
            console.log("Creating user..."); // Debug log
            const userCredential = await createUserWithEmailAndPassword(auth, emailString, passwordString);
            const user = userCredential.user;

            console.log("User created:", user.uid); // Debug log

            // Save user details in Firestore
            console.log("Saving to Firestore..."); // Debug log
            await setDoc(doc(db, "users", user.uid), {
                name,
                phone,
                address: locationValue,
                addressDetails,
                createdAt: new Date(),
            });

            console.log("User data saved to Firestore"); // Debug log

            Alert.alert("Success", "Account created successfully!");
            console.log("Navigating to login..."); // Debug log
            router.replace("/login");   // redirect to Login
            console.log("Navigation completed"); // Debug log

        } catch (error: any) {
            console.error("Registration error:", error);
            console.error("Error code:", error.code); // Debug log
            console.error("Error message:", error.message); // Debug log
            Alert.alert("Error", error.message || "An error occurred during registration");
        }
    };

    return (
        <ScrollView style={{ flex: 1, backgroundColor: "#EDE0FF" }}>
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
                onPress={handleSave}
            >
                <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#EDE0FF",
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    backButton: { marginTop: 45, marginLeft: 20 },
    backText: {
        color: "#6A4BBC",
        fontSize: 16, },
    title: {
        textAlign: "center",
        marginTop: 10,
        fontSize: 24,
        fontWeight: "bold",
        color: "#6A0DAD",
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