// app/service_home.tsx
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { db, auth } from "../../firebaseConfig"; // <-- adjust path if needed

// Firestore imports (modular)
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    where,
    DocumentData,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

const { width: screenWidth } = Dimensions.get("window");

// Types (kept permissive to match your Firestore shapes)
interface Booking {
    id: string;
    parentName: string;
    dateLabel?: string;
    timeLabel?: string;
    location?: string;
    status?: string;
    type?: string;
    raw?: DocumentData;
}

interface StatCard {
    id: string;
    title: string;
    value: string;
    icon: string;
    color: string;
}

export default function ServiceHome() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [stats, setStats] = useState<StatCard[]>([]);
    const [providerName, setProviderName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    // Listen for auth state to get current provider UID
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return () => unsubAuth();
    }, []);

    // When user changes, load provider and appointments
    useEffect(() => {
        if (!user) {
            setProviderName(null);
            setBookings([]);
            setStats([]);
            setLoading(false);
            return;
        }

        let unsubAppointments: (() => void) | null = null;
        let cancelled = false;

        async function loadProviderAndListenAppointments() {
            setLoading(true);
            try {
                // === Load provider document ===
                // Adjust collection name if you call it "providers" or something else
                const providerRef = doc(db, "providers", user.uid);
                const providerSnap = await getDoc(providerRef);

                let name = "there";
                let avgRating = "N/A";

                if (providerSnap.exists()) {
                    const data = providerSnap.data();
                    if (data?.name) name = data.name;
                    // compute average rating from provider's reviews array (if present)
                    if (Array.isArray(data?.reviews) && data.reviews.length > 0) {
                        const sum = data.reviews.reduce((acc: number, r: any) => {
                            const rating = typeof r?.rating === "number" ? r.rating : Number(r?.rating) || 0;
                            return acc + rating;
                        }, 0);
                        const avg = sum / data.reviews.length;
                        avgRating = avg.toFixed(1);
                    } else if (typeof data?.rating === "number") {
                        avgRating = data.rating.toFixed(1);
                    } else {
                        avgRating = "—";
                    }
                } else {
                    avgRating = "—";
                }

                setProviderName(name);

                // === Listen to appointments where providerId == current UID ===
                const appointmentsCol = collection(db, "appointments");
                const q = query(appointmentsCol, where("providerId", "==", user.uid));
                unsubAppointments = onSnapshot(
                    q,
                    (querySnap) => {
                        if (cancelled) return;
                        const docs: Booking[] = [];
                        querySnap.forEach((docSnap) => {
                            const data = docSnap.data();
                            // Filter out completed appointments (keep upcoming/pending/confirmed)
                            if (data?.status && data.status.toLowerCase() === "completed") {
                                return;
                            }

                            // Build sensible display fields from the sample shape you supplied
                            const parentName = data.userEmail || data.userId || data.parentName || "Parent";
                            let dateLabel = data?.schedule?.name || data?.date || "";
                            if (!dateLabel) {
                                // fallback to time fields
                                if (data?.hour12 !== undefined && data?.minute !== undefined && data?.ampm) {
                                    dateLabel = `${data.hour12}:${String(data.minute).padStart(2, "0")} ${data.ampm}`;
                                }
                            }
                            const location = data?.location || data?.address || "";
                            const booking: Booking = {
                                id: docSnap.id,
                                parentName,
                                dateLabel,
                                timeLabel: data?.time || undefined,
                                location,
                                status: data?.status || "pending",
                                type: data?.appointmentType || data?.role || "service",
                                raw: data,
                            };
                            docs.push(booking);
                        });

                        // Sort upcoming by createdAt or some timestamp (descending newest first)
                        docs.sort((a, b) => {
                            const aT = a.raw?.createdAt?.toMillis ? a.raw.createdAt.toMillis() : 0;
                            const bT = b.raw?.createdAt?.toMillis ? b.raw.createdAt.toMillis() : 0;
                            return bT - aT;
                        });

                        setBookings(docs);

                        // === Build stats: Total Bookings & Avg Rating & Upcoming Bookings ===
                        const totalBookings = docs.length.toString();
                        const upcomingCount = docs.length.toString();
                        const statsArr: StatCard[] = [
                            {
                                id: "total",
                                title: "Total Bookings",
                                value: totalBookings,
                                icon: "calendar",
                                color: "#E8DEF8",
                            },
                            {
                                id: "rating",
                                title: "Avg. Rating",
                                value: avgRating,
                                icon: "star",
                                color: "#FFE8E9",
                            },
                            {
                                id: "upcoming",
                                title: "Upcoming",
                                value: upcomingCount,
                                icon: "time",
                                color: "#E3F2FD",
                            },
                        ];
                        setStats(statsArr);
                        setLoading(false);
                    },
                    (error) => {
                        console.error("appointments onSnapshot error:", error);
                        setLoading(false);
                    }
                );
            } catch (err) {
                console.error("loadProviderAndListenAppointments error:", err);
                setLoading(false);
            }
        }

        loadProviderAndListenAppointments();

        return () => {
            cancelled = true;
            if (unsubAppointments) unsubAppointments();
        };
    }, [user]);

    const renderStatCard = ({ item }: { item: StatCard }) => (
        <TouchableOpacity style={[styles.statCard, { backgroundColor: item.color }]}>
            <Ionicons name={item.icon as any} size={28} color="#8e44ad" />
            <View style={styles.statCardContent}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statTitle}>{item.title}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderBooking = ({ item }: { item: Booking }) => {
        let statusColor = "#8e44ad";
        if (item.status === "pending") statusColor = "#f39c12";
        if (item.status === "completed") statusColor = "#27ae60";
        return (
            <TouchableOpacity
                style={styles.bookingCard}
                onPress={() => router.push(`/service/service_booking_details?bookingId=${item.id}`)}
            >
                <View style={styles.bookingHeader}>
                    <Ionicons name="person-circle-outline" size={40} color="#b58dde" />
                    <View style={styles.bookingInfo}>
                        <Text style={styles.parentName}>{item.parentName}</Text>
                        <Text style={styles.bookingDate}>
                            {item.dateLabel} {item.timeLabel ? `| ${item.timeLabel}` : ""}
                        </Text>
                        {item.location ? <Text style={styles.bookingLocation}>{item.location}</Text> : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>
                <View style={styles.bookingFooter}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/chat?uid=${item.raw?.userId || ""}`)}>
                        <Ionicons name="chatbubble-outline" size={18} color="#8e44ad" />
                        <Text style={styles.actionButtonText}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => { /* place call logic here */ }}>
                        <Ionicons name="call-outline" size={18} color="#8e44ad" />
                        <Text style={styles.actionButtonText}>Call</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    // Loading skeleton
    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color="#8e44ad" />
                <Text style={{ marginTop: 8 }}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.greeting}>Hi, {providerName ?? "there"}!</Text>
                    <Text style={styles.welcome}>Welcome back!</Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/user/account")} style={styles.profileIcon}>
                    <Ionicons name="person-circle-outline" size={40} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Location Card */}
            <TouchableOpacity onPress={() => router.push("/authentication/edit_address")} style={styles.locationCard}>
                <Ionicons name="location-outline" size={22} color="#fff" />
                <View>
                    <Text style={styles.locationText}>Baguio City</Text>
                    <Text style={styles.locationSubText}>2019 Sustainable</Text>
                </View>
                <Ionicons name="chevron-down-outline" size={18} color="#fff" style={{ marginLeft: "auto" }} />
            </TouchableOpacity>

            {/* Scroll Content */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
                {/* Stats Section */}
                <Text style={styles.sectionTitle}>Your Stats</Text>
                <FlatList
                    data={stats}
                    renderItem={renderStatCard}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statsList}
                />

                {/* Upcoming Bookings Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
                        <TouchableOpacity onPress={() => router.push("/service/service_bookings")}>
                            <Text style={styles.seeMoreText}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={bookings}
                        renderItem={renderBooking}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.bookingsList}
                        ListEmptyComponent={<Text style={{ color: "#666" }}>No upcoming bookings</Text>}
                    />
                </View>

                {/* Bottom padding */}
                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/service/service_home")}>
                    <Ionicons name="home" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/service/service_bookings")}>
                    <Ionicons name="calendar-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/service/service_message")}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/service/service_account")}>
                    <Ionicons name="person-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// Keep your styles — unchanged except spacing for ActivityIndicator
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        backgroundColor: "#b58dde",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 10,
    },
    headerTextContainer: {
        flex: 1,
    },
    greeting: {
        color: "#fff",
        fontSize: 16,
    },
    welcome: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "bold",
    },
    profileIcon: {
        marginLeft: 10,
    },
    locationCard: {
        flexDirection: "row",
        backgroundColor: "#ddc9dd",
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 12,
        alignItems: "center",
        marginTop: -10,
    },
    locationText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
        marginLeft: 8,
    },
    locationSubText: {
        color: "#f0f0f0",
        fontSize: 12,
        marginLeft: 8,
    },
    scrollContent: {
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 70,
    },
    sectionContainer: {
        marginTop: 20,
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
    seeMoreText: {
        color: "#b58dde",
        fontWeight: "600",
        fontSize: 14,
    },
    statsList: {
        paddingBottom: 10,
    },
    statCard: {
        width: 130,
        height: 80,
        borderRadius: 12,
        padding: 12,
        marginRight: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    statCardContent: {
        marginLeft: 10,
    },
    statValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    statTitle: {
        fontSize: 12,
        color: "#666",
    },
    bookingsList: {
        paddingBottom: 20,
    },
    bookingCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bookingHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    bookingInfo: {
        flex: 1,
        marginLeft: 10,
    },
    parentName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    bookingDate: {
        fontSize: 12,
        color: "#666",
        marginTop: 2,
    },
    bookingLocation: {
        fontSize: 12,
        color: "#666",
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    bookingFooter: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 10,
    },
    actionButtonText: {
        color: "#8e44ad",
        fontSize: 12,
        fontWeight: "600",
        marginLeft: 5,
    },
    bottomPadding: {
        height: 30,
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
