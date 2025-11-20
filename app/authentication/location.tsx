import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import MapView, { Marker, MapPressEvent, MarkerDragEndEvent } from "react-native-maps";

export default function LocationPage() {
    const router = useRouter();
    const mapRef = useRef<MapView | null>(null);

    const { email, password, confirmPassword, role } = useLocalSearchParams();

    const DEFAULT = {
        latitude: 16.4023,
        longitude: 120.5960,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    const [mapRegion, setMapRegion] = useState(DEFAULT);
    const [locationText, setLocationText] = useState("Baguio, Philippines");
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);

    // Load user location
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== "granted") {
                    Alert.alert("Permission denied", "Location permission is required.");
                    setLoading(false);
                    return;
                }

                const loc = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = loc.coords;

                setMapRegion(prev => ({ ...prev, latitude, longitude }));
                await reverseGeocode(latitude, longitude);

                // Move camera without affecting zoom
                mapRef.current?.animateCamera({
                    center: { latitude, longitude },
                    altitude: 1200,
                });

            } catch (err) {
                console.warn("Location error:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Reverse geocode
    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (place) {
                const addr = `${place.name || ""}${place.street ? ", " + place.street : ""}${
                    place.city ? ", " + place.city : ""
                }${place.region ? ", " + place.region : ""}${place.country ? ", " + place.country : ""}`;
                setLocationText(addr);
            } else {
                setLocationText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
        } catch {
            setLocationText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
    };

    // Forward geocoding (search)
    const geocodeAddress = async (address: string) => {
        setSearchLoading(true);
        try {
            const [result] = await Location.geocodeAsync(address);
            if (result) {
                const { latitude, longitude } = result;

                setMapRegion(prev => ({ ...prev, latitude, longitude }));
                await reverseGeocode(latitude, longitude);

                // Move camera smoothly
                mapRef.current?.animateCamera({
                    center: { latitude, longitude },
                    altitude: 1200,
                });

            } else {
                Alert.alert("Location not found");
            }
        } catch {
            Alert.alert("Failed to search location");
        }
        setSearchLoading(false);
    };

    // Tap on map
    const onMapPress = async (evt: MapPressEvent) => {
        const { latitude, longitude } = evt.nativeEvent.coordinate;

        setMapRegion(prev => ({ ...prev, latitude, longitude }));
        await reverseGeocode(latitude, longitude);

        mapRef.current?.animateCamera({
            center: { latitude, longitude },
            altitude: 1200,
        });
    };

    // Drag marker
    const onMarkerDragEnd = async (evt: MarkerDragEndEvent) => {
        const { latitude, longitude } = evt.nativeEvent.coordinate;

        setMapRegion(prev => ({ ...prev, latitude, longitude }));
        await reverseGeocode(latitude, longitude);

        mapRef.current?.animateCamera({
            center: { latitude, longitude },
            altitude: 1200,
        });
    };

    // Next screen
    const goNext = () => {
        // Redirect based on role
        const nextScreen =
            role === "babysitting" || role === "tutoring"
                ? "/authentication/edit_address_provider"
                : "/authentication/edit_address";

        router.push({
            pathname: nextScreen,
            params: {
                latitude: mapRegion.latitude.toString(),
                longitude: mapRegion.longitude.toString(),
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
                onPress={() =>
                    router.push({
                        pathname: "/authentication/terms_conditions",
                        params: { email, password, confirmPassword, role },
                    })
                }
                style={styles.backButton}
            >
                <Text style={styles.backText}>{"< Back"}</Text>
            </TouchableOpacity>

            <Image source={require("../../assets/images/location_guy.png")} style={styles.headerImage} />
            <Text style={styles.title}>Pinpoint your location</Text>

            {/* Search bar */}
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

            {/* MAP */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={mapRegion}   // ← No zoom reset!
                    onPress={onMapPress}
                >
                    <Marker
                        coordinate={mapRegion}
                        draggable
                        onDragEnd={onMarkerDragEnd}
                    />
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
