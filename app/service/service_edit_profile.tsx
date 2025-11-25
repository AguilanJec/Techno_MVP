// app/service_edit_profile.tsx
import { Switch, Platform, Image } from "react-native"; // Import Image here too if needed for this screen
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput, // Import TextInput for editing
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function ServiceEditProfileScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    // State for editable fields
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [gender, setGender] = useState("");

    useEffect(() => {
        const fetchUserData = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                Alert.alert("Error", "User not logged in");
                setLoading(false);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, "providers", currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUser(userData);
                    setName(userData.name || "");
                    setPhone(userData.phone || "");
                    setEmail(userData.email || "");
                    setGender(userData.gender || "");
                } else {
                    Alert.alert("Error", "User data not found");
                }
            } catch (error) {
                console.error("Error fetching user ", error);
                Alert.alert("Error", "Failed to load profile");
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleSave = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            Alert.alert("Error", "User not logged in");
            return;
        }

        try {
            await updateDoc(doc(db, "providers", currentUser.uid), {
                name,
                phone,
                email, // Update email if needed (though changing email might require special handling in Firebase Auth)
                gender,
            });

            Alert.alert("Success", "Profile updated successfully!");
            router.replace("../service/service_account"); // Navigate back to service_profile after saving
        } catch (error: any) {
            console.error("Error updating profile:", error);
            Alert.alert("Error", "Failed to update profile");
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (!user) {
        return (
            <View style={styles.centered}>
                <Text>User data not available</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("../service/service_account")} style={styles.backButton}> {/* Fixed navigation */}
                    <Text style={styles.backText}>{"< Back"}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text> {/* Changed title */}
                <TouchableOpacity
                    style={styles.saveButton} // Changed button style and text
                    onPress={handleSave}
                >
                    <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
            </View>

            {/* Profile Avatar and Name */}
            <View style={styles.profileContainer}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : "?"}</Text>
                </View>
                <TextInput
                    style={styles.editableName}
                    value={name}
                    onChangeText={setName}
                    placeholder="Name"
                />
            </View>

            {/* Personal Information Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Contact Number:</Text>
                    <TextInput
                        style={styles.editableValue}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Phone"
                        keyboardType="phone-pad"
                    />
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Email Address:</Text>
                    <TextInput
                        style={styles.editableValue}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Gender:</Text>
                    <TextInput
                        style={styles.editableValue}
                        value={gender}
                        onChangeText={setGender}
                        placeholder="Gender"
                    />
                </View>
                <Text style={styles.subSectionTitle}>Linked Accounts</Text>
                <View style={styles.linkedAccounts}>
                    <View style={styles.accountRow}>
                        <View style={styles.accountIcon}>
                            <Text style={styles.accountIconText}>F</Text>
                        </View>
                        <Text style={styles.accountName}>Facebook</Text>
                        <Switch
                            value={true} // Assuming linked accounts are always on for now
                            onValueChange={(value) => console.log('Facebook toggle:', value)}
                            trackColor={{ false: "#767577", true: "#8e44ad" }}
                            thumbColor={Platform.OS === 'ios' ? "#f4f3f4" : "#f4f3f4"}
                            style={styles.switch}
                        />
                    </View>
                    <View style={styles.accountRow}>
                        <View style={styles.accountIcon}>
                            <Text style={styles.accountIconText}>G</Text>
                        </View>
                        <Text style={styles.accountName}>Google</Text>
                        <Switch
                            value={true} // Assuming linked accounts are always on for now
                            onValueChange={(value) => console.log('Google toggle:', value)}
                            trackColor={{ false: "#767577", true: "#8e44ad" }}
                            thumbColor={Platform.OS === 'ios' ? "#f4f3f4" : "#f4f3f4"}
                            style={styles.switch}
                        />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        backgroundColor: "#b58dde",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 10,
        justifyContent: "space-between", // Adjusted for save button
    },
    backButton: {
        marginRight: 10,
    },
    backText: {
        fontSize: 16,
        color: "#fff",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
        flex: 1,
        textAlign: "center",
    },
    saveButton: { // Style for the save button
        backgroundColor: "#9c7ad6",
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveButtonText: { // Style for the save button text
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    profileContainer: {
        alignItems: "center",
        padding: 20,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#ddd",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    avatarText: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#666",
    },
    editableName: { // Style for the editable name field
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
        width: "80%",
        textAlign: "center",
        padding: 5,
    },
    section: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderColor: "#eee",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#333",
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 10,
        backgroundColor: "#f5f5f5",
        borderRadius: 10,
        marginBottom: 5,
    },
    label: {
        fontSize: 16,
        color: "#333",
        flex: 1, // Allow label to take space
    },
    editableValue: { // Style for the editable value fields
        fontSize: 16,
        color: "#666",
        flex: 2, // Allow input to take more space
        backgroundColor: "#fff",
        borderRadius: 5,
        padding: 5,
        textAlign: "right",
    },
    subSectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 15,
        marginBottom: 5,
        color: "#333",
    },
    linkedAccounts: {
        marginTop: 10,
    },
    accountRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        backgroundColor: "#f5f5f5",
        borderRadius: 10,
        marginBottom: 5,
    },
    accountIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#ddd",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    accountIconText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    accountName: {
        fontSize: 16,
        color: "#333",
        flex: 1,
    },
    switch: {
        transform: [{ scale: 0.8 }],
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
});