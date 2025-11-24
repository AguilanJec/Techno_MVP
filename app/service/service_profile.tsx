// app/service/service_profile.tsx
import React, { useState, useEffect } from "react";
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
    Modal,
    Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig"; // Adjust path if needed
import { onAuthStateChanged, signOut } from "firebase/auth";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"; // Import MapView and Marker

// Define the type for a single day's availability
type DayAvailability = {
    enabled: boolean;
    from: string; // Format: "HH:MM"
    to: string;   // Format: "HH:MM"
};

// Define the type for the entire availability state object
type AvailabilityState = {
    Monday: DayAvailability;
    Tuesday: DayAvailability;
    Wednesday: DayAvailability;
    Thursday: DayAvailability;
    Friday: DayAvailability;
    Saturday: DayAvailability;
    Sunday: DayAvailability;
};

const ServiceProfileScreen: React.FC = () => {
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // State for editable fields
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [bio, setBio] = useState("");
    const [rate, setRate] = useState("");
    const [skills, setSkills] = useState<string[]>([]);
    const [newSkill, setNewSkill] = useState("");
    const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);

    // State for profile picture
    const [profilePicture, setProfilePicture] = useState<string | null>(null);

    // State for availability
    const [availability, setAvailability] = useState<AvailabilityState>({
        Monday: { enabled: false, from: "08:00", to: "20:00" },
        Tuesday: { enabled: false, from: "08:00", to: "20:00" },
        Wednesday: { enabled: false, from: "08:00", to: "20:00" },
        Thursday: { enabled: false, from: "08:00", to: "20:00" },
        Friday: { enabled: false, from: "08:00", to: "20:00" },
        Saturday: { enabled: false, from: "08:00", to: "20:00" },
        Sunday: { enabled: false, from: "08:00", to: "20:00" },
    });

    // State for availability modal
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
    const [currentDay, setCurrentDay] = useState<keyof AvailabilityState | null>(null);
    const [tempAvail, setTempAvail] = useState<DayAvailability>({ enabled: false, from: "08:00", to: "20:00" });

    // State for map coordinates and location text
    const DEFAULT_REGION = { latitude: 16.4023, longitude: 120.5960, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
    const [locationText, setLocationText] = useState("Baguio, Philippines");
    const [loadingLocation, setLoadingLocation] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Fetch from "providers" collection
                    const userDoc = await getDoc(doc(db, "providers", user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserData(data);

                        // Populate local state for editing
                        setName(data.name || "");
                        setPhone(data.phone || "");
                        setEmail(data.email || "");
                        setBio(data.bio || "");
                        setRate(data.rate?.toString() || ""); // Convert to string for TextInput
                        setSkills(data.skills || []);
                        setProfilePicture(data.picture || null);

                        // Initialize availability state from Firestore, using default if not present
                        setAvailability(prev => ({
                            ...prev,
                            ...(data.availability || {})
                        }));

                        // Initialize location state from Firestore
                        if (data.latitude && data.longitude) {
                            setMapRegion(prev => ({ ...prev, latitude: data.latitude, longitude: data.longitude }));
                            setLocationText(data.address || "Loaded Address");
                        } else if (data.address) {
                            // Try to geocode the address string if coordinates aren't stored
                            try {
                                const [result] = await Location.geocodeAsync(data.address);
                                if (result) {
                                    setMapRegion(prev => ({
                                        ...prev,
                                        latitude: result.latitude,
                                        longitude: result.longitude,
                                    }));
                                    setLocationText(data.address);
                                }
                            } catch (geocodeErr) {
                                console.warn("Geocoding failed:", geocodeErr);
                                setLocationText(data.address);
                            }
                        }
                    } else {
                        console.log("No provider document found for user ID:", user.uid);
                    }
                } catch (error) {
                    console.error("Error fetching provider data:", error);
                }
            }
            setLoading(false);
            setLoadingLocation(false);
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const formatPhoneNumber = (phone: string) => {
        if (!phone) return "0918•••••279";
        if (phone.length <= 4) return phone;
        return `${phone.slice(0, 4)}•••••${phone.slice(-3)}`;
    };

    // --- SKILLS MANAGEMENT ---
    const removeSkill = (index: number) => {
        if (!isEditing) return; // Only allow removal when editing
        const updatedSkills = skills.filter((_, i) => i !== index);
        setSkills(updatedSkills);
    };

    const startEditingSkill = (index: number) => {
        if (!isEditing) return; // Only allow editing when editing mode is on
        setEditingSkillIndex(index);
        setNewSkill(skills[index]);
    };

    const cancelEditingSkill = () => {
        setEditingSkillIndex(null);
        setNewSkill("");
    };

    const saveEditingSkill = () => {
        if (editingSkillIndex === null || !newSkill.trim()) return;
        const updatedSkills = [...skills];
        updatedSkills[editingSkillIndex] = newSkill.trim();
        setSkills(updatedSkills);
        setEditingSkillIndex(null);
        setNewSkill("");
    };

    const addNewSkill = () => {
        if (!isEditing) return; // Only allow adding when editing mode is on
        if (!newSkill.trim()) return;
        setSkills(prev => [...prev, newSkill.trim()]);
        setNewSkill("");
    };

    const cancelAddingSkill = () => {
        setIsEditing(false);
        setNewSkill("");
    };

    // --- AVAILABILITY MANAGEMENT ---
    const openAvailabilityModal = (day: keyof AvailabilityState) => {
        const dayAvail = availability[day] || { enabled: false, from: "08:00", to: "20:00" };
        setTempAvail(dayAvail);
        setCurrentDay(day);
        setShowAvailabilityModal(true);
    };

    const closeAvailabilityModal = () => {
        setShowAvailabilityModal(false);
        setCurrentDay(null);
    };

    const saveAvailability = () => {
        if (!currentDay) return;

        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("User not logged in");
            return;
        }

        const updatedAvailability = { ...availability, [currentDay]: tempAvail };
        setAvailability(updatedAvailability);

        // Optionally, update Firestore immediately or batch updates when saving profile
        // updateDoc(doc(db, "providers", currentUser.uid), { availability: updatedAvailability });

        closeAvailabilityModal();
    };

    // --- PROFILE PICTURE PICKER ---
    const pickProfilePicture = async () => {
        if (!isEditing) return; // Only allow changing when editing
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Permission Required", "We need access to your photos to upload a profile picture.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1], // Square aspect ratio
                quality: 0.7,
            });

            if (!result.canceled) {
                // Optionally resize image using ImageManipulator
                const manipResult = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 400, height: 400 } }], // Resize for efficiency
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );

                setProfilePicture(manipResult.uri); // Set the local URI
                // Note: You might want to upload the image to a storage service (like Firebase Storage)
                // and save the download URL to Firestore instead of the local URI.
            }
        } catch (err) {
            console.error("Error picking profile picture:", err);
            Alert.alert("Error", "Failed to pick profile picture.");
        }
    };

    // --- SAVE CHANGES FUNCTION ---
    const saveChanges = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("User not logged in");
            return;
        }

        try {
            await updateDoc(doc(db, "providers", currentUser.uid), {
                name,
                phone,
                email, // Note: Changing email requires special handling in Firebase Auth
                bio,
                rate: parseFloat(rate) || 0, // Convert back to number
                skills,
                picture: profilePicture, // Save picture URI
                availability, // Save the availability object
                address: locationText, // Save the address string
                latitude: mapRegion.latitude, // Save coordinates
                longitude: mapRegion.longitude,
                // Consider updating 'updatedAt' timestamp if needed
            });

            // Update local state reflecting the saved data
            //setUserData(prev => ({
             //   ...prev,
             //   name, phone, email, bio, rate: parseFloat(rate) || 0, skills, picture: profilePicture, availability, address: locationText, latitude: mapRegion.latitude, longitude: mapRegion.longitude
            //}));

            Alert.alert("Success", "Profile updated successfully!");
            setIsEditing(false); // Exit edit mode
        } catch (error: any) {
            console.error("Error updating profile:", error);
            Alert.alert("Error", error?.message || "Failed to update profile");
        }
    };

    // --- MAP FUNCTIONS ---
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

    const onMapPress = async (e: any) => { // Use 'any' if MapPressEvent type is problematic
        if (!isEditing) return; // Only allow map interaction when editing
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setMapRegion(prev => ({ ...prev, latitude, longitude }));
        await reverseGeocode(latitude, longitude);
    };

    const onMarkerDragEnd = async (e: any) => { // Use 'any' if MarkerDragEndEvent type is problematic
        if (!isEditing) return; // Only allow dragging when editing
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setMapRegion(prev => ({ ...prev, latitude, longitude }));
        await reverseGeocode(latitude, longitude);
    };

    const saveLocation = async () => {
        if (!isEditing) return; // Only save when editing
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("User not logged in");
            return;
        }

        try {
            await updateDoc(doc(db, "providers", currentUser.uid), {
                address: locationText,
                latitude: mapRegion.latitude,
                longitude: mapRegion.longitude,
            });
            // Optionally, update main userData state
            // setUserData(prev => ({ ...prev, address: locationText, latitude: mapRegion.latitude, longitude: mapRegion.longitude }));
            Alert.alert("Success", "Location updated successfully!");
        } catch (error) {
            console.error("Error updating location:", error);
            Alert.alert("Error", "Failed to update location.");
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/service/service_account")}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity onPress={isEditing ? saveChanges : () => setIsEditing(true)}>
                    <Text style={styles.editButtonText}>{isEditing ? "Save" : "Edit profile"}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Profile Image + Name */}
                <View style={styles.profileSection}>
                    <TouchableOpacity onPress={pickProfilePicture} disabled={!isEditing}>
                        {profilePicture ? (
                            <Image source={{ uri: profilePicture }} style={styles.avatar} />
                        ) : (
                            <Ionicons name="person-circle-outline" size={100} color="#b58dde" />
                        )}
                    </TouchableOpacity>
                    {isEditing ? (
                        <TextInput
                            style={styles.editableName}
                            value={name}
                            onChangeText={setName}
                        />
                    ) : (
                        <Text style={styles.profileName}>{userData?.name || "Unknown"}</Text>
                    )}
                </View>

                {/* Personal Information Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Name:</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.infoValueInput}
                                value={name}
                                onChangeText={setName}
                            />
                        ) : (
                            <Text style={styles.infoValue}>{userData?.name || "Not provided"}</Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Phone:</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.infoValueInput}
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {userData?.phone ? formatPhoneNumber(userData.phone) : "Not provided"}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email:</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.infoValueInput}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        ) : (
                            <Text style={styles.infoValue}>{userData?.email || "Not provided"}</Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Bio:</Text>
                        {isEditing ? (
                            <TextInput
                                style={[styles.infoValueInput, styles.bioInput]}
                                value={bio}
                                onChangeText={setBio}
                                multiline
                                numberOfLines={4}
                            />
                        ) : (
                            <Text style={styles.infoValue}>{userData?.bio || "No bio available."}</Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Rate (₱/hr):</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.infoValueInput}
                                value={rate}
                                onChangeText={setRate}
                                keyboardType="numeric"
                            />
                        ) : (
                            <Text style={styles.infoValue}>{userData?.rate ? `₱${userData.rate}/hr` : "Not set"}</Text>
                        )}
                    </View>

                    {/* Skills Section */}
                    <Text style={styles.sectionTitle}>Skills</Text>
                    {isEditing ? (
                        <>
                            {skills.map((skill, index) => (
                                <View key={index} style={styles.skillRow}>
                                    {editingSkillIndex === index ? (
                                        <>
                                            <TextInput
                                                style={styles.skillInput}
                                                value={newSkill}
                                                onChangeText={setNewSkill}
                                            />
                                            <TouchableOpacity onPress={saveEditingSkill}>
                                                <Ionicons name="checkmark" size={20} color="#27ae60" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={cancelEditingSkill}>
                                                <Ionicons name="close" size={20} color="#e74c3c" />
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.skillText}>{skill}</Text>
                                            <TouchableOpacity onPress={() => startEditingSkill(index)}>
                                                <Ionicons name="pencil" size={18} color="#000" style={{ marginRight: 10 }} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => removeSkill(index)}>
                                                <Ionicons name="trash-bin" size={18} color="#ff4757" />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            ))}
                            <View style={styles.addSkillRow}>
                                <TextInput
                                    style={styles.skillInput}
                                    value={newSkill}
                                    onChangeText={setNewSkill}
                                    placeholder="Add a new skill..."
                                />
                                <TouchableOpacity onPress={addNewSkill}>
                                    <Ionicons name="checkmark" size={20} color="#27ae60" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={cancelAddingSkill}>
                                    <Ionicons name="close" size={20} color="#e74c3c" />
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        skills.length > 0 ? (
                            skills.map((skill, index) => (
                                <View key={index} style={styles.skillDisplayRow}>
                                    <Text style={styles.skillText}>{skill}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noSkillsText}>No skills added yet.</Text>
                        )
                    )}
                </View>

                {/* Availability Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Availability</Text>
                    {Object.keys(availability).map((dayKey) => {
                        // Type assertion to ensure dayKey is keyof AvailabilityState
                        const day = dayKey as keyof AvailabilityState;
                        const dayAvail = availability[day];
                        return (
                            <TouchableOpacity
                                key={day}
                                style={styles.availabilityRow}
                                onPress={() => openAvailabilityModal(day)}
                                disabled={!isEditing} // Only allow editing when in edit mode
                            >
                                <Text style={styles.dayLabel}>{day}</Text>
                                <Text style={styles.availabilityText}>
                                    {dayAvail.enabled ? `${dayAvail.from} - ${dayAvail.to}` : "Unavailable"}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color="#777" />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Location Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    {isEditing ? (
                        <>
                            <TextInput
                                style={styles.locationInput}
                                value={locationText}
                                onChangeText={setLocationText}
                            />
                            <View style={styles.mapContainer}>
                                {Platform.OS === "web" ? (
                                    <View style={styles.mapFallback}>
                                        <Text style={{ textAlign: "center", color: "#333", padding: 10 }}>
                                            Map preview not available on web. Use the mobile app to pick a location.
                                        </Text>
                                    </View>
                                ) : MapView ? (
                                    <MapView
                                        provider={PROVIDER_GOOGLE} // Specify Google Maps provider
                                        style={styles.map}
                                        initialRegion={mapRegion}
                                        region={mapRegion} // Controlled region
                                        onPress={onMapPress}
                                    >
                                        <Marker
                                            coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }}
                                            draggable
                                            onDragEnd={onMarkerDragEnd}
                                        />
                                    </MapView>
                                ) : (
                                    <View style={styles.mapFallback}>
                                        <Text style={{ textAlign: "center", color: "#333", padding: 10 }}>
                                            Map component not available. Install react-native-maps or run the app on a device/emulator.
                                        </Text>
                                        <Text style={{ textAlign: "center", marginTop: 10, color: "#666" }}>
                                            Showing coordinates: {mapRegion.latitude.toFixed(6)}, {mapRegion.longitude.toFixed(6)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity style={styles.saveLocationButton} onPress={saveLocation}>
                                <Text style={styles.saveLocationText}>Save Location</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.infoValue}>{userData?.address || "Not set"}</Text>
                            <Text style={styles.infoValue}>Lat: {userData?.latitude?.toFixed(6) || "N/A"}</Text>
                            <Text style={styles.infoValue}>Lng: {userData?.longitude?.toFixed(6) || "N/A"}</Text>
                        </>
                    )}
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* AVAILABILITY MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showAvailabilityModal}
                onRequestClose={closeAvailabilityModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Set Availability for {currentDay}</Text>

                        <View style={styles.modalSwitchRow}>
                            <Text style={styles.modalLabel}>Available</Text>
                            <TouchableOpacity
                                style={[
                                    styles.modalSwitch,
                                    tempAvail.enabled ? styles.modalSwitchOn : styles.modalSwitchOff
                                ]}
                                onPress={() => setTempAvail(prev => ({ ...prev, enabled: !prev.enabled }))}
                            >
                                <View style={[styles.modalSwitchThumb, tempAvail.enabled && styles.modalSwitchThumbOn]} />
                            </TouchableOpacity>
                        </View>
                        {tempAvail.enabled && (
                            <>
                                <View style={styles.modalTimeRow}>
                                    <Text style={styles.modalLabel}>From:</Text>
                                    <TextInput
                                        style={styles.modalTimeInput}
                                        value={tempAvail.from}
                                        onChangeText={(text) => setTempAvail(prev => ({ ...prev, from: text }))}
                                        placeholder="HH:MM"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.modalTimeRow}>
                                    <Text style={styles.modalLabel}>To:</Text>
                                    <TextInput
                                        style={styles.modalTimeInput}
                                        value={tempAvail.to}
                                        onChangeText={(text) => setTempAvail(prev => ({ ...prev, to: text }))}
                                        placeholder="HH:MM"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </>
                        )}
                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity style={styles.modalCancelButton} onPress={closeAvailabilityModal}>
                                <Text style={styles.modalCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSaveButton} onPress={saveAvailability}>
                                <Text style={styles.modalSaveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Bottom Navigation (Example - adjust as needed) */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/service/service_home")}>
                    <Ionicons name="home-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/service/service_bookings")}>
                    <Ionicons name="calendar-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/service/service_message")}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/service/service_account")}>
                    <Ionicons name="person-outline" size={24} color="#8e44ad" /> {/* Active icon */}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default ServiceProfileScreen;

// ... (styles remain largely the same, with additions for new components)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
        backgroundColor: "#b58dde",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === "android" ? 45 : 60, // Adjust for status bar
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
    editButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    scroll: { padding: 16, paddingBottom: 100 }, // Add padding for bottom nav
    profileSection: {
        alignItems: "center",
        marginBottom: 20,
        marginTop: 10,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    profileName: {
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: 1,
        marginTop: 8,
    },
    editableName: {
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: 1,
        marginTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
        width: "80%",
        textAlign: "center",
    },
    section: {
        marginTop: 10,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#eee",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 10,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    infoLabel: { fontSize: 14, color: "#444", width: 80 }, // Fixed width for alignment
    infoValue: { fontSize: 14, color: "#777", flex: 1, textAlign: "right" },
    infoValueInput: { // Style for editable text inputs
        fontSize: 14,
        color: "#000",
        flex: 1,
        textAlign: "right",
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
    },
    bioInput: { // Specific style for multi-line bio input
        height: 60,
        textAlignVertical: "top", // Align text to top for multi-line
    },
    skillRow: { // Style for editing skills
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    skillDisplayRow: { // Style for displaying skills
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    skillText: {
        fontSize: 14,
        color: "#444",
        flex: 1,
    },
    skillInput: { // Style for editing skill name
        fontSize: 14,
        color: "#000",
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
        marginRight: 10,
    },
    addSkillRow: { // Style for adding a new skill row
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    noSkillsText: {
        fontSize: 14,
        color: "#999",
        fontStyle: "italic",
        textAlign: "center",
        paddingVertical: 10,
    },
    availabilityRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    dayLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#444",
    },
    availabilityText: {
        fontSize: 14,
        color: "#777",
    },
    locationInput: { // Style for the location input
        backgroundColor: "#f5f5f5",
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        marginBottom: 10,
    },
    mapContainer: { // Style for the map container
        width: "100%",
        height: 200,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 10,
    },
    map: { // Style for the MapView
        flex: 1,
    },
    mapFallback: { // Style for the map fallback view
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 12,
    },
    saveLocationButton: { // Style for the save location button
        backgroundColor: "#b588ff",
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: "center",
    },
    saveLocationText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    logoutButton: {
        backgroundColor: "#b58dde",
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 20,
        alignSelf: "center",
        width: "60%",
    },
    logoutText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center",
    },
    bottomNav: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff",
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10,
        width: "80%",
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 15,
        textAlign: "center",
    },
    modalSwitchRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    modalLabel: {
        fontSize: 16,
        color: "#333",
    },
    modalSwitch: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#ccc",
        justifyContent: "center",
        padding: 5,
    },
    modalSwitchOn: {
        backgroundColor: "#4CAF50",
    },
    modalSwitchOff: {
        backgroundColor: "#ccc",
    },
    modalSwitchThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "white",
    },
    modalSwitchThumbOn: {
        alignSelf: "flex-end",
    },
    modalTimeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    modalTimeInput: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 5,
        padding: 8,
        width: 100,
        textAlign: "center",
    },
    modalButtonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
    },
    modalCancelButton: {
        backgroundColor: "#e74c3c",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        flex: 1,
        marginRight: 5,
    },
    modalCancelButtonText: {
        color: "#fff",
        textAlign: "center",
        fontWeight: "600",
    },
    modalSaveButton: {
        backgroundColor: "#27ae60",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        flex: 1,
        marginLeft: 5,
    },
    modalSaveButtonText: {
        color: "#fff",
        textAlign: "center",
        fontWeight: "600",
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
});