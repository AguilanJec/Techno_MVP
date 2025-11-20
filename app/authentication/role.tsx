import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function RoleSelection() {
    // Get parameters passed from terms_conditions
    const { email, password, confirmPassword } = useLocalSearchParams();
    const [selectedRole, setSelectedRole] = useState("");

    const handleNext = () => {
        if (!selectedRole) return;

        if (selectedRole === "parent") {
            // Navigate to the parent/guardian flow (Location)
            router.push({
                pathname: "/authentication/location",
                params: {
                    email,
                    password,
                    confirmPassword,
                    role: selectedRole
                }
            });
        } else if (selectedRole === "babysitting" || selectedRole === "tutoring") {
            // Navigate to the service provider flow (Location) - SAME AS PARENT
            router.push({
                pathname: "/authentication/location",
                params: {
                    email,
                    password,
                    confirmPassword,
                    role: selectedRole
                }
            });
        }
    };

    return (
        <View style={styles.container}>

            {/* Back Button - Now goes back to terms_conditions */}
            <TouchableOpacity onPress={() => router.push("/authentication/terms_conditions")} style={styles.backButton}>
                <Text style={styles.backText}>{"< Back"}</Text>
            </TouchableOpacity>

            <Text style={styles.header}>What brings you to our app?</Text>

            {/* Parent option */}
            <TouchableOpacity
                style={[
                    styles.optionBox,
                    selectedRole === "parent" && styles.selected
                ]}
                onPress={() => setSelectedRole("parent")}
            >
                <Text style={styles.optionTitle}>Parent</Text>
                <Text>- I want to find a babysitter who can look after my child.</Text>
            </TouchableOpacity>

            {/* Babysitting option */}
            <TouchableOpacity
                style={[
                    styles.optionBox,
                    selectedRole === "babysitting" && styles.selected
                ]}
                onPress={() => setSelectedRole("babysitting")}
            >
                <Text style={styles.optionTitle}>Babysitting</Text>
                <Text>- I want to help other people take care of their children.</Text>
            </TouchableOpacity>

            {/* Tutoring option */}
            <TouchableOpacity
                style={[
                    styles.optionBox,
                    selectedRole === "tutoring" && styles.selected
                ]}
                onPress={() => setSelectedRole("tutoring")}
            >
                <Text style={styles.optionTitle}>Tutoring</Text>
                <Text>- I want to help other people with their children&#39;s education.</Text>
            </TouchableOpacity>

            {/* Next Button */}
            <TouchableOpacity
                style={[
                    styles.nextButton,
                    { opacity: selectedRole ? 1 : 0.4 }
                ]}
                disabled={!selectedRole}
                onPress={handleNext}
            >
                <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
        </View>
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
    container: {
        flex: 1,
        backgroundColor: "#EDE0FF",
        padding: 20,
        paddingTop: 60
    },
    header: {
        fontSize: 24,
        textAlign: "center",
        fontWeight: "bold",
        color: "#6A4BBC",
        marginBottom: 30
    },
    optionBox: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: "#ddd"
    },
    selected: {
        borderColor: "#6A4BBC",
        borderWidth: 2
    },
    optionTitle: {
        fontWeight: "bold",
        marginBottom: 5
    },
    nextButton: {
        backgroundColor: "#B7A1E5",
        padding: 15,
        borderRadius: 10,
        marginTop: 20
    },
    nextText: {
        textAlign: "center",
        color: "white",
        fontWeight: "bold",
        fontSize: 18
    }
});