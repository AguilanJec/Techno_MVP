import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Alert,
    TextInput,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebaseConfig";
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
    Timestamp, addDoc, getDocs,
} from "firebase/firestore";

interface UserData {
    name: string;
    email: string;
    phone: string;
}

function formatTimeField(t: any) {
    try {
        if (t === null || t === undefined) return "—";
        if (typeof t === "string") return t;
        // Timestamp
        if (typeof t?.toDate === "function") {
            const d = t.toDate();
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        // time map like { hour12, minute, ampm } or { hour, minute, ampm }
        const hour = t.hour12 ?? t.hour ?? t.h ?? null;
        const minute = (t.minute !== undefined && t.minute !== null) ? String(t.minute).padStart(2, "0") : "00";
        const ampm = (t.ampm ?? "").toString();
        if (hour !== null) return `${hour}:${minute}${ampm ? " " + ampm : ""}`;
        // fallback
        return String(t);
    } catch {
        return String(t);
    }
}

function formatBookingDateField(d: any) {
    try {
        if (d === null || d === undefined) return "—";
        if (typeof d === "string") return d;
        if (typeof d?.toDate === "function") {
            const dt = d.toDate();
            return dt.toLocaleDateString() + " " + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        // If it's an object (map) that already contains a readable 'name' (some schedule objects do)
        if (typeof d === "object" && d.name) return String(d.name);
        return String(d);
    } catch {
        return String(d);
    }
}

function safeNumber(val: any) {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
}

function formatTimestamp(ts: any): string {
    if (!ts) return "N/A";
    try {
        if (typeof ts?.toDate === "function") {
            const d = ts.toDate();
            return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        // If it's already a Date
        if (ts instanceof Date) {
            return ts.toLocaleDateString() + " " + ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        return String(ts);
    } catch {
        return String(ts);
    }
}

// ---------- Types ----------
type AppointmentStatus = "pending" | "accepted" | "rejected" | "ongoing" | "completed" | "cancelled";

type Appointment = {
    id: string;
    userId?: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    providerId?: string;
    providerName?: string;
    status: AppointmentStatus;
    serviceType: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    notes: string;
    totalAmount: number;
    createdAt: Timestamp | any;
    updatedAt: Timestamp | any;
    searchTerms: string;
};

// ---------- Component ----------
const ServiceBookingsScreen: React.FC = () => {
    const router = useRouter();
    const [bookings, setBookings] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentProviderId, setCurrentProviderId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTab, setSelectedTab] = useState<"All" | "Pending" | "Ongoing" | "Completed" | "Cancelled">("All");

    // Function to fetch user details
    const fetchUserDetails = async (userId: string) => {
        try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                const userData = userDoc.data() as UserData;
                return {
                    name: userData.name || "Unknown User",
                    email: userData.email || "N/A",
                    phone: userData.phone || "N/A"
                };
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
        }
        return {
            name: "Unknown User",
            email: "N/A",
            phone: "N/A"
        };
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentProviderId(user.uid);

                const q = query(
                    collection(db, "appointments"),
                    where("providerId", "==", user.uid),
                    orderBy("createdAt", "desc")
                );

                const unsubscribeBookings = onSnapshot(
                    q,
                    async (querySnapshot) => {
                        const fetched: Appointment[] = [];
                        const userFetchPromises: Promise<void>[] = [];

                        querySnapshot.forEach((docSnap) => {
                            const data = docSnap.data() || {};
                            const bookingId = docSnap.id;

                            // normalize/format fields so UI never sees raw objects
                            const formattedBookingDate = formatBookingDateField(data.bookingDate ?? data.date ?? data.schedule ?? null);
                            const formattedStartTime = formatTimeField(data.startTime ?? (data.schedule?.startTime) ?? (data.startTime) ?? { hour12: data.hour12, minute: data.minute, ampm: data.ampm });

                            let formattedEndTime = formatTimeField(data.endTime ?? data.finishTime ?? null);
                            if ((!formattedEndTime || formattedEndTime === "—") && data.startTime && data.durationHours) {
                                try {
                                    const dHours = safeNumber(data.durationHours);
                                    formattedEndTime = formatTimeField(data.endTime) !== "—" ? formatTimeField(data.endTime) : "—";
                                } catch {
                                    formattedEndTime = "—";
                                }
                            }

                            // Create initial booking with available data
                            const booking: Appointment = {
                                id: bookingId,
                                userId: data.userId,
                                userName: data.userName || "Unknown User",
                                userEmail: data.userEmail || "N/A",
                                userPhone: data.userPhone || "N/A",
                                providerId: data.providerId,
                                providerName: data.providerName,
                                status: (data.status || "pending").toLowerCase() as AppointmentStatus,
                                serviceType: data.appointmentType || data.serviceType || "service",
                                bookingDate: formattedBookingDate,
                                startTime: formattedStartTime,
                                endTime: formattedEndTime,
                                notes: data.notes || "No notes",
                                totalAmount: data.totalAmount || (safeNumber(data.ratePerHour) * safeNumber(data.durationHours)) || 0,
                                createdAt: data.createdAt || Timestamp.now(),
                                updatedAt: data.updatedAt || Timestamp.now(),
                                searchTerms: `${data.userName || ""} ${data.userEmail || ""} ${data.status || ""} ${data.appointmentType || ""} ${formattedBookingDate}`.toLowerCase(),
                            };

                            fetched.push(booking);

                            // Always fetch user details to ensure we have the correct name
                            if (data.userId) {
                                const p = (async () => {
                                    try {
                                        const userDetails = await fetchUserDetails(data.userId);
                                        const idx = fetched.findIndex(b => b.id === bookingId);
                                        if (idx !== -1) {
                                            fetched[idx] = {
                                                ...fetched[idx],
                                                userName: userDetails.name,
                                                userEmail: userDetails.email,
                                                userPhone: userDetails.phone,
                                            };
                                            fetched[idx].searchTerms = `${fetched[idx].userName} ${fetched[idx].userEmail} ${fetched[idx].status} ${fetched[idx].serviceType} ${fetched[idx].bookingDate}`.toLowerCase();
                                        }
                                    } catch (err) {
                                        console.error("Error fetching user for booking", bookingId, err);
                                    }
                                })();
                                userFetchPromises.push(p);
                            }
                        });

                        await Promise.all(userFetchPromises);

                        // sort by createdAt desc (safely)
                        fetched.sort((a, b) => {
                            const aTs = typeof a.createdAt?.toDate === "function" ? a.createdAt.toDate().getTime() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
                            const bTs = typeof b.createdAt?.toDate === "function" ? b.createdAt.toDate().getTime() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
                            return bTs - aTs;
                        });

                        setBookings(fetched);
                        setLoading(false);
                        setRefreshing(false);
                    },
                    (error) => {
                        console.error("Error fetching bookings: ", error);
                        setLoading(false);
                        setRefreshing(false);
                        Alert.alert("Error", "Failed to load bookings. Please try again later.");
                    }
                );

                return () => unsubscribeBookings();
            } else {
                setCurrentProviderId(null);
                setBookings([]);
                setLoading(false);
                setRefreshing(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        // snapshot listener will refresh data automatically
    };

    // Filter by tab
    const bookingsFilteredByTab = bookings.filter((booking) => {
        if (selectedTab === "All") return true;
        switch (selectedTab) {
            case "Pending":
                return booking.status === "pending";
            case "Ongoing":
                return booking.status === "ongoing" || booking.status === "accepted";
            case "Completed":
                return booking.status === "completed";
            case "Cancelled":
                return booking.status === "cancelled" || booking.status === "rejected";
            default:
                return true;
        }
    });

    // search on searchTerms
    const bookingsFilteredByTabAndSearch = bookingsFilteredByTab.filter((booking) =>
        booking.searchTerms.includes(searchQuery.toLowerCase())
    );

    // Update booking status (with optimistic UI and rollback)
    const updateBookingStatus = async (bookingId: string, newStatus: Appointment["status"]) => {
        if (!currentProviderId) {
            Alert.alert("Error", "You must be logged in to update a booking.");
            return;
        }

        const prev = bookings.find(b => b.id === bookingId)?.status ?? "pending";

        // confirm for destructive statuses (optional)
        const proceed = await new Promise<boolean>((res) =>
            Alert.alert(
                "Confirm",
                `Change status to "${newStatus}"?`,
                [
                    { text: "Cancel", onPress: () => res(false), style: "cancel" },
                    { text: "Yes", onPress: () => res(true) },
                ],
                { cancelable: true }
            )
        );
        if (!proceed) return;

        try {
            // optimistic update
            setBookings(prevList => prevList.map(b => (b.id === bookingId ? { ...b, status: newStatus } : b)));

            await updateDoc(doc(db, "appointments", bookingId), {
                status: newStatus,
                updatedAt: Timestamp.now(),
            });

            // success - nothing else needed (snapshot will keep in sync)
        } catch (err: any) {
            console.error("Error updating booking status:", err);
            // rollback
            setBookings(prevList => prevList.map(b => (b.id === bookingId ? { ...b, status: prev } : b)));
            Alert.alert("Error", err?.message || "Failed to update booking status. Please try again.");
        }
    };

    // Function to handle message button press
    const handleMessagePress = async (booking: Appointment) => {
        if (!booking.userId || !booking.userName) {
            Alert.alert("Error", "Cannot message this user - missing user information");
            return;
        }

        try {
            // Check if conversation already exists
            const conversationsQuery = query(
                collection(db, "conversations"),
                where("participants", "array-contains", currentProviderId)
            );

            const conversationsSnapshot = await getDocs(conversationsQuery);
            let existingConversationId = null;

            conversationsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.participants.includes(booking.userId)) {
                    existingConversationId = doc.id;
                }
            });

            if (existingConversationId) {
                // Navigate to existing conversation
                router.push({
                    pathname: "/chat",
                    params: {
                        conversationId: existingConversationId,
                        otherUserName: booking.userName,
                        otherUserId: booking.userId,
                        userType: "customer"
                    }
                });
            } else {
                // Create new conversation
                const newConversation = {
                    participants: [currentProviderId, booking.userId],
                    participantNames: [currentProviderId, booking.userName],
                    lastMessage: "Conversation started from booking",
                    lastMessageTime: new Date(),
                    unread: false,
                    lastMessageSender: currentProviderId
                };

                const docRef = await addDoc(collection(db, "conversations"), newConversation);
                router.push({
                    pathname: "/chat",
                    params: {
                        conversationId: docRef.id,
                        otherUserName: booking.userName,
                        otherUserId: booking.userId,
                        userType: "customer"
                    }
                });
            }
        } catch (error) {
            console.error("Error handling message:", error);
            Alert.alert("Error", "Failed to start conversation. Please try again.");
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#8e44ad" />
                <Text style={{ marginTop: 8 }}>Loading bookings...</Text>
            </View>
        );
    }

    function formatServiceType(type: string | undefined) {
        switch (type) {
            case "one_time":
                return "One-Time Service";
            case "schedule":
                return "Scheduled Service";
            case "service":
            default:
                return type ? type.charAt(0).toUpperCase() + type.slice(1) : "Service";
        }
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search bookings..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {(["All", "Pending", "Ongoing", "Completed", "Cancelled"] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, selectedTab === tab && styles.tabActive]}
                        onPress={() => setSelectedTab(tab)}
                    >
                        <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Bookings list */}
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
                            {/* Make the card content clickable */}
                            <TouchableOpacity
                                style={{ flex: 1 }}
                                onPress={() => router.push(`../service/service_booking_details?bookingId=${booking.id}`)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.bookingHeader}>
                                    <Text style={styles.bookingTitle}>{formatServiceType(booking.serviceType)}</Text>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            booking.status === "pending" && styles.statusPending,
                                            booking.status === "accepted" && styles.statusAccepted,
                                            booking.status === "rejected" && styles.statusRejected,
                                            booking.status === "ongoing" && styles.statusOngoing,
                                            booking.status === "completed" && styles.statusCompleted,
                                            booking.status === "cancelled" && styles.statusCancelled,
                                        ]}
                                    >
                                        <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
                                    </View>
                                </View>

                                <View style={styles.bookingDetails}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Client:</Text>
                                        <Text style={styles.detailValue}>{booking.userName}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Email:</Text>
                                        <Text style={styles.detailValue}>{booking.userEmail}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Phone:</Text>
                                        <Text style={styles.detailValue}>{booking.userPhone}</Text>
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
                                        <Text style={styles.detailValue}>₱{booking.totalAmount.toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Notes:</Text>
                                        <Text style={styles.detailValue}>{booking.notes}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* Action Buttons */}
                            <View style={styles.actionButtons}>
                                {booking.status === "pending" && (
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
                                {booking.status === "accepted" && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.startButton]}
                                        onPress={() => updateBookingStatus(booking.id, "ongoing")}
                                    >
                                        <Text style={styles.actionButtonText}>Start Service</Text>
                                    </TouchableOpacity>
                                )}
                                {booking.status === "ongoing" && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.completeButton]}
                                        onPress={() => updateBookingStatus(booking.id, "completed")}
                                    >
                                        <Text style={styles.actionButtonText}>Complete</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.messageButton]}
                                    onPress={() => handleMessagePress(booking)}
                                >
                                    <Text style={styles.actionButtonText}>Message</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Bottom nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("../service/service_home")}>
                    <Ionicons name="home-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("../service/service_bookings")}>
                    <Ionicons name="calendar-outline" size={24} color="#8e44ad" />
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        backgroundColor: "#b58dde",
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 45,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    searchContainer: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        backgroundColor: "#f5f5f5",
        marginHorizontal: 16,
        marginVertical: 10,
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
    tabs: {
        flexDirection: "row" as const,
        justifyContent: "space-around" as const,
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
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    centered: {
        flex: 1,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        backgroundColor: "#fff",
    },
    emptyState: {
        alignItems: "center" as const,
        justifyContent: "center" as const,
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
        textAlign: "center" as const,
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
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
        marginBottom: 12,
    },
    bookingTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        flex: 1,
        marginRight: 10,
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
    statusCompleted: { backgroundColor: "#d4edda" },
    statusCancelled: { backgroundColor: "#f8d7da" },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    bookingDetails: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: "#666",
        fontWeight: "600",
        width: 80,
    },
    detailValue: {
        fontSize: 14,
        color: "#333",
        flex: 1,
        textAlign: "right" as const,
    },
    actionButtons: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        flexWrap: "wrap" as const,
    },
    actionButton: {
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center" as const,
        marginHorizontal: 2,
        marginBottom: 5,
        minWidth: 80,
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
        position: "absolute" as const,
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row" as const,
        justifyContent: "space-around" as const,
        alignItems: "center" as const,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff",
    },
});