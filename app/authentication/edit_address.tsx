// app/edit_address.tsx
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Image,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";


export default function EditAddress() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Accept params that may be strings or arrays
    const getParamString = (p: any) => (Array.isArray(p) ? p[0] : p ?? "");
    const emailParam = getParamString(params.email);
    const passwordParam = getParamString(params.password);
    const locationParam = getParamString(params.userLocation ?? params.address ?? params.location);
    const latParam = getParamString(params.latitude);
    const lngParam = getParamString(params.longitude);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

    // Form fields
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [addressDetails, setAddressDetails] = useState("");
    const [addressDisplay, setAddressDisplay] = useState(locationParam || "No location selected");

    // Map coords state
    const DEFAULT = { latitude: 16.4023, longitude: 120.5960 }; // fallback
    const [mapCoords, setMapCoords] = useState<{ latitude: number; longitude: number }>(DEFAULT);
    const [mapReady, setMapReady] = useState(false);
    const [loadingCoords, setLoadingCoords] = useState(true);

    // Dynamically require react-native-maps only on native platforms
    let MapView: any = null;
    let Marker: any = null;
    if (Platform.OS !== "web") {
        try {
            // require dynamically so web bundler doesn't try to include native code
            const maps = require("react-native-maps");
            MapView = maps.default;
            Marker = maps.Marker;
        } catch (err) {
            // If user doesn't have react-native-maps installed, MapView remains null
            console.warn("react-native-maps not available:", err);
        }
    }

    // If latitude & longitude were passed, use them. Otherwise try to geocode the addressParam.
    useEffect(() => {
        (async () => {
            try {
                if (latParam && lngParam) {
                    const lat = parseFloat(latParam);
                    const lng = parseFloat(lngParam);
                    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                        setMapCoords({ latitude: lat, longitude: lng });
                        setAddressDisplay(locationParam || addressDisplay);
                        setMapReady(true);
                        setLoadingCoords(false);
                        return;
                    }
                }

                // If address string exists, geocode it (no permissions needed)
                if (locationParam) {
                    const results = await Location.geocodeAsync(locationParam);
                    if (results && results.length > 0) {
                        const r = results[0];
                        setMapCoords({ latitude: r.latitude, longitude: r.longitude });
                        // If reverseGeocode to get formatted address:
                        try {
                            const [place] = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
                            if (place) {
                                const address = `${place.name || ""}${place.street ? ", " + place.street : ""}${place.city ? ", " + place.city : ""}${place.region ? ", " + place.region : ""}${place.country ? ", " + place.country : ""}`;
                                setAddressDisplay(address);
                            }
                        } catch {}
                        setMapReady(true);
                        setLoadingCoords(false);
                        return;
                    }
                }

                // Otherwise fallback to device location if possible
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === "granted") {
                        const loc = await Location.getCurrentPositionAsync({});
                        setMapCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                        const [place] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                        if (place) {
                            const address = `${place.name || ""}${place.street ? ", " + place.street : ""}${place.city ? ", " + place.city : ""}${place.region ? ", " + place.region : ""}${place.country ? ", " + place.country : ""}`;
                            setAddressDisplay(address);
                        }
                    }
                } catch (err) {
                    // ignore permission errors here — we just use default coords
                    console.warn("device location fallback error:", err);
                }

                setMapReady(true);
            } catch (err) {
                console.warn("Geocode error:", err);
                setMapReady(false);
            } finally {
                setLoadingCoords(false);
            }
        })();
    }, []);

    // Save handler (firebase)
    const handleSave = async () => {
        try {
            const emailString = String(emailParam || "");
            const passwordString = String(passwordParam || "");

            if (!emailString || !passwordString) {
                Alert.alert("Error", "Missing email or password");
                return;
            }

            const existingMethods = await fetchSignInMethodsForEmail(auth, emailString);
            if (existingMethods.length > 0) {
                Alert.alert("Error", "Email already exists.");
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, emailString, passwordString);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                name,
                phone,
                email: emailString,
                address: addressDisplay,
                addressDetails,
                latitude: mapCoords.latitude,
                picture: profilePhoto || null,
                longitude: mapCoords.longitude,
                createdAt: new Date(),
            });

            Alert.alert("Success", "Account created successfully!");
            router.replace("/login");
        } catch (error: any) {
            console.error("Registration error:", error);
            Alert.alert("Error", error?.message || "Registration failed");
        }
    };

    // If map is loading show spinner
    if (loadingCoords) {
        return (
            <View style={styles.centered}>
                <Text>Loading location preview...</Text>
            </View>
        );
    }


    const pickProfilePhoto = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert("Permission required", "We need access to your photos.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                base64: true,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled) {
                const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
                setProfilePhoto(base64Img);
            }
        } catch (err) {
            console.log("Image picker error:", err);
        }
    };



    return (
        <ScrollView style={{ flex: 1, backgroundColor: "#EDE0FF" }}>
            <TouchableOpacity onPress={() => router.push("/authentication/location")} style={styles.backButton}>
                <Text style={styles.backText}>{"< Back"}</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Address Information</Text>

            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />

            <Text style={styles.label}>Phone number *</Text>
            <View style={styles.phoneContainer}>
                <Text style={styles.phonePrefix}>PH +63</Text>
                <TextInput style={styles.phoneInput} keyboardType="number-pad" value={phone} onChangeText={setPhone} />
            </View>

            <Text style={styles.label}>Address *</Text>
            <TouchableOpacity style={styles.addressPicker}>
                <Text style={styles.addressText}>{addressDisplay}</Text>
                <Text style={styles.small}>{addressDetails || "Tap Save to confirm"}</Text>
            </TouchableOpacity>

            <Text style={styles.confirmText}>Confirm your map location</Text>

            <View style={styles.mapContainer}>
                {Platform.OS === "web" ? (
                    // safe fallback for web (no iframe)
                    <View style={styles.mapFallback}>
                        <Text style={{ textAlign: "center", color: "#333", padding: 10 }}>
                            Map preview not available on web. Use the mobile app to pick a location.
                        </Text>
                    </View>
                ) : MapView ? (
                    // Native MapView
                    <MapView
                        style={styles.map}
                        initialRegion={{
                            latitude: mapCoords.latitude,
                            longitude: mapCoords.longitude,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                        }}
                        region={{
                            latitude: mapCoords.latitude,
                            longitude: mapCoords.longitude,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                        }}
                        onPress={async (e: any) => {
                            const { latitude, longitude } = e.nativeEvent.coordinate;
                            setMapCoords({ latitude, longitude });
                            try {
                                const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
                                if (place) {
                                    const address = `${place.name || ""}${place.street ? ", " + place.street : ""}${place.city ? ", " + place.city : ""}${place.region ? ", " + place.region : ""}${place.country ? ", " + place.country : ""}`;
                                    setAddressDisplay(address);
                                }
                            } catch {}
                        }}
                    >
                        <Marker
                            coordinate={{ latitude: mapCoords.latitude, longitude: mapCoords.longitude }}
                            draggable
                            onDragEnd={async (evt: any) => {
                                const { latitude, longitude } = evt.nativeEvent.coordinate;
                                setMapCoords({ latitude, longitude });
                                try {
                                    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
                                    if (place) {
                                        const address = `${place.name || ""}${place.street ? ", " + place.street : ""}${place.city ? ", " + place.city : ""}${place.region ? ", " + place.region : ""}${place.country ? ", " + place.country : ""}`;
                                        setAddressDisplay(address);
                                    }
                                } catch {}
                            }}
                        />
                    </MapView>
                ) : (
                    // Safe fallback if react-native-maps isn't installed
                    <View style={styles.mapFallback}>
                        <Text style={{ textAlign: "center", color: "#333", padding: 10 }}>
                            Map component not available. Install react-native-maps or run the app on a device/emulator.
                        </Text>
                        <Text style={{ textAlign: "center", marginTop: 10, color: "#666" }}>
                            Showing coordinates: {mapCoords.latitude.toFixed(6)}, {mapCoords.longitude.toFixed(6)}
                        </Text>
                    </View>
                )}
            </View>

            <Text style={styles.label}>Profile Picture *</Text>

            <TouchableOpacity style={styles.photoPicker} onPress={pickProfilePhoto}>
                {profilePhoto ? (
                    <Image
                        source={{ uri: profilePhoto }}
                        style={styles.profileImage}
                    />
                ) : (
                    <Text style={styles.photoPlaceholder}>Tap to upload photo</Text>
                )}
            </TouchableOpacity>


            <Text style={styles.label}>Address details</Text>
            <TextInput style={styles.input} placeholder="Near 7/11" value={addressDetails} onChangeText={setAddressDetails} />

            <Text style={styles.privacy}>By clicking Save, you acknowledge that you have read the Privacy Policy.</Text>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#EDE0FF" },
    backButton: { marginTop: 45, marginLeft: 20 },
    backText: { color: "#6A4BBC", fontSize: 16 },
    title: { textAlign: "center", marginTop: 10, fontSize: 24, fontWeight: "bold", color: "#6A0DAD" },
    label: { marginHorizontal: 20, marginTop: 15, fontWeight: "600", fontSize: 16 },
    input: { backgroundColor: "#F5F5F5", marginHorizontal: 20, borderRadius: 10, padding: 12, fontSize: 16, marginTop: 5 },
    phoneContainer: {
        backgroundColor: "#F5F5F5",
        marginHorizontal: 20,
        borderRadius: 10,
        paddingHorizontal: 15,
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
        height: 45,
    },
    phonePrefix: { marginRight: 10, fontSize: 16, fontWeight: "600" },
    phoneInput: { flex: 1, fontSize: 16 },
    addressPicker: { backgroundColor: "#F5F5F5", marginHorizontal: 20, borderRadius: 10, padding: 12, marginTop: 5 },
    addressText: { fontSize: 17, fontWeight: "600" },
    small: { fontSize: 13, color: "#555" },
    confirmText: { marginTop: 18, marginLeft: 20, fontWeight: "600" },
    mapContainer: { width: "90%", alignSelf: "center", height: 200, borderRadius: 15, overflow: "hidden", marginTop: 10, backgroundColor: "#ddd" },
    map: { flex: 1 },
    mapFallback: { flex: 1, justifyContent: "center", alignItems: "center", padding: 12 },
    privacy: { marginTop: 15, textAlign: "center", fontSize: 12, color: "#555", paddingHorizontal: 20 },
    saveButton: { backgroundColor: "#C39BFF", margin: 20, paddingVertical: 12, borderRadius: 25, alignItems: "center" },
    saveText: { fontSize: 18, fontWeight: "700", color: "#fff" },
    photoPicker: {
        marginHorizontal: 20,
        backgroundColor: "#F5F5F5",
        height: 180,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
        overflow: "hidden",
    },

    photoPlaceholder: {
        color: "#666",
        fontSize: 15,
    },

    profileImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
});
