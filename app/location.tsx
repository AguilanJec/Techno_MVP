// location.tsx
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import MapView, { Marker, MapPressEvent, MarkerDragEndEvent } from "react-native-maps";

export default function LocationPage() {
    const router = useRouter();
    const { email, password, confirmPassword, role } = useLocalSearchParams();

    const DEFAULT = { latitude: 16.4023, longitude: 120.5960 }; // Baguio default
    const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(DEFAULT);
    const [locationText, setLocationText] = useState("Baguio, Philippines");
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);

    // Get device location and reverse geocode to address
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== "granted") {
                    Alert.alert("Permission denied", "Location permission is required.");
                    setLoading(false);
                    return;
                }
                const location = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = location.coords;
                setCoords({ latitude, longitude });
                await reverseGeocode(latitude, longitude);
            } catch (err) {
                console.warn("Location error:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Reverse geocode coordinates → human-readable address
    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (place) {
                const address = `${place.name || ""}${place.street ? ", " + place.street : ""}${
                    place.city ? ", " + place.city : ""
                }${place.region ? ", " + place.region : ""}${place.country ? ", " + place.country : ""}`;
                setLocationText(address);
            } else {
                setLocationText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
        } catch (err) {
            console.warn("Reverse geocode failed:", err);
            setLocationText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
    };

    // Forward geocode address → coordinates
    const geocodeAddress = async (address: string) => {
        setSearchLoading(true);
        try {
            const [location] = await Location.geocodeAsync(address);
            if (location) {
                const { latitude, longitude } = location;
                setCoords({ latitude, longitude });
                await reverseGeocode(latitude, longitude);
            } else {
                Alert.alert("Location not found");
            }
        } catch (err) {
            console.warn("Geocode failed:", err);
            Alert.alert("Failed to find location");
        }
        setSearchLoading(false);
    };

    const onMapPress = async (evt: MapPressEvent) => {
        const { latitude, longitude } = evt.nativeEvent.coordinate;
        setCoords({ latitude, longitude });
        await reverseGeocode(latitude, longitude);
    };

    const onMarkerDragEnd = async (evt: MarkerDragEndEvent) => {
        const { latitude, longitude } = evt.nativeEvent.coordinate;
        setCoords({ latitude, longitude });
        await reverseGeocode(latitude, longitude);
    };

    const goNext = () => {
        router.push({
            pathname: "/edit_address",
            params: {
                latitude: coords.latitude.toString(),
                longitude: coords.longitude.toString(),
                address: locationText,
                email,
                password,
                confirmPassword,
                role,
            },
        });
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 10 }}>Loading map...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={() => router.push({ pathname: "/terms_conditions", params: { email, password, confirmPassword, role } })}
                style={styles.backButton}
            >
                <Text style={styles.backText}>{"< Back"}</Text>
            </TouchableOpacity>

            <Image source={require("../assets/images/location_guy.png")} style={styles.headerImage} />
            <Text style={styles.title}>Pinpoint your location</Text>

            <View style={styles.searchContainer}>
                <TextInput
                    value={locationText}
                    onChangeText={setLocationText}
                    placeholder="Search Location"
                    style={styles.input}
                />
                <TouchableOpacity onPress={() => geocodeAddress(locationText)} style={styles.searchButton}>
                    <Text style={styles.searchText}>{searchLoading ? "Searching..." : "Search"}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                    region={{
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                    onPress={onMapPress}
                >
                    <Marker coordinate={coords} draggable onDragEnd={onMarkerDragEnd} />
                </MapView>
            </View>

            <TouchableOpacity style={styles.nextButton} onPress={goNext}>
                <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F6EEFF" },
    container: { flex: 1, backgroundColor: "#F6EEFF", paddingTop: 40, alignItems: "center" },
    backButton: { alignSelf: "flex-start", marginLeft: 20, marginBottom: 10 },
    backText: { fontSize: 16, color: "#333" },
    headerImage: { width: 140, height: 140, resizeMode: "contain" },
    title: { fontSize: 22, fontWeight: "700", marginTop: 10, color: "#6A0DAD" },
    searchContainer: {
        flexDirection: "row",
        backgroundColor: "#fff",
        width: "85%",
        borderRadius: 15,
        marginTop: 12,
        paddingHorizontal: 12,
        alignItems: "center",
        elevation: 3,
    },
    input: { flex: 1, height: 45, fontSize: 16 },
    searchButton: { marginLeft: 8, backgroundColor: "#BFA2E0", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
    searchText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    mapContainer: { width: "92%", height: 360, borderRadius: 12, marginTop: 14, overflow: "hidden", elevation: 3 },
    map: { flex: 1 },
    nextButton: { marginTop: 18, backgroundColor: "#B388FF", paddingVertical: 12, paddingHorizontal: 40, borderRadius: 25 },
    nextText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
