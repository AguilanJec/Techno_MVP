import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";

export default function LocationPage() {
    const router = useRouter();

    const [locationText, setLocationText] = useState("Baguio");
    const [region, setRegion] = useState({
        latitude: 16.4023,
        longitude: 120.5960,
        latitudeDelta: 0.09,
        longitudeDelta: 0.04,
    });

    return (
        <View style={styles.container}>
            {/* Back */}
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backText}>{"< Back"}</Text>
            </TouchableOpacity>

            {/* Illustration */}
            <Image
                source={require("../assets/images/location_guy.png")} // Replace w/ your PNG
                style={styles.headerImage}
            />

            {/* Title */}
            <Text style={styles.title}>What is your location?</Text>

            {/* Search Box */}
            <View style={styles.searchContainer}>
                <Image source={require("../assets/images/ph_flag.png")} style={styles.flag} />
                <TextInput
                    value={locationText}
                    onChangeText={setLocationText}
                    placeholder="Search Location"
                    style={styles.input}
                />
            </View>

            {/* Map */}
            <View style={styles.mapContainer}>
                <iframe
                    src={`https://www.google.com/maps?q=${encodeURIComponent(locationText)}&output=embed`}
                    style={{ width: '100%', height: '100%', border: 0 }}
                />
            </View>



            {/* Next Button */}
            <TouchableOpacity
                style={styles.nextButton}
                onPress={() =>
                    router.push({
                        pathname: "/role",
                        params: { userLocation: locationText },
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
        backgroundColor: "#F6EEFF",
        paddingTop: 40,
        alignItems: "center",
    },
    backButton: {
        alignSelf: "flex-start",
        marginLeft: 20,
        marginBottom: 10,
    },
    backText: {
        fontSize: 16,
        color: "#333",
    },
    headerImage: {
        width: 160,
        height: 160,
        resizeMode: "contain",
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        marginTop: 10,
        color: "#6A0DAD",
    },
    searchContainer: {
        flexDirection: "row",
        backgroundColor: "#fff",
        width: "85%",
        borderRadius: 15,
        marginTop: 15,
        paddingHorizontal: 12,
        alignItems: "center",
        elevation: 3,
    },
    flag: {
        width: 26,
        height: 26,
        marginRight: 5,
    },
    input: {
        flex: 1,
        height: 45,
        fontSize: 16,
    },
    mapContainer: {
        width: "90%",
        height: 300,
        borderRadius: 20,
        marginTop: 20,
        overflow: "hidden", // ensures WebView respects rounded corners
        elevation: 3,
    },
    map: {
        flex: 1, // fill the container
    },
    nextButton: {
        marginTop: 25,
        backgroundColor: "#B388FF",
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
    },
    nextText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    },
});

