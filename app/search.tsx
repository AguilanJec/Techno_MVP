import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ScrollView,
    Modal,
    SafeAreaView,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db } from "../firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";

interface UserData {
    id: string;
    name: string;
    role?: string; // raw role/type from DB
    displayRole?: string; // normalized (Tutor | Babysitter | other)
    latitude?: number;
    longitude?: number;
    distance?: string; // formatted like "0.85 km"
    distanceKm?: number;
    rate?: string;
    rating?: number;
    reviews?: number;
    bio?: string;
    status?: string;
    picture?: string;
}

export default function SearchScreen() {
    const router = useRouter();
    const [providers, setProviders] = useState<UserData[]>([]);
    const [filteredProviders, setFilteredProviders] = useState<UserData[]>([]);
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilterModal, setShowFilterModal] = useState(false);


    // See-more modal state
    const [seeMoreVisible, setSeeMoreVisible] = useState(false);
    const [seeMoreTitle, setSeeMoreTitle] = useState("");
    const [seeMoreList, setSeeMoreList] = useState<UserData[]>([]);

    // Filter states
    const [sortBy, setSortBy] = useState(""); // "distance", "price_low", "price_high", "rating"
    const [employeeStatus, setEmployeeStatus] = useState(""); // "available", "busy"

    const auth = getAuth();
    const loggedInEmail = auth.currentUser?.email || null;

    // Haversine helpers
    const deg2rad = (deg: number) => deg * (Math.PI / 180);

    const getDistanceFromLatLonInKm = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ) => {
        const R = 6371; // km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) *
            Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // km
    };

    const formatDistanceKm = (distanceKm: number | undefined) => {
        if (typeof distanceKm !== "number" || isNaN(distanceKm)) return "—";
        return `${distanceKm.toFixed(2)} km`; // always in km (2 decimals)
    };

    const parseRate = (rate?: string): number => {
        if (!rate) return 0;
        const n = parseInt(String(rate).replace(/[^0-9]/g, ""), 10);
        return Number.isNaN(n) ? 0 : n;
    };

    const parseDistance = (distance?: string): number => {
        if (!distance) return Infinity;
        const n = parseFloat(distance);
        return Number.isNaN(n) ? Infinity : n;
    };

    // Normalize role/type string to display role
    const normalizeRole = (raw?: any) => {
        if (!raw && raw !== "") return "";
        const s = String(raw || "").toLowerCase().trim();
        if (s.includes("tutor") || s.includes("tutoring")) return "Tutor";
        if (s.includes("baby") || s.includes("babysit") || s.includes("babysitting"))
            return "Babysitter";
        if (s.length === 0) return "";
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // 1) fetch logged-in user's coords from `users` collection (if logged in)
                let userLat: number | null = null;
                let userLon: number | null = null;
                if (loggedInEmail) {
                    const q = query(collection(db, "users"), where("email", "==", loggedInEmail));
                    const userSnap = await getDocs(q);
                    if (!userSnap.empty) {
                        const u = userSnap.docs[0].data() as any;
                        if (typeof u.latitude === "number" && typeof u.longitude === "number") {
                            userLat = u.latitude;
                            userLon = u.longitude;
                        }
                    }
                }

                // 2) fetch providers
                const providersSnap = await getDocs(collection(db, "providers"));
                const list: UserData[] = providersSnap.docs.map((doc) => {
                    const d = doc.data() as any;

                    // compute average rating and count from reviews array if present
                    let avgRating: number | undefined = undefined;
                    let reviewCount = 0;
                    if (Array.isArray(d.reviews) && d.reviews.length > 0) {
                        const ratings = d.reviews
                            .map((r: any) =>
                                typeof r.rating === "number" ? r.rating : parseFloat(r.rating) || 0
                            )
                            .filter((v: number) => !Number.isNaN(v));
                        reviewCount = ratings.length;
                        if (reviewCount > 0) {
                            const sum = ratings.reduce((acc: number, v: number) => acc + v, 0);
                            avgRating = +(sum / reviewCount);
                        }
                    }

                    // compute distance if user coords available and provider coords available
                    let distanceKm: number | undefined = undefined;
                    if (
                        userLat !== null &&
                        userLon !== null &&
                        typeof d.latitude === "number" &&
                        typeof d.longitude === "number"
                    ) {
                        distanceKm = getDistanceFromLatLonInKm(userLat, userLon, d.latitude, d.longitude);
                    }

                    const rawRole = d.role || d.type || "";
                    const displayRole = normalizeRole(rawRole);

                    return {
                        id: doc.id,
                        name: d.name || "",
                        role: rawRole,
                        displayRole,
                        latitude: typeof d.latitude === "number" ? d.latitude : undefined,
                        longitude: typeof d.longitude === "number" ? d.longitude : undefined,
                        distance: formatDistanceKm(distanceKm),
                        distanceKm: distanceKm,
                        rate: d.rate ? String(d.rate) : undefined,
                        rating:
                            typeof avgRating === "number"
                                ? +avgRating.toFixed(1)
                                : typeof d.rating === "number"
                                    ? d.rating
                                    : undefined,
                        reviews: reviewCount,
                        bio: d.bio || undefined,
                        status: Math.random() > 0.5 ? "available" : "busy",
                        picture: d.picture || undefined,
                    } as UserData;
                });

                setProviders(list);
                setFilteredProviders(list);
            } catch (err) {
                console.error("Error fetching providers:", err);
            }
        };

        fetchAll();
    }, [loggedInEmail]);

    // Filtering + sorting effect (reads providers -> produces filteredProviders)
    useEffect(() => {
        let filtered = providers.slice();

        // Category filter: use displayRole (normalized)
        if (activeCategory === "Tutor") {
            filtered = filtered.filter(
                (item) => (item.displayRole || "").toLowerCase() === "tutor"
            );
        } else if (activeCategory === "Babysitter") {
            filtered = filtered.filter(
                (item) => (item.displayRole || "").toLowerCase() === "babysitter"
            );
        }

        // Search filter (by name)
        if (searchQuery.trim() !== "") {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter((item) => (item.name || "").toLowerCase().includes(q));
        }

        // Employee status filter
        if (employeeStatus) {
            filtered = filtered.filter((item) => item.status === employeeStatus);
        }

        // Sorting
        if (sortBy === "distance") {
            filtered = filtered.slice().sort((a, b) => parseDistance(a.distance) - parseDistance(b.distance));
        } else if (sortBy === "price_low") {
            filtered = filtered.slice().sort((a, b) => parseRate(a.rate) - parseRate(b.rate));
        } else if (sortBy === "price_high") {
            filtered = filtered.slice().sort((a, b) => parseRate(b.rate) - parseRate(a.rate));
        } else if (sortBy === "rating") {
            filtered = filtered.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }

        setFilteredProviders(filtered);
    }, [providers, activeCategory, searchQuery, sortBy, employeeStatus]);

    const categories = ["All", "Tutor", "Babysitter"];

    const handleFilterPress = () => setShowFilterModal(true);
    const applyFilters = () => setShowFilterModal(false);
    const resetFilters = () => {
        setSortBy("");
        setEmployeeStatus("");
        setShowFilterModal(false);
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case "available":
                return "#4CAF50";
            case "busy":
                return "#FF9800";
            default:
                return "#666";
        }
    };

    const getStatusText = (status?: string) => {
        switch (status) {
            case "available":
                return "Available";
            case "busy":
                return "Busy";
            default:
                return "Unknown";
        }
    };

    // Open see-more modal for a section (title, full list)
    const openSeeMore = (title: string, data: UserData[]) => {
        setSeeMoreTitle(title);
        setSeeMoreList(data);
        setSeeMoreVisible(true);
    };

    const closeSeeMore = () => {
        setSeeMoreVisible(false);
        setSeeMoreTitle("");
        setSeeMoreList([]);
    };

    const renderProvider = ({ item }: { item: UserData }) => {
        // Strip 'url()' wrapper from the database string if it exists
        const base64String = item.picture
            ? item.picture.replace(/^url\((['"]?)(.*)\1\)$/, '$2')
            : null;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() =>
                    router.push({ pathname: "/details", params: { id: item.id } })
                }
            >
                <View style={styles.cardContent}>
                    <View style={styles.profileInfo}>
                        {item.picture && base64String ? (
                            <Image
                                source={{ uri: base64String }}
                                style={{ width: 50, height: 50, borderRadius: 25 }}
                            />
                        ) : (
                            <Ionicons name="person-circle-outline" size={50} color="#b58dde" />
                        )}

                        <View style={styles.textInfo}>
                            <View style={styles.nameStatusRow}>
                                <Text style={styles.name}>{item.name}</Text>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: getStatusColor(item.status) },
                                    ]}
                                >
                                    <Text style={styles.statusText}>
                                        {getStatusText(item.status)}
                                    </Text>
                                </View>
                            </View>

                            {/* role pill */}
                            {item.displayRole ? (
                                <View style={styles.roleRow}>
                                    <View style={styles.rolePill}>
                                        <Text style={styles.rolePillText}>{item.displayRole}</Text>
                                    </View>
                                </View>
                            ) : null}

                            <View style={styles.distanceContainer}>
                                <Ionicons name="location-outline" size={14} color="#666" />
                                <Text style={styles.distance}>{item.distance}</Text>
                            </View>

                            <View style={styles.ratingContainer}>
                                <Ionicons name="star" size={14} color="#f1c40f" />
                                <Text style={styles.rating}>{item.rating ?? "—"}</Text>
                                <Text style={styles.reviews}>{item.reviews ?? 0} reviews</Text>
                            </View>

                            <Text style={styles.rate}>
                                {item.rate ? `₱${item.rate}/hour` : "—/hour"}
                            </Text>
                        </View>
                    </View>

                    <Ionicons
                        name="heart-outline"
                        size={20}
                        color="#E85D75"
                        style={styles.heartIcon}
                    />
                </View>
            </TouchableOpacity>
        );
    };


    // compute recommended & closest from filteredProviders
    const recommendedProviders = filteredProviders
        .filter((p) => (p.rating || 0) >= 4.5)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0)); // highest rating first

    const closestProviders = filteredProviders
        .slice()
        .sort((a, b) => parseDistance(a.distance) - parseDistance(b.distance));

    // when rendering horizontal section, pass sliced (<=5) items for UI and full list to see-more
    const renderHorizontalSection = (title: string, data: UserData[]) => {
        const display = data.slice(0, 5); // show up to 5
        if (display.length === 0) return null;

        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <TouchableOpacity onPress={() => openSeeMore(title, data)}>
                        <Text style={styles.seeMore}>See more</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={display}
                    renderItem={renderProvider}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                />
            </View>
        );
    };

    // show vertical list only if All category OR user typed a search query
    const shouldShowVertical = searchQuery.trim() !== "" || activeCategory === "All";

    return (
        <SafeAreaView style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchRow}>
                    <View style={styles.searchInputContainer}>
                        <Ionicons name="search-outline" size={20} color="#7B52AB" />
                        <TextInput
                            placeholder="Search..."
                            style={styles.searchInput}
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterButton} onPress={handleFilterPress}>
                        <Ionicons name="filter" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Categories */}
            <View style={styles.categoriesContainer}>
                {categories.map((category) => (
                    <TouchableOpacity
                        key={category}
                        style={[styles.categoryButton, activeCategory === category && styles.categoryButtonActive]}
                        onPress={() => setActiveCategory(category)}
                    >
                        <Text style={[styles.categoryText, activeCategory === category && styles.categoryTextActive]}>
                            {category}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Recommended and Close-to-you sections are always shown (but use filteredProviders,
            so when category = Tutor they automatically only show tutors) */}
                {renderHorizontalSection("Recommend", recommendedProviders)}
                {renderHorizontalSection("Close to you", closestProviders)}


            </ScrollView>

            {/* See more modal (bottom sheet style) */}
            <Modal visible={seeMoreVisible} animationType="slide" transparent={true} onRequestClose={closeSeeMore}>
                <View style={styles.seeMoreModalOverlay}>
                    <View style={styles.seeMoreModal}>
                        <View style={styles.seeMoreHeader}>
                            <Text style={styles.seeMoreTitle}>{seeMoreTitle}</Text>
                            <TouchableOpacity onPress={closeSeeMore}>
                                <Ionicons name="close" size={22} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={seeMoreList}
                            keyExtractor={(item) => item.id}
                            renderItem={renderProvider}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 30 }}
                        />
                    </View>
                </View>
            </Modal>

            {/* Filter Modal (unchanged behavior) */}
            <Modal visible={showFilterModal} animationType="slide" transparent={true} onRequestClose={() => setShowFilterModal(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Options</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Sort By */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Sort By</Text>

                            <TouchableOpacity
                                style={[styles.filterOption, sortBy === "distance" && styles.filterOptionActive]}
                                onPress={() => setSortBy(sortBy === "distance" ? "" : "distance")}
                            >
                                <Text style={[styles.filterOptionText, sortBy === "distance" && styles.filterOptionTextActive]}>Closest Distance</Text>
                                {sortBy === "distance" && <Ionicons name="checkmark" size={20} color="#b58dde" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterOption, sortBy === "price_low" && styles.filterOptionActive]}
                                onPress={() => setSortBy(sortBy === "price_low" ? "" : "price_low")}
                            >
                                <Text style={[styles.filterOptionText, sortBy === "price_low" && styles.filterOptionTextActive]}>Price: Low to High</Text>
                                {sortBy === "price_low" && <Ionicons name="checkmark" size={20} color="#b58dde" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterOption, sortBy === "price_high" && styles.filterOptionActive]}
                                onPress={() => setSortBy(sortBy === "price_high" ? "" : "price_high")}
                            >
                                <Text style={[styles.filterOptionText, sortBy === "price_high" && styles.filterOptionTextActive]}>Price: High to Low</Text>
                                {sortBy === "price_high" && <Ionicons name="checkmark" size={20} color="#b58dde" />}
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.filterOption, sortBy === "rating" && styles.filterOptionActive]} onPress={() => setSortBy(sortBy === "rating" ? "" : "rating")}>
                                <Text style={[styles.filterOptionText, sortBy === "rating" && styles.filterOptionTextActive]}>Highest Rating</Text>
                                {sortBy === "rating" && <Ionicons name="checkmark" size={20} color="#b58dde" />}
                            </TouchableOpacity>
                        </View>

                        {/* Employee Status */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Employee Status</Text>

                            <TouchableOpacity style={[styles.filterOption, employeeStatus === "available" && styles.filterOptionActive]} onPress={() => setEmployeeStatus(employeeStatus === "available" ? "" : "available")}>
                                <Text style={[styles.filterOptionText, employeeStatus === "available" && styles.filterOptionTextActive]}>Available</Text>
                                {employeeStatus === "available" && <Ionicons name="checkmark" size={20} color="#b58dde" />}
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.filterOption, employeeStatus === "busy" && styles.filterOptionActive]} onPress={() => setEmployeeStatus(employeeStatus === "busy" ? "" : "busy")}>
                                <Text style={[styles.filterOptionText, employeeStatus === "busy" && styles.filterOptionTextActive]}>Busy</Text>
                                {employeeStatus === "busy" && <Ionicons name="checkmark" size={20} color="#b58dde" />}
                            </TouchableOpacity>
                        </View>

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}><Text style={styles.resetButtonText}>Reset Filters</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}><Text style={styles.applyButtonText}>Apply Filters</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Bottom Nav (unchanged) */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/home")}>
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
                <TouchableOpacity onPress={() => router.push("/account")}>
                    <Ionicons name="person-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingTop: 30,
        paddingBottom: 30,
        backgroundColor: "#b58dde",
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F4EDFF",
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#E8D8F5",
        flex: 1,
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: "#333",
    },
    filterButton: {
        backgroundColor: "#7B52AB",
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    categoriesContainer: {
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    categoryButton: {
        paddingHorizontal: 0,
        paddingVertical: 8,
        marginRight: 25,
        backgroundColor: "transparent",
    },
    categoryButtonActive: {
        borderBottomWidth: 2,
        borderBottomColor: "#b58dde",
    },
    categoryText: {
        fontSize: 16,
        color: "#666",
        fontWeight: "500",
    },
    categoryTextActive: {
        color: "#b58dde",
        fontWeight: "600",
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        backgroundColor: "#fff",
    },
    section: {
        marginBottom: 25,
        marginTop: 10,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    seeMore: {
        fontSize: 14,
        color: "#b58dde",
        fontWeight: "500",
    },
    horizontalList: {
        paddingRight: 20,
    },
    verticalList: {},
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 15,
        marginRight: 15,
        width: 280,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#f0f0f0",
    },
    cardContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    profileInfo: {
        flexDirection: "row",
        flex: 1,
    },
    textInfo: {
        flex: 1,
        marginLeft: 12,
    },
    nameStatusRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    name: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    statusText: {
        fontSize: 10,
        color: "#fff",
        fontWeight: "bold",
    },
    roleRow: {
        marginBottom: 6,
    },
    rolePill: {
        alignSelf: "flex-start",
        backgroundColor: "#EDE4F7",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    rolePillText: {
        fontSize: 12,
        color: "#7B52AB",
        fontWeight: "600",
    },
    distanceContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    distance: {
        fontSize: 14,
        color: "#666",
        marginLeft: 6,
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    rating: {
        fontSize: 14,
        color: "#333",
        fontWeight: "bold",
        marginLeft: 4,
        marginRight: 4,
    },
    reviews: {
        fontSize: 14,
        color: "#666",
    },
    rate: {
        fontSize: 14,
        color: "#b58dde",
        fontWeight: "bold",
    },
    heartIcon: {
        marginTop: 4,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    filterSection: {
        marginBottom: 25,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 12,
    },
    filterOption: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: "#F8F9FA",
        borderRadius: 10,
        marginBottom: 8,
    },
    filterOptionActive: {
        backgroundColor: "#F4EDFF",
        borderColor: "#b58dde",
        borderWidth: 1,
    },
    filterOptionText: {
        fontSize: 16,
        color: "#666",
    },
    filterOptionTextActive: {
        color: "#b58dde",
        fontWeight: "600",
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
    },
    resetButton: {
        flex: 1,
        paddingVertical: 15,
        backgroundColor: "#F8F9FA",
        borderRadius: 10,
        alignItems: "center",
        marginRight: 10,
    },
    resetButtonText: {
        fontSize: 16,
        color: "#666",
        fontWeight: "600",
    },
    applyButton: {
        flex: 1,
        paddingVertical: 15,
        backgroundColor: "#b58dde",
        borderRadius: 10,
        alignItems: "center",
        marginLeft: 10,
    },
    applyButtonText: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "600",
    },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff",
    },

    /* See-more modal */
    seeMoreModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    seeMoreModal: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingHorizontal: 16,
        paddingTop: 12,
        maxHeight: "80%",
    },
    seeMoreHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 8,
    },
    seeMoreTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
    },
});
