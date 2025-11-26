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
    Modal,
    ScrollView,
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
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualAddress, setManualAddress] = useState("");

    // Manual address fields
    const [houseNumber, setHouseNumber] = useState("");
    const [street, setStreet] = useState("");
    const [barangay, setBarangay] = useState("");
    const [municipality, setMunicipality] = useState("");
    const [city, setCity] = useState("");
    const [province, setProvince] = useState("");
    const [zipCode, setZipCode] = useState("");

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
                const coordsText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                setLocationText(coordsText);
            }
        } catch {
            const coordsText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            setLocationText(coordsText);
        }
    };

    // Forward geocoding (search)
    const geocodeAddress = async (address: string) => {
        if (!address.trim()) {
            Alert.alert("Please enter an address");
            return;
        }

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
                Alert.alert("Location not found", "Please try a different address");
            }
        } catch {
            Alert.alert("Failed to search location", "Please check your connection and try again");
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

    // Use current location
    const useCurrentLocation = async () => {
        setLoading(true);
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

            mapRef.current?.animateCamera({
                center: { latitude, longitude },
                altitude: 1200,
            });

            setShowManualInput(false);
        } catch (err) {
            Alert.alert("Error", "Failed to get current location");
            console.warn("Location error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Build manual address from form fields
    const buildManualAddress = () => {
        const parts = [];
        if (houseNumber) parts.push(houseNumber);
        if (street) parts.push(street);
        if (barangay) parts.push(`Brgy. ${barangay}`);
        if (municipality) parts.push(municipality);
        if (city) parts.push(city);
        if (province) parts.push(province);
        if (zipCode) parts.push(zipCode);

        return parts.join(", ");
    };

    // Confirm manual address
    const confirmManualAddress = () => {
        const address = buildManualAddress();
        if (!address.trim()) {
            Alert.alert("Please enter at least one address field");
            return;
        }

        setLocationText(address);
        setShowManualInput(false);

        // Show success message
        Alert.alert("Address Saved", "Your manual address has been saved successfully.");
    };

    // Open manual input modal
    const openManualInput = () => {
        // Reset form fields when opening
        setHouseNumber("");
        setStreet("");
        setBarangay("");
        setMunicipality("");
        setCity("");
        setProvince("");
        setZipCode("");
        setShowManualInput(true);
    };

    // Reset manual form
    const resetManualForm = () => {
        setHouseNumber("");
        setStreet("");
        setBarangay("");
        setMunicipality("");
        setCity("");
        setProvince("");
        setZipCode("");
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
                <ActivityIndicator size="large" color="#B388FF" />
                <Text style={{ marginTop: 10, color: "#6A0DAD" }}>Loading map...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
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
                <Text style={styles.subtitle}>Choose your preferred method to set your location</Text>

                {/* Location Options */}
                <View style={styles.optionsContainer}>
                    <TouchableOpacity style={styles.optionButton} onPress={useCurrentLocation}>
                        <View style={styles.optionIcon}>
                            <Text style={styles.optionIconText}>📍</Text>
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>Use Current Location</Text>
                            <Text style={styles.optionSubtitle}>Automatically detect your location</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionButton} onPress={openManualInput}>
                        <View style={styles.optionIcon}>
                            <Text style={styles.optionIconText}>⌨️</Text>
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>Type Address</Text>
                            <Text style={styles.optionSubtitle}>Enter your address manually</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Selected Location Display */}
                <View style={styles.selectedLocationContainer}>
                    <Text style={styles.selectedLocationLabel}>Selected Location:</Text>
                    <Text style={styles.selectedLocationText}>{locationText}</Text>
                </View>

                {/* MAP */}
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={mapRegion}
                        onPress={onMapPress}
                    >
                        <Marker
                            coordinate={mapRegion}
                            draggable
                            onDragEnd={onMarkerDragEnd}
                        />
                    </MapView>
                </View>

                {/* Search bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        value={locationText}
                        onChangeText={setLocationText}
                        placeholder="Search or enter location"
                        style={styles.input}
                    />
                    <TouchableOpacity
                        onPress={() => geocodeAddress(locationText)}
                        style={styles.searchButton}
                        disabled={searchLoading}
                    >
                        <Text style={styles.searchText}>
                            {searchLoading ? "Searching..." : "Search"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.nextButton} onPress={goNext}>
                    <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>

                {/* Manual Input Modal */}
                <Modal
                    visible={showManualInput}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowManualInput(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Enter Your Address</Text>
                                <TouchableOpacity onPress={() => setShowManualInput(false)}>
                                    <Text style={styles.modalClose}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                                <Text style={styles.modalSubtitle}>
                                    Fill in your complete address details
                                </Text>

                                <View style={styles.formRow}>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>House/Building No.</Text>
                                        <TextInput
                                            value={houseNumber}
                                            onChangeText={setHouseNumber}
                                            placeholder="e.g., 123"
                                            style={styles.formInput}
                                        />
                                    </View>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Street</Text>
                                        <TextInput
                                            value={street}
                                            onChangeText={setStreet}
                                            placeholder="e.g., Main Street"
                                            style={styles.formInput}
                                        />
                                    </View>
                                </View>

                                <View style={styles.formRow}>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Barangay</Text>
                                        <TextInput
                                            value={barangay}
                                            onChangeText={setBarangay}
                                            placeholder="e.g., Session Road"
                                            style={styles.formInput}
                                        />
                                    </View>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Municipality</Text>
                                        <TextInput
                                            value={municipality}
                                            onChangeText={setMunicipality}
                                            placeholder="e.g., La Trinidad"
                                            style={styles.formInput}
                                        />
                                    </View>
                                </View>

                                <View style={styles.formRow}>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>City</Text>
                                        <TextInput
                                            value={city}
                                            onChangeText={setCity}
                                            placeholder="e.g., Baguio City"
                                            style={styles.formInput}
                                        />
                                    </View>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Province</Text>
                                        <TextInput
                                            value={province}
                                            onChangeText={setProvince}
                                            placeholder="e.g., Benguet"
                                            style={styles.formInput}
                                        />
                                    </View>
                                </View>

                                <View style={styles.formRow}>
                                    <View style={[styles.formGroup, styles.fullWidth]}>
                                        <Text style={styles.label}>ZIP Code</Text>
                                        <TextInput
                                            value={zipCode}
                                            onChangeText={setZipCode}
                                            placeholder="e.g., 2600"
                                            style={styles.formInput}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>

                                {/* Preview of the address */}
                                {buildManualAddress().trim() && (
                                    <View style={styles.addressPreview}>
                                        <Text style={styles.previewLabel}>Address Preview:</Text>
                                        <Text style={styles.previewText}>{buildManualAddress()}</Text>
                                    </View>
                                )}
                            </ScrollView>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.resetButton]}
                                    onPress={resetManualForm}
                                >
                                    <Text style={styles.resetButtonText}>Reset</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setShowManualInput(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.confirmButton]}
                                    onPress={confirmManualAddress}
                                >
                                    <Text style={styles.confirmButtonText}>Confirm Address</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: "#F6EEFF",
    },
    scrollContent: {
        flexGrow: 1,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F6EEFF"
    },
    container: {
        flex: 1,
        backgroundColor: "#F6EEFF",
        paddingTop: 40,
        alignItems: "center",
        paddingBottom: 40, // Added padding at bottom for better scrolling
    },
    backButton: {
        alignSelf: "flex-start",
        marginLeft: 20,
        marginBottom: 10
    },
    backText: {
        fontSize: 16,
        color: "#333"
    },
    headerImage: {
        width: 140,
        height: 140,
        resizeMode: "contain"
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        marginTop: 10,
        color: "#6A0DAD",
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: "#666",
        marginTop: 5,
        textAlign: "center",
        paddingHorizontal: 40,
    },
    optionsContainer: {
        width: "90%",
        marginTop: 20,
    },
    optionButton: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    optionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F6EEFF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    optionIconText: {
        fontSize: 18,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    optionSubtitle: {
        fontSize: 12,
        color: "#666",
        marginTop: 2,
    },
    selectedLocationContainer: {
        width: "90%",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 10,
        marginTop: 10,
        elevation: 2,
    },
    selectedLocationLabel: {
        fontSize: 12,
        color: "#666",
        marginBottom: 4,
    },
    selectedLocationText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#333",
    },
    searchContainer: {
        flexDirection: "row",
        backgroundColor: "#fff",
        width: "90%",
        borderRadius: 15,
        marginTop: 12,
        paddingHorizontal: 12,
        alignItems: "center",
        elevation: 3,
    },
    input: {
        flex: 1,
        height: 45,
        fontSize: 16
    },
    searchButton: {
        marginLeft: 8,
        backgroundColor: "#BFA2E0",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10
    },
    searchText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600"
    },
    mapContainer: {
        width: "92%",
        height: 300,
        borderRadius: 12,
        marginTop: 14,
        overflow: "hidden",
        elevation: 3
    },
    map: {
        flex: 1
    },
    nextButton: {
        marginTop: 18,
        backgroundColor: "#B388FF",
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
        marginBottom: 20, // Added margin for better spacing when scrolling
    },
    nextText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700"
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        width: "100%",
        maxWidth: 400,
        maxHeight: "80%",
    },
    modalScroll: {
        maxHeight: 400,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
    },
    modalClose: {
        fontSize: 20,
        color: "#666",
        fontWeight: "bold",
    },
    modalSubtitle: {
        fontSize: 14,
        color: "#666",
        marginBottom: 15,
        lineHeight: 18,
    },
    formRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    formGroup: {
        flex: 1,
        marginHorizontal: 4,
    },
    fullWidth: {
        flex: 2,
    },
    label: {
        fontSize: 12,
        color: "#666",
        marginBottom: 4,
        fontWeight: "500",
    },
    formInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        backgroundColor: "#f9f9f9",
    },
    addressPreview: {
        backgroundColor: "#F6EEFF",
        padding: 12,
        borderRadius: 8,
        marginTop: 15,
        marginBottom: 10,
    },
    previewLabel: {
        fontSize: 12,
        color: "#666",
        marginBottom: 4,
        fontWeight: "500",
    },
    previewText: {
        fontSize: 14,
        color: "#333",
        fontWeight: "500",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 15,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        marginHorizontal: 4,
    },
    resetButton: {
        backgroundColor: "#FFE4E4",
    },
    resetButtonText: {
        color: "#D32F2F",
        fontWeight: "600",
        fontSize: 12,
    },
    cancelButton: {
        backgroundColor: "#f0f0f0",
    },
    cancelButtonText: {
        color: "#666",
        fontWeight: "600",
    },
    confirmButton: {
        backgroundColor: "#B388FF",
    },
    confirmButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
});