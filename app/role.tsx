import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function RoleSelection() {
    const { email, password, confirmPassword } = useLocalSearchParams();
    const [selectedRole, setSelectedRole] = useState("");

    return (
        <View style={styles.container}>

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

            {/* Babysitter option */}
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

            {/* Next Button */}
            <TouchableOpacity
                style={[
                    styles.nextButton,
                    { opacity: selectedRole ? 1 : 0.4 }
                ]}
                disabled={!selectedRole}
                onPress={() =>
                    router.push({
                        pathname: "/terms_conditions",
                        params: {
                            email,
                            password,
                            confirmPassword,
                            role: selectedRole
                        }
                    })
                }
            >
                <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
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
