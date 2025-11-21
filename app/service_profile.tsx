import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    Alert,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    Modal,
    Picker, // For availability selection
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import * as Location from "expo-location";
import MapView, { Marker, MapPressEvent, MarkerDragEndEvent } from "react-native-maps";

const ServiceProfileScreen: React.FC = () => {
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [googleLinked, setGoogleLinked] = useState(true);
    const [skills, setSkills] = useState<string[]>([]);
    const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);
    const [newSkillName, setNewSkillName] = useState("");
    const [isAddingSkill, setIsAddingSkill] = useState(false);
    const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [editedPhone, setEditedPhone] = useState("");
    const [editedEmail, setEditedEmail] = useState("");
    const [editedBio, setEditedBio] = useState("");
    const [editedRate, setEditedRate] = useState("");
    const [availability, setAvailability] = useState<Record<string, { enabled: boolean; from: string; to: string }>>({});
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
    const [currentDay, setCurrentDay] = useState<string | null>(null);
    const [tempAvail, setTempAvail] = useState({ enabled: false, from: "08:00", to: "20:00" });

    // --- NEW: State for map coordinates ---
    const DEFAULT = { latitude: 16.4023, longitude: 120.5960, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    const [mapRegion, setMapRegion] = useState(DEFAULT);
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
                        setSkills(data.skills || []);
                        setEditedName(data.name || "");
                        setEditedPhone(data.phone || "");
                        setEditedEmail(data.email || "");
                        setEditedBio(data.bio || "");
                        setEditedRate(data.rate || "");
                        // Initialize availability state
                        setAvailability(data.availability || {});

                        // --- NEW: Load location data ---
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
                    console.error("Error fetching provider ", error);
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
    const removeSkill = async (index: number) => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("User not logged in");
            return;
        }

        const updatedSkills = skills.filter((_, i) => i !== index);
        setSkills(updatedSkills);

        try {
            await updateDoc(doc(db, "providers", currentUser.uid), {
                skills: updatedSkills,
            });
            // Optionally, update main userData state
            // setUserData(prev => ({ ...prev, skills: updatedSkills }));
        } catch (error) {
            console.error("Error removing skill:", error);
            setSkills(skills); // Revert state if update fails
        }
    };

    const startEditingSkill = (index: number) => {
        setEditingSkillIndex(index);
        setNewSkillName(skills[index]);
    };

    const cancelEditingSkill = () => {
        setEditingSkillIndex(null);
        setNewSkillName("");
    };

    const saveEditingSkill = async () => {
        if (editingSkillIndex === null || !newSkillName.trim()) return;

        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("User not logged in");
            return;
        }

        const updatedSkills = [...skills];
        updatedSkills[editingSkillIndex] = newSkillName.trim();
        setSkills(updatedSkills);
        setEditingSkillIndex(null);
        setNewSkillName("");

        try {
            await updateDoc(doc(db, "providers", currentUser.uid), {
                skills: updatedSkills,
            });
            // Optionally, update main userData state
            // setUserData(prev => ({ ...prev, skills: updatedSkills }));
        } catch (error) {
            console.error("Error updating skill:", error);
            // Revert state if update fails
            updatedSkills[editingSkillIndex] = skills[editingSkillIndex];
            setSkills(updatedSkills);
            setEditingSkillIndex(null);
            setNewSkillName("");
        }
    };

    const startAddingSkill = () => {
        setIsAddingSkill(true);
        setNewSkillName("");
    };

    const cancelAddingSkill = () => {
        setIsAddingSkill(false);
        setNewSkillName("");
    };

    const addNewSkill = async () => {
        if (!newSkillName.trim()) return;

        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("User not logged in");
            return;
        }

        const updatedSkills = [...skills, newSkillName.trim()];
        setSkills(updatedSkills);
        setIsAddingSkill(false);
        setNewSkillName("");

        try {
            await updateDoc(doc(db, "providers", currentUser.uid), {
                skills: updatedSkills,
            });
            // Optionally, update main userData state
            // setUserData(prev => ({ ...prev, skills: updatedSkills }));
        } catch (error) {
            console.error("Error adding skill:", error);
            // Revert state if update fails
            setSkills(skills);
            setIsAddingSkill(false);
            setNewSkillName("");
        }
    };

    // --- PERSONAL INFORMATION MANAGEMENT ---
    const startEditingPersonalInfo = () => {
        setIsEditingPersonalInfo(true);
        setEditedName(userData?.name || "");
        setEditedPhone(userData?.phone || "");
        setEditedEmail(userData?.email || "");
        setEditedBio(userData?.bio || "");
        setEditedRate(userData?.rate || "");
    };

    const cancelEditingPersonalInfo = () => {
        setIsEditingPersonalInfo(false);
        // Reset edited values to original
        setEditedName(userData?.name || "");
        setEditedPhone(userData?.phone || "");
        setEditedEmail(userData?.email || "");
        setEditedBio(userData?.bio || "");
        setEditedRate(userData?.rate || "");
    };

    const saveEditingPersonalInfo = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("User not logged in");
            return;
        }

        try {
            await updateDoc(doc(db, "providers", currentUser.uid), {
                name: editedName,
                phone: editedPhone,
                email: editedEmail,
                bio: editedBio,
                rate: editedRate,
                // Note: Address and coordinates would be updated separately if changed via map
            });
            setUserData(prev => ({ ...prev, name: editedName, phone: editedPhone, email: editedEmail, bio: editedBio, rate: editedRate }));
            setIsEditingPersonalInfo(false);
        } catch (error) {
            console.error("Error updating personal info:", error);
            Alert.alert("Error", "Failed to update profile information.");
        }
    };

    // --- AVAILABILITY MANAGEMENT ---
    const openAvailabilityModal = (day: string) => {
        const dayAvail = availability[day] || { enabled: false, from: "08:00", to: "20:00" };
        setTempAvail(dayAvail);
        setCurrentDay(day);
        setShowAvailabilityModal(true);
    };

    const closeAvailabilityModal = () => {
        setShowAvailabilityModal(false);
        setCurrentDay(null);
    };

    const saveAvailability = async () => {
        if (!currentDay) return;

        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("User not logged in");
            return;
        }

        const updatedAvailability = { ...availability, [currentDay]: tempAvail };
        setAvailability(updatedAvailability);

        try {
            await updateDoc(doc(db, "providers", currentUser.uid), {
                availability: updatedAvailability,
            });
            // Optionally, update main userData state
            // setUserData(prev => ({ ...prev, availability: updatedAvailability }));
        } catch (error) {
            console.error("Error updating availability:", error);
            // Revert state if update fails
            setAvailability(availability);
        }
        closeAvailabilityModal();
    };

    // --- MAP FUNCTIONS (NEW) ---
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

    const onMapPress = async (evt: MapPressEvent) => {
        const { latitude, longitude } = evt.nativeEvent.coordinate;
        setMapRegion(prev => ({ ...prev, latitude, longitude }));
        await reverseGeocode(latitude, longitude);
    };

    const onMarkerDragEnd = async (evt: MarkerDragEndEvent) => {
        const { latitude, longitude } = evt.nativeEvent.coordinate;
        setMapRegion(prev => ({ ...prev, latitude, longitude }));
        await reverseGeocode(latitude, longitude);
    };

    const saveLocation = async () => {
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
            setUserData(prev => ({ ...prev, address: locationText, latitude: mapRegion.latitude, longitude: mapRegion.longitude }));
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
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/service_home")}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* PROFILE IMAGE + NAME */}
                <View style={styles.profileSection}>
                    <Ionicons name="person-circle" size={120} color="#b58dde" />
                    <View style={styles.nameRow}>
                        <Text style={styles.profileName}>
                            {userData?.name || "Tony Stark"}
                        </Text>
                        <TouchableOpacity onPress={startEditingPersonalInfo}>
                            <Ionicons name="pencil" size={18} color="#000" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* PERSONAL INFORMATION (Editable) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    {isEditingPersonalInfo ? (
                        <>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Name:</Text>
                                <TextInput
                                    style={styles.infoValueInput}
                                    value={editedName}
                                    onChangeText={setEditedName}
                                />
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Phone:</Text>
                                <TextInput
                                    style={styles.infoValueInput}
                                    value={editedPhone}
                                    onChangeText={setEditedPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Email:</Text>
                                <TextInput
                                    style={styles.infoValueInput}
                                    value={editedEmail}
                                    onChangeText={setEditedEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Bio:</Text>
                                <TextInput
                                    style={[styles.infoValueInput, { height: 60, textAlignVertical: 'top' }]}
                                    value={editedBio}
                                    onChangeText={setEditedBio}
                                    multiline
                                />
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Rate (₱/hr):</Text>
                                <TextInput
                                    style={styles.infoValueInput}
                                    value={editedRate}
                                    onChangeText={setEditedRate}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.buttonRow}>
                                <TouchableOpacity style={styles.saveButton} onPress={saveEditingPersonalInfo}>
                                    <Text style={styles.saveButtonText}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.cancelButton} onPress={cancelEditingPersonalInfo}>
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Name:</Text>
                                <Text style={styles.infoValue}>{userData?.name || "Tony Stark"}</Text>
                                <Ionicons name="chevron-forward" size={18} color="#777" />
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Phone:</Text>
                                <Text style={styles.infoValue}>
                                    {userData?.phone ? formatPhoneNumber(userData.phone) : "0918•••••279"}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color="#777" />
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Email:</Text>
                                <Text style={styles.infoValue}>{userData?.email || "tonystark@gmail.com"}</Text>
                                <Ionicons name="chevron-forward" size={18} color="#777" />
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Bio:</Text>
                                <Text style={styles.infoValue}>{userData?.bio || "No bio provided."}</Text>
                                <Ionicons name="chevron-forward" size={18} color="#777" />
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Rate (₱/hr):</Text>
                                <Text style={styles.infoValue}>{userData?.rate || "Not set"}</Text>
                                <Ionicons name="chevron-forward" size={18} color="#777" />
                            </View>
                            <TouchableOpacity style={styles.editInfoButton} onPress={startEditingPersonalInfo}>
                                <Text style={styles.editInfoText}>Edit Information</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* SERVICES (Skills) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Services (Skills)</Text>

                    {skills.length > 0 ? (
                        skills.map((skill, index) => (
                            <View key={index} style={styles.skillRow}>
                                {editingSkillIndex === index ? (
                                    <>
                                        <TextInput
                                            style={styles.skillInput}
                                            value={newSkillName}
                                            onChangeText={setNewSkillName}
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
                        ))
                    ) : (
                        <Text style={styles.noSkillsText}>No skills added yet.</Text>
                    )}

                    {isAddingSkill ? (
                        <View style={styles.addSkillRow}>
                            <TextInput
                                style={styles.skillInput}
                                value={newSkillName}
                                onChangeText={setNewSkillName}
                                placeholder="Enter new skill..."
                            />
                            <TouchableOpacity onPress={addNewSkill}>
                                <Ionicons name="checkmark" size={20} color="#27ae60" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={cancelAddingSkill}>
                                <Ionicons name="close" size={20} color="#e74c3c" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.addSkillButton} onPress={startAddingSkill}>
                            <Text style={styles.addSkillText}>+ Add Skill</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* AVAILABILITY */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Availability</Text>
                    {Object.keys(availability).length > 0 ? (
                        Object.entries(availability).map(([day, dayAvail]) => (
                            <TouchableOpacity
                                key={day}
                                style={styles.availabilityRow}
                                onPress={() => openAvailabilityModal(day)}
                            >
                                <Text style={styles.availabilityDay}>{day}</Text>
                                <Text style={styles.availabilityText}>
                                    {dayAvail.enabled ? `${dayAvail.from} - ${dayAvail.to}` : "Unavailable"}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color="#777" />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.noDataText}>No availability set. Tap to add.</Text>
                    )}
                    <TouchableOpacity
                        style={styles.addAvailabilityButton}
                        onPress={() => openAvailabilityModal(Object.keys(availability)[0] || "Monday")}
                    >
                        <Text style={styles.addAvailabilityText}>+ Set Availability</Text>
                    </TouchableOpacity>
                </View>

                {/* LOCATION (NEW SECTION) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <TextInput
                        style={styles.locationInput}
                        value={locationText}
                        onChangeText={setLocationText}
                        editable={false} // Disable direct editing, use map interaction
                    />
                    <View style={styles.mapContainer}>
                        {Platform.OS === "web" ? (
                            <View style={styles.mapFallback}>
                                <Text style={{ textAlign: "center", color: "#333", padding: 10 }}>
                                    Map preview not available on web. Use the mobile app to pick a location.
                                </Text>
                            </View>
                        ) : (
                            <MapView
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
                        )}
                    </View>
                    <TouchableOpacity style={styles.saveLocationButton} onPress={saveLocation}>
                        <Text style={styles.saveLocationText}>Save Location</Text>
                    </TouchableOpacity>
                </View>

                {/* PREFERENCES */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.preferenceRow}>
                        <Text style={styles.preferenceText}>Language</Text>
                        <Text style={styles.preferenceValue}>English (Philippines)</Text>
                    </View>
                    <View style={styles.preferenceRow}>
                        <Text style={styles.preferenceText}>Currency</Text>
                        <Text style={styles.preferenceValue}>₱ (PHP)</Text>
                    </View>
                    <TouchableOpacity style={styles.preferenceRow}>
                        <Text style={styles.preferenceText}>Notification Settings</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                </View>

                {/* SUPPORT */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    <TouchableOpacity style={styles.supportRow}>
                        <Text style={styles.supportText}>App Feedback</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.supportRow}>
                        <Text style={styles.supportText}>Help Center</Text>
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                    </TouchableOpacity>
                </View>

                {/* LOGOUT BUTTON */}
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
                                style={[styles.modalSwitch, tempAvail.enabled ? styles.modalSwitchOn : styles.modalSwitchOff]}
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
                                    />
                                </View>
                                <View style={styles.modalTimeRow}>
                                    <Text style={styles.modalLabel}>To:</Text>
                                    <TextInput
                                        style={styles.modalTimeInput}
                                        value={tempAvail.to}
                                        onChangeText={(text) => setTempAvail(prev => ({ ...prev, to: text }))}
                                        placeholder="HH:MM"
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

            {/* BOTTOM NAVIGATION */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/service_home")}>
                    <Ionicons name="home-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/bookinglists")}>
                    <Ionicons name="calendar-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/search")}>
                    <Ionicons name="search-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/message")}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/service_profile")}>
                    <Ionicons name="person" size={24} color="#8e44ad" /> {/* Active icon */}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
        paddingTop: 45,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600"
    },
    scroll: { padding: 16, paddingBottom: 100 }, // Add padding at the bottom for bottom nav
    profileSection: {
        alignItems: "center",
        marginBottom: 20,
        marginTop: 10,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
    },
    profileName: {
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: 1,
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
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    infoLabel: { fontSize: 14, color: "#444", width: 100 },
    infoValue: {
        fontSize: 14,
        color: "#777",
        flex: 1,
        textAlign: "right",
        marginRight: 10
    },
    infoValueInput: { // Style for editable text inputs
        fontSize: 14,
        color: "#000",
        flex: 1,
        textAlign: "right",
        marginRight: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
    },
    buttonRow: { // Style for Save/Cancel buttons row
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
    },
    saveButton: {
        backgroundColor: "#27ae60",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        flex: 1,
        marginRight: 5,
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
    cancelButton: {
        backgroundColor: "#e74c3c",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        flex: 1,
        marginLeft: 5,
    },
    cancelButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
    editInfoButton: { // Style for the "Edit Information" button
        backgroundColor: "#b58dde",
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: "center",
        marginTop: 10,
    },
    editInfoText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    skillRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
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
    addSkillButton: {
        backgroundColor: "#b58dde",
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: "center",
        marginTop: 10,
    },
    addSkillText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
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
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    availabilityDay: {
        fontSize: 14,
        fontWeight: "600",
        color: "#444",
    },
    availabilityText: {
        fontSize: 14,
        color: "#777",
        textAlign: "right",
    },
    addAvailabilityButton: {
        backgroundColor: "#b58dde",
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: "center",
        marginTop: 10,
    },
    addAvailabilityText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    noDataText: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
        paddingVertical: 10,
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
        backgroundColor: "#b58dde",
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: "center",
    },
    saveLocationText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    preferenceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    preferenceText: {
        fontSize: 14,
        color: "#444",
    },
    preferenceValue: {
        fontSize: 14,
        color: "#777",
    },
    supportRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    supportText: {
        fontSize: 14,
        color: "#444",
    },
    linkRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    linkContent: {
        flex: 1,
        marginLeft: 10,
    },
    icon: {
        width: 25,
        height: 25
    },
    linkLabel: {
        fontSize: 14,
        color: "#444",
        fontWeight: "500",
    },
    connectedText: {
        fontSize: 12,
        color: "#4CAF50",
        marginTop: 2,
    },
    connectButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
    },
    connectedButton: {
        backgroundColor: "#f5f5f5",
        borderColor: "#ddd",
    },
    disconnectedButton: {
        backgroundColor: "#b58dde",
        borderColor: "#b58dde",
    },
    connectButtonText: {
        fontSize: 12,
        fontWeight: "600",
    },
    connectedButtonText: {
        color: "#666",
    },
    disconnectedButtonText: {
        color: "#fff",
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
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff",
        position: "absolute", // Position absolute to overlay
        bottom: 0,
        left: 0,
        right: 0,
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
        marginTop: 15,
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
        color: "white",
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
        color: "white",
        textAlign: "center",
        fontWeight: "600",
    },
});