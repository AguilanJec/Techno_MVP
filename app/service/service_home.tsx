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
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { db, auth } from "../../firebaseConfig";

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

interface Booking {
    id: string;
    parentName: string;
    dateLabel?: string;
    timeLabel?: string;
    location?: string;
    status?: string;
    type?: string;
    raw?: DocumentData;
    userId?: string;
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

    const [providerData, setProviderData] = useState<any>(null);
    const [providerPictureUri, setProviderPictureUri] = useState<string | null>(null);
    const [userCache, setUserCache] = useState<Record<string, { name?: string; picture?: string }>>({});

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return () => unsubAuth();
    }, []);

    const getSanitizedPictureUri = (raw?: string) => {
        if (!raw) return null;

        let trimmed = raw.trim();
        const urlMatch = trimmed.match(/^url\(["']?(.*?)["']?\)$/i);
        if (urlMatch) {
            trimmed = urlMatch[1];
        }

        if (trimmed.length < 20) return null;
        if (/^data:image\/[a-zA-Z]+;base64,/.test(trimmed)) {
            return trimmed;
        }
        if (/^https?:\/\//.test(trimmed)) return trimmed;
        return `data:image/jpeg;base64,${trimmed}`;
    };

    const fetchAndCacheUser = async (userId: string) => {
        if (!userId) return;
        if (userCache[userId]) return;

        try {
            const uDoc = await getDoc(doc(db, "users", userId));
            if (uDoc.exists()) {
                const d = uDoc.data();
                const name = d?.name || d?.email || "Parent";
                const picture = typeof d?.picture === "string" ? d.picture : undefined;
                setUserCache((prev) => ({ ...prev, [userId]: { name, picture } }));
                setBookings((prev) =>
                    prev.map((b) => (b.userId === userId ? { ...b, parentName: name } : b))
                );
            } else {
                setUserCache((prev) => ({ ...prev, [userId]: { name: undefined, picture: undefined } }));
            }
        } catch (err) {
            console.error("fetchAndCacheUser error:", err);
        }
    };

    useEffect(() => {
        if (!user) {
            setProviderName(null);
            setProviderData(null);
            setProviderPictureUri(null);
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
                // Load provider document
                const providerRef = doc(db, "providers", user.uid);
                const providerSnap = await getDoc(providerRef);

                let name = "there";
                let avgRating = "N/A";

                if (providerSnap.exists()) {
                    const data = providerSnap.data();
                    if (data?.name) name = data.name;
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

                    setProviderData(data);
                    const pUri = getSanitizedPictureUri(data?.picture);
                    setProviderPictureUri(pUri);
                } else {
                    avgRating = "—";
                    setProviderData(null);
                    setProviderPictureUri(null);
                }

                setProviderName(name);

                // Listen to appointments
                const appointmentsCol = collection(db, "appointments");
                const q = query(appointmentsCol, where("providerId", "==", user.uid));
                unsubAppointments = onSnapshot(
                    q,
                    (querySnap) => {
                        if (cancelled) return;
                        const docs: Booking[] = [];
                        const missingUserIds = new Set<string>();

                        querySnap.forEach((docSnap) => {
                            const data = docSnap.data();
                            const statusLower = typeof data?.status === "string" ? data.status.toLowerCase() : "";
                            if (statusLower === "completed" || statusLower === "cancelled") {
                                return;
                            }

                            const rawUserId = data?.userId || null;
                            const fallbackParentName = data?.userEmail || rawUserId || "Parent";

                            let dateLabel = data?.schedule?.name || data?.date || "";
                            let timeLabel = data?.time || "";
                            if (!dateLabel) {
                                if (data?.hour12 !== undefined && data?.minute !== undefined && data?.ampm) {
                                    dateLabel = `${data.hour12}:${String(data.minute).padStart(2, "0")} ${data.ampm}`;
                                }
                            }

                            if (data?.appointmentType === "one_time") {
                                const startHour = data?.startTime?.hour12;
                                const startMinute = data?.startTime?.minute;
                                const startAmPm = data?.startTime?.ampm;

                                const endHour = data?.endTime?.hour12;
                                const endMinute = data?.endTime?.minute;
                                const endAmPm = data?.endTime?.ampm;

                                if (
                                    startHour !== undefined &&
                                    startMinute !== undefined &&
                                    startAmPm &&
                                    endHour !== undefined &&
                                    endMinute !== undefined &&
                                    endAmPm
                                ) {
                                    timeLabel = `${startHour}:${String(startMinute).padStart(2, "0")} ${startAmPm} - ${endHour}:${String(endMinute).padStart(2, "0")} ${endAmPm}`;
                                }
                            }
                            const location = data?.location || data?.address || data?.place || "";

                            const booking: Booking = {
                                id: docSnap.id,
                                parentName: fallbackParentName,
                                dateLabel,
                                timeLabel,
                                location,
                                status: data?.status || "pending",
                                type: data?.appointmentType || data?.role || "service",
                                raw: data,
                                userId: rawUserId || undefined,
                            };

                            if (rawUserId && !userCache[rawUserId]) missingUserIds.add(rawUserId);

                            docs.push(booking);
                        });

                        docs.sort((a, b) => {
                            const aT = a.raw?.createdAt?.toMillis ? a.raw.createdAt.toMillis() : 0;
                            const bT = b.raw?.createdAt?.toMillis ? b.raw.createdAt.toMillis() : 0;
                            return bT - aT;
                        });

                        setBookings(docs);
                        missingUserIds.forEach((uid) => fetchAndCacheUser(uid));

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
    }, [user, userCache]);

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
        const statusLower = item.status?.toLowerCase() || "";
        if (statusLower === "pending") statusColor = "#f39c12";
        if (statusLower === "completed") statusColor = "#27ae60";

        const cached = item.userId ? userCache[item.userId] : undefined;
        const displayName = cached?.name || item.parentName || "Parent";
        const pictureUri = getSanitizedPictureUri(cached?.picture);

        // FIXED: Properly pass parameters to chat screen
        const handleMessagePress = () => {
            if (!item.userId) {
                console.log("No userId available for this booking");
                return;
            }

            router.push({
                pathname: "/user/chat",
                params: {
                    otherUserId: item.userId,
                    otherUserName: displayName,
                    userType: "user" // Since provider is messaging a user
                }
            });
        };

        return (
            <TouchableOpacity
                style={styles.bookingCard}
                onPress={() => router.push(`/service/service_booking_details?bookingId=${item.id}`)}
            >
                <View style={styles.bookingHeader}>
                    {pictureUri ? (
                        <Image
                            source={{ uri: pictureUri }}
                            style={styles.avatarImage}
                            onError={(e) => console.error("Avatar image error:", e.nativeEvent)}
                            resizeMode="cover"
                        />
                    ) : (
                        <Ionicons name="person-circle-outline" size={40} color="#b58dde" />
                    )}

                    <View style={styles.bookingInfo}>
                        <Text style={styles.parentName}>{displayName}</Text>
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
                    {/* FIXED: Use the corrected handleMessagePress */}
                    <TouchableOpacity style={styles.actionButton} onPress={handleMessagePress}>
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

                <TouchableOpacity onPress={() => router.push("/service/service_account")} style={styles.profileIcon}>
                    {providerPictureUri ? (
                        <Image
                            source={{ uri: providerPictureUri }}
                            style={styles.headerProfileImage}
                            resizeMode="cover"
                            onError={(e) => {
                                console.error("Provider header image error:", e.nativeEvent);
                            }}
                        />
                    ) : (
                        <Ionicons name="person-circle-outline" size={40} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>

            {/* Location Card */}
            <TouchableOpacity style={styles.locationCard}>
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
    headerProfileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#eee",
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
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#eee",
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