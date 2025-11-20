import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ScrollView, Modal, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db } from "../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

interface UserData {
    id: string;
    name: string;
    type: string;
    distance: string;
    rate: string;
    rating: number;
    reviews: number;
    bio: string;
    status?: string; // Add employee status
}

export default function SearchScreen() {
    const router = useRouter();
    const [providers, setProviders] = useState<UserData[]>([]);
    const [filteredProviders, setFilteredProviders] = useState<UserData[]>([]);
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Filter states
    const [sortBy, setSortBy] = useState(""); // "distance", "price_low", "price_high", "rating"
    const [employeeStatus, setEmployeeStatus] = useState(""); // "available", "busy"

    useEffect(() => {
        const fetchProviders = async () => {
            const querySnapshot = await getDocs(collection(db, "providers"));
            const list: UserData[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as UserData;
                // Add random employee status for demo purposes
                list.push({
                    ...data,
                    status: Math.random() > 0.5 ? "available" : "busy"
                });
            });
            setProviders(list);
            setFilteredProviders(list);
        };

        fetchProviders();
    }, []);

    // Parse rate to number for sorting
    const parseRate = (rate: string): number => {
        return parseInt(rate.replace(/[^0-9]/g, '')) || 0;
    };

    // Parse distance to number for sorting
    const parseDistance = (distance: string): number => {
        return parseFloat(distance) || 0;
    };

    // Filter providers based on category, search, and filters
    useEffect(() => {
        let filtered = providers;

        // Filter by category
        if (activeCategory === "Tutor") {
            filtered = filtered.filter(item => item.type === "Tutor");
        } else if (activeCategory === "Baby sitter") {
            filtered = filtered.filter(item => item.type === "Babysitter");
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by employee status
        if (employeeStatus) {
            filtered = filtered.filter(item => item.status === employeeStatus);
        }

        // Apply sorting
        if (sortBy === "distance") {
            filtered = [...filtered].sort((a, b) =>
                parseDistance(a.distance) - parseDistance(b.distance)
            );
        } else if (sortBy === "price_low") {
            filtered = [...filtered].sort((a, b) =>
                parseRate(a.rate) - parseRate(b.rate)
            );
        } else if (sortBy === "price_high") {
            filtered = [...filtered].sort((a, b) =>
                parseRate(b.rate) - parseRate(a.rate)
            );
        } else if (sortBy === "rating") {
            filtered = [...filtered].sort((a, b) =>
                b.rating - a.rating
            );
        }

        setFilteredProviders(filtered);
    }, [activeCategory, searchQuery, providers, sortBy, employeeStatus]);

    const categories = ["All", "Tutor", "Baby sitter"];

    const handleFilterPress = () => {
        setShowFilterModal(true);
    };

    const applyFilters = () => {
        setShowFilterModal(false);
    };

    const resetFilters = () => {
        setSortBy("");
        setEmployeeStatus("");
        setShowFilterModal(false);
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case "available": return "#4CAF50";
            case "busy": return "#FF9800";
            default: return "#666";
        }
    };

    const getStatusText = (status?: string) => {
        switch (status) {
            case "available": return "Available";
            case "busy": return "Busy";
            default: return "Unknown";
        }
    };

    const renderProvider = ({ item }: { item: UserData }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: "/details", params: { id: item.id } })}
        >
            <View style={styles.cardContent}>
                <View style={styles.profileInfo}>
                    <Ionicons name="person-circle-outline" size={50} color="#b58dde" />
                    <View style={styles.textInfo}>
                        <View style={styles.nameStatusRow}>
                            <Text style={styles.name}>{item.name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                                <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                            </View>
                        </View>
                        <View style={styles.distanceContainer}>
                            <Ionicons name="location-outline" size={14} color="#666" />
                            <Text style={styles.distance}>{item.distance}</Text>
                        </View>
                        <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={14} color="#f1c40f" />
                            <Text style={styles.rating}>{item.rating}</Text>
                            <Text style={styles.reviews}>{item.reviews} reviews</Text>
                        </View>
                        <Text style={styles.rate}>{item.rate}/hour</Text>
                    </View>
                </View>
                <Ionicons name="heart-outline" size={20} color="#E85D75" style={styles.heartIcon} />
            </View>
        </TouchableOpacity>
    );

    const renderHorizontalSection = (title: string, data: UserData[]) => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <TouchableOpacity>
                    <Text style={styles.seeMore}>See more</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={data}
                renderItem={renderProvider}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
            />
        </View>
    );

    const renderVerticalSection = (title: string, data: UserData[]) => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.verticalList}>
                {data.map((item) => (
                    <View key={item.id}>
                        {renderProvider({ item })}
                    </View>
                ))}
            </View>
        </View>
    );

    // Get recommended providers
    const recommendedProviders = filteredProviders.filter(item =>
        item.rating >= 4.5
    );

    // Get closest providers
    const closestProviders = [...filteredProviders]
        .sort((a, b) => parseDistance(a.distance) - parseDistance(b.distance));

    return (
        <View style={styles.container}>
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
                    {/* Filter Button */}
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
                        style={[
                            styles.categoryButton,
                            activeCategory === category && styles.categoryButtonActive
                        ]}
                        onPress={() => setActiveCategory(category)}
                    >
                        <Text style={[
                            styles.categoryText,
                            activeCategory === category && styles.categoryTextActive
                        ]}>
                            {category}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Main Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Recommended Section - Horizontal */}
                {recommendedProviders.length > 0 && renderHorizontalSection("Recommend", recommendedProviders)}

                {/* Close to you Section - Horizontal */}
                {closestProviders.length > 0 && renderHorizontalSection("Close to you", closestProviders)}

                {/* All Providers Section - Show only when filtered (vertical) */}
                {activeCategory !== "All" || searchQuery !== "" ? (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {activeCategory === "All" ? "Search Results" : activeCategory + "s"}
                            </Text>
                        </View>
                        <View style={styles.verticalList}>
                            {filteredProviders.map((item) => (
                                <View key={item.id}>
                                    {renderProvider({ item })}
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}
            </ScrollView>

            {/* Filter Modal */}
            <Modal
                visible={showFilterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Options</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Sort By Section */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Sort By</Text>

                            <TouchableOpacity
                                style={[styles.filterOption, sortBy === "distance" && styles.filterOptionActive]}
                                onPress={() => setSortBy(sortBy === "distance" ? "" : "distance")}
                            >
                                <Text style={[styles.filterOptionText, sortBy === "distance" && styles.filterOptionTextActive]}>
                                    Closest Distance
                                </Text>
                                {sortBy === "distance" && <Ionicons name="checkmark" size={20} color="#b58dde" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterOption, sortBy === "price_low" && styles.filterOptionActive]}
                                onPress={() => setSortBy(sortBy === "price_low" ? "" : "price_low")}
                            >
                                <Text style={[styles.filterOptionText, sortBy === "price_low" && styles.filterOptionTextActive]}>
                                    Price: Low to High
                                </Text>
                                {sortBy === "price_low" && <Ionicons name="checkmark" size={20} color="#b58dde" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterOption, sortBy === "price_high" && styles.filterOptionActive]}
                                onPress={() => setSortBy(sortBy === "price_high" ? "" : "price_high")}
                            >
                                <Text style={[styles.filterOptionText, sortBy === "price_high" && styles.filterOptionTextActive]}>
                                    Price: High to Low
                                </Text>
                                {sortBy === "price_high" && <Ionicons name="checkmark" size={20} color="#b58dde" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterOption, sortBy === "rating" && styles.filterOptionActive]}
                                onPress={() => setSortBy(sortBy === "rating" ? "" : "rating")}
                            >
                                <Text style={[styles.filterOptionText, sortBy === "rating" && styles.filterOptionTextActive]}>
                                    Highest Rating
                                </Text>
                                {sortBy === "rating" && <Ionicons name="checkmark" size={20} color="#b58dde" />}
                            </TouchableOpacity>
                        </View>

                        {/* Employee Status Section */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Employee Status</Text>

                            <TouchableOpacity
                                style={[styles.filterOption, employeeStatus === "available" && styles.filterOptionActive]}
                                onPress={() => setEmployeeStatus(employeeStatus === "available" ? "" : "available")}
                            >
                                <Text style={[styles.filterOptionText, employeeStatus === "available" && styles.filterOptionTextActive]}>
                                    Available
                                </Text>
                                {employeeStatus === "available" && <Ionicons name="checkmark" size={20} color="#b58dde" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterOption, employeeStatus === "busy" && styles.filterOptionActive]}
                                onPress={() => setEmployeeStatus(employeeStatus === "busy" ? "" : "busy")}
                            >
                                <Text style={[styles.filterOptionText, employeeStatus === "busy" && styles.filterOptionTextActive]}>
                                    Busy
                                </Text>
                                {employeeStatus === "busy" && <Ionicons name="checkmark" size={20} color="#b58dde" />}
                            </TouchableOpacity>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                                <Text style={styles.resetButtonText}>Reset Filters</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                                <Text style={styles.applyButtonText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Bottom Navigation */}
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
        </View>
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
    verticalList: {
        // Vertical list styling
    },
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
    // Modal Styles
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
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#fff'
    },
});