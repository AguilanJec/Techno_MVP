// app/service/service_bookings.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Alert,
    Platform,
    TextInput,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebaseConfig"; // Adjust path if needed
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    doc,
    getDoc,
    updateDoc,
    Timestamp,
    DocumentData,
    QuerySnapshot,
} from "firebase/firestore";

// Define the type for a single booking/appointment
type Appointment = {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    providerId: string;
    providerName: string;
    status: "pending" | "accepted" | "rejected" | "ongoing" | "completed" | "cancelled";
    serviceType: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    notes: string;
    totalAmount: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    searchTerms: string; // Added for search functionality
};

const ServiceBookingsScreen: React.FC = () => {
    const router = useRouter();
    const [bookings, setBookings] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentProviderId, setCurrentProviderId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    // --- STATE FOR FILTER STATUS (for the filter buttons) ---
    const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "accepted" | "rejected" | "ongoing" | "completed" | "cancelled">("all");
    // --- STATE FOR SELECTED TAB (for the tabs: All, Pending, Ongoing, etc.) ---
    const [selectedTab, setSelectedTab] = useState<"All" | "Pending" | "Ongoing" | "Completed" | "Cancelled">("All");

    // Fetch current provider ID and listen for bookings
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentProviderId(user.uid);

                // Create a query to fetch appointments where the current user is the provider
                const q = query(
                    collection(db, "appointments"), // Assuming appointments are stored here
                    where("providerId", "==", user.uid),
                    orderBy("createdAt", "desc") // Order by creation time, newest first
                );

                const unsubscribeBookings = onSnapshot(
                    q,
                    (querySnapshot) => {
                        const fetchedBookings: Appointment[] = [];
                        const userPromises: Promise<void>[] = []; // To fetch user details concurrently

                        querySnapshot.forEach((docSnapshot) => {
                            const data = docSnapshot.data();
                            const bookingId = docSnapshot.id;

                            // Calculate search terms (used for search bar filtering)
                            const searchTermString = `${data.userName || ""} ${data.userEmail || ""} ${data.status || ""} ${data.serviceType || ""} ${data.bookingDate || ""}`.toLowerCase();

                            const booking: Appointment = {
                                id: bookingId,
                                userId: data.userId,
                                userName: data.userName || "Unknown User", // Will be updated later
                                userEmail: data.userEmail || "N/A",
                                userPhone: data.userPhone || "N/A",
                                providerId: data.providerId,
                                providerName: data.providerName,
                                status: (data.status || "pending").toLowerCase() as any, // Type assertion for now
                                serviceType: data.serviceType || "service",
                                bookingDate: data.bookingDate || "N/A",
                                startTime: data.startTime || "N/A",
                                endTime: data.endTime || "N/A",
                                notes: data.notes || "No notes",
                                totalAmount: data.totalAmount || 0,
                                createdAt: data.createdAt || Timestamp.now(),
                                updatedAt: data.updatedAt || Timestamp.now(),
                                searchTerms: searchTermString, // <-- Ensure this is included
                            };

                            fetchedBookings.push(booking);

                            // If user name/email/phone are not stored in the appointment doc,
                            // fetch them from the 'users' collection
                            if (!data.userName || !data.userEmail || !data.userPhone) {
                                const userPromise = getDoc(doc(db, "users", data.userId))
                                    .then((userDoc) => {
                                        if (userDoc.exists()) {
                                            const userData = userDoc.data();
                                            // Update the booking object in the array
                                            const index = fetchedBookings.findIndex(b => b.id === bookingId);
                                            if (index !== -1) {
                                                fetchedBookings[index] = {
                                                    ...fetchedBookings[index],
                                                    userName: userData.name || fetchedBookings[index].userName,
                                                    userEmail: userData.email || fetchedBookings[index].userEmail,
                                                    userPhone: userData.phone || fetchedBookings[index].userPhone,
                                                };
                                                // Update search terms as well
                                                const updatedSearchTermString = `${fetchedBookings[index].userName || ""} ${fetchedBookings[index].userEmail || ""} ${fetchedBookings[index].status || ""} ${fetchedBookings[index].serviceType || ""} ${fetchedBookings[index].bookingDate || ""}`.toLowerCase();
                                                fetchedBookings[index].searchTerms = updatedSearchTermString;
                                            }
                                        }
                                    })
                                    .catch(err => {
                                        console.error("Error fetching user data for booking:", bookingId, err);
                                        // Keep the placeholder values if fetching user data fails
                                    });

                                userPromises.push(userPromise);
                            }
                        });

                        // Wait for all user detail promises to resolve before setting state
                        Promise.all(userPromises).finally(() => {
                            // Sort bookings by createdAt (newest first)
                            const sortedBookings = fetchedBookings.sort((a, b) => {
                                const timeA = a.createdAt.toDate().getTime();
                                const timeB = b.createdAt.toDate().getTime();
                                return timeB - timeA; // Descending order
                            });

                            setBookings(sortedBookings);
                            setLoading(false);
                            setRefreshing(false);
                        });
                    },
                    (error) => {
                        console.error("Error fetching bookings: ", error);
                        setLoading(false);
                        setRefreshing(false);
                        Alert.alert("Error", "Failed to load bookings. Please try again later.");
                    }
                );

                // Cleanup subscription when component unmounts or user changes
                return () => unsubscribeBookings();
            } else {
                setCurrentProviderId(null);
                setBookings([]);
                setLoading(false);
                setRefreshing(false);
            }
        });

        // Cleanup auth listener
        return () => unsubscribeAuth();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        // The onSnapshot listener will automatically update the state when data changes,
        // so setRefreshing(false) is handled inside the listener.
    };

    // --- FILTER LOGIC ---
    // First, apply the tab filter (All, Pending, Ongoing, etc.)
    const bookingsFilteredByTab = bookings.filter(booking => {
        if (selectedTab === "All") return true;
        // Map the tab name to the corresponding status values
        switch (selectedTab) {
            case "Pending":
                return booking.status === "pending";
            case "Ongoing":
                return booking.status === "ongoing" || booking.status === "accepted"; // Assuming 'accepted' means started/ongoing
            case "Completed":
                return booking.status === "completed";
            case "Cancelled":
                return booking.status === "cancelled" || booking.status === "rejected"; // Assuming 'rejected' counts as cancelled
            default:
                return true; // Should not happen if selectedTab is constrained correctly
        }
    });

    // Then, apply the search query filter *on top of* the tab-filtered results
    const bookingsFilteredByTabAndSearch = bookingsFilteredByTab.filter(booking => {
        return booking.searchTerms.includes(searchQuery.toLowerCase());
    });

    // Function to update booking status (accept/reject/etc.)
    const updateBookingStatus = async (bookingId: string, newStatus: Appointment["status"]) => {
        if (!currentProviderId) {
            Alert.alert("Error", "You must be logged in to update a booking.");
            return;
        }

        try {
            // Optimistically update the UI
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));

            // Update the status in Firestore
            await updateDoc(doc(db, "appointments", bookingId), {
                status: newStatus,
                updatedAt: Timestamp.now(), // Update the timestamp
            });

            console.log(`Booking ${bookingId} status updated to ${newStatus}`);
            // Optionally, show a success message
            // Alert.alert("Success", `Booking status updated to ${newStatus}.`);
        } catch (error: any) {
            console.error("Error updating booking status:", error);
            // Revert the optimistic update if the Firestore update fails
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: b.status } : b));
            Alert.alert("Error", error?.message || "Failed to update booking status. Please try again.");
        }
    };

    // Function to format Firestore Timestamps (example)
    const formatTimestamp = (timestamp: Timestamp): string => {
        if (!timestamp) return "N/A";
        try {
            return new Date(timestamp.toDate()).toLocaleDateString() + " " + new Date(timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            console.warn("Error formatting timestamp:", e);
            return "Invalid Date";
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <Text>Loading bookings...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <View style={{ width: 24 }} /> {/* Spacer for alignment */}
            </View>

            {/* Search Bar - MOVED ABOVE TABS */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search bookings..."
                    value={searchQuery}
                    onChangeText={setSearchQuery} // <-- SET THE SEARCH QUERY STATE
                />
            </View>

            {/* Tabs - NOW BELOW SEARCH BAR */}
            <View style={styles.tabs}>
                {(["All", "Pending", "Ongoing", "Completed", "Cancelled"] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, selectedTab === tab && styles.tabActive]}
                        onPress={() => setSelectedTab(tab)} // <-- SET THE TAB STATE
                    >
                        <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Bookings List */}
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {bookingsFilteredByTabAndSearch.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyStateText}>No bookings found</Text>
                        <Text style={styles.emptyStateSubText}>
                            {selectedTab === "All" && !searchQuery
                                ? "You don't have any bookings yet."
                                : `No ${selectedTab.toLowerCase()} bookings found${searchQuery ? ` for "${searchQuery}"` : "."}`}
                        </Text>
                    </View>
                ) : (
                    bookingsFilteredByTabAndSearch.map((booking) => (
                        <View key={booking.id} style={styles.bookingCard}>
                            <View style={styles.bookingHeader}>
                                <Text style={styles.bookingTitle}>{booking.serviceType}</Text>
                                <View style={[
                                    styles.statusBadge,
                                    booking.status === "pending" && styles.statusPending,
                                    booking.status === "accepted" && styles.statusAccepted,
                                    booking.status === "rejected" && styles.statusRejected,
                                    booking.status === "ongoing" && styles.statusOngoing,
                                    booking.status === "completed" && styles.statusCompleted,
                                    booking.status === "cancelled" && styles.statusCancelled,
                                ]}>
                                    <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
                                </View>
                            </View>

                            <View style={styles.bookingDetails}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Client:</Text>
                                    <Text style={styles.detailValue}>{booking.userName}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Date:</Text>
                                    <Text style={styles.detailValue}>{booking.bookingDate}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Time:</Text>
                                    <Text style={styles.detailValue}>{booking.startTime} - {booking.endTime}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Amount:</Text>
                                    <Text style={styles.detailValue}>₱{booking.totalAmount}</Text>
                                </View>
                                {booking.notes ? (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Notes:</Text>
                                        <Text style={styles.detailValue}>{booking.notes}</Text>
                                    </View>
                                ) : null}
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Requested:</Text>
                                    <Text style={styles.detailValue}>{formatTimestamp(booking.createdAt)}</Text>
                                </View>
                            </View>

                            {/* Action Buttons based on status */}
                            <View style={styles.actionButtons}>
                                {(booking.status === "pending") && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.acceptButton]}
                                            onPress={() => updateBookingStatus(booking.id, "accepted")}
                                        >
                                            <Text style={styles.actionButtonText}>Accept</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.rejectButton]}
                                            onPress={() => updateBookingStatus(booking.id, "rejected")}
                                        >
                                            <Text style={styles.actionButtonText}>Reject</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                                {(booking.status === "accepted") && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.startButton]}
                                        onPress={() => updateBookingStatus(booking.id, "ongoing")}
                                    >
                                        <Text style={styles.actionButtonText}>Start Service</Text>
                                    </TouchableOpacity>
                                )}
                                {(booking.status === "ongoing") && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.completeButton]}
                                        onPress={() => updateBookingStatus(booking.id, "completed")}
                                    >
                                        <Text style={styles.actionButtonText}>Complete</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.messageButton]}
                                    onPress={() => {
                                        // Navigate to chat with the user
                                        router.push(`../service_chat?userId=${booking.userId}&userName=${encodeURIComponent(booking.userName)}`);
                                    }}
                                >
                                    <Text style={styles.actionButtonText}>Message</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Bottom Navigation (Example) */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("../service/service_home")}>
                    <Ionicons name="home-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("../service/service_bookings")}>
                    <Ionicons name="calendar-outline" size={24} color="#8e44ad" /> {/* Active */}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("../service/service_message")}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("../service/service_account")}>
                    <Ionicons name="person-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ServiceBookingsScreen;

// ... (styles remain largely the same, with additions for new components if needed)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        backgroundColor: "#b58dde",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 45,
    },
    backButton: {
        // Style for back button if needed
    },
    headerTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    // --- STYLES FOR SEARCH BAR ---
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        marginHorizontal: 16,
        marginVertical: 10, // Reduced margin
        borderRadius: 20,
        paddingHorizontal: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 16,
    },
    // --- STYLES FOR TABS ---
    tabs: {
        flexDirection: "row",
        justifyContent: "space-around",
        backgroundColor: "#f8f8f8",
        paddingVertical: 10,
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tabActive: {
        backgroundColor: "#b58dde",
    },
    tabText: {
        color: "#777",
        fontSize: 14,
        fontWeight: "600",
    },
    tabTextActive: {
        color: "#fff",
    },
    // --- OTHER STYLES (scroll, cards, etc.) ---
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100, // Space for bottom nav
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#666",
        marginTop: 16,
    },
    emptyStateSubText: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
        marginTop: 8,
    },
    bookingCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bookingHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    bookingTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusPending: { backgroundColor: "#fff3cd" },
    statusAccepted: { backgroundColor: "#d4edda" },
    statusRejected: { backgroundColor: "#f8d7da" },
    statusOngoing: { backgroundColor: "#d1ecf1" },
    statusCompleted: { backgroundColor: "#d4edda" }, // Or use a different color if distinct from 'accepted'
    statusCancelled: { backgroundColor: "#f8d7da" }, // Or use a different color if distinct from 'rejected'
    statusText: {
        fontSize: 12,
        fontWeight: "600",
        // Color will depend on status, defined in specific status styles if needed
    },
    bookingDetails: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: "#666",
        fontWeight: "600",
        width: 80, // Fixed width for alignment
    },
    detailValue: {
        fontSize: 14,
        color: "#333",
        flex: 1,
        textAlign: "right",
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
        marginHorizontal: 2,
    },
    acceptButton: {
        backgroundColor: "#27ae60",
    },
    rejectButton: {
        backgroundColor: "#e74c3c",
    },
    startButton: {
        backgroundColor: "#3498db",
    },
    completeButton: {
        backgroundColor: "#16a085",
    },
    messageButton: {
        backgroundColor: "#9b59b6",
    },
    actionButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
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
});