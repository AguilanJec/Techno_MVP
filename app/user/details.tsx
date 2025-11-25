// app/details.tsx
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db } from "../../firebaseConfig";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

type AvailabilityDay = {
    enabled?: boolean;
    from?: string;
    to?: string;
};

type AvailabilityMap = {
    Monday?: AvailabilityDay;
    Tuesday?: AvailabilityDay;
    Wednesday?: AvailabilityDay;
    Thursday?: AvailabilityDay;
    Friday?: AvailabilityDay;
    Saturday?: AvailabilityDay;
    Sunday?: AvailabilityDay;
    [key: string]: AvailabilityDay | undefined;
};

interface ReviewRaw {
    comment?: string;
    date?: any;
    rating?: number;
    reviewer?: string; // reviewer uid
}

interface ReviewEnriched extends ReviewRaw {
    reviewerName?: string;
    formattedDate?: string;
    reviewerPhoto?: string | null;
}

interface Tutor {
    id: string;
    name: string;
    distance?: string;
    rate?: string;
    rating?: number;
    reviews?: ReviewRaw[] | number;
    bio?: string;
    skills?: string[];
    address?: string;
    addressDetails?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    role?: string;
    type?: string;
    picture?: string;
    availability?: AvailabilityMap;
}

export default function Details() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { id, distance: distanceParam } = params;
    const tutorId = Array.isArray(id) ? id[0] : id;

    const [tutor, setTutor] = useState<Tutor | null>(null);
    const [enrichedReviews, setEnrichedReviews] = useState<ReviewEnriched[]>(
        []
    );
    const [computedDistance, setComputedDistance] = useState<string | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

    const auth = getAuth();

    // Helpers
    function cleanBase64(url?: any): string | null {
        if (!url || typeof url !== "string") return null;
        let s = url.trim();
        // Remove url(...) wrapper
        if (s.startsWith("url(") && s.endsWith(")")) {
            s = s.replace(/^url\(/, "").replace(/\)$/, "");
        }
        return s || null;
    }

    function formatTime24To12(time?: string) {
        // expects "HH:mm"
        if (!time || typeof time !== "string") return "";
        const [hhStr, mmStr] = time.split(":");
        const hh = parseInt(hhStr, 10);
        if (Number.isNaN(hh)) return time;
        const mm = mmStr ?? "00";
        const suffix = hh >= 12 ? "PM" : "AM";
        const hour12 = ((hh + 11) % 12) + 1;
        return `${hour12}:${mm} ${suffix}`;
    }

    // ordered days for display
    const DAYS = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ];

    useEffect(() => {
        if (!tutorId) return;

        const fetchTutor = async () => {
            try {
                setLoading(true);
                const ref = doc(db, "providers", tutorId);
                const snap = await getDoc(ref);
                if (!snap.exists()) {
                    console.warn("Provider not found:", tutorId);
                    setTutor(null);
                    setLoading(false);
                    return;
                }
                const data = snap.data() as any;

                const t: Tutor = {
                    id: snap.id,
                    name: data.name || "",
                    distance: data.distance || undefined,
                    rate: data.rate ? String(data.rate) : undefined,
                    rating: typeof data.rating === "number" ? data.rating : undefined,
                    reviews: data.reviews ?? undefined,
                    bio: data.bio ?? undefined,
                    skills: Array.isArray(data.skills) ? data.skills : undefined,
                    address: data.address ?? undefined,
                    addressDetails: data.addressDetails ?? undefined,
                    phone: data.phone ?? undefined,
                    latitude:
                        typeof data.latitude === "number" ? data.latitude : undefined,
                    longitude:
                        typeof data.longitude === "number" ? data.longitude : undefined,
                    role: data.role ?? data.type ?? undefined,
                    picture: data.picture ?? undefined,
                    availability: data.availability ?? undefined,
                };
                setTutor(t);

                // Profile photo
                const photoUrl = data.picture ?? data.photoURL ?? data.profilePicture;
                const cleaned = cleanBase64(photoUrl);
                setProfilePhoto(cleaned);

                // Enrich reviews: fetch reviewer name and photo for each review
                if (Array.isArray(data.reviews) && data.reviews.length > 0) {
                    const reviewsRaw: ReviewRaw[] = data.reviews;
                    const enriched: ReviewEnriched[] = await Promise.all(
                        reviewsRaw.map(async (r) => {
                            const out: ReviewEnriched = { ...r };
                            try {
                                if (r.reviewer) {
                                    const userSnap = await getDoc(doc(db, "users", r.reviewer));
                                    if (userSnap.exists()) {
                                        const u = userSnap.data() as any;
                                        out.reviewerName = u.name || "User";
                                        // prefer `picture` field (clean base64 if present)
                                        const rawPhoto =
                                            u.picture ||
                                            u.photoURL ||
                                            u.profilePicture ||
                                            u.image ||
                                            u.avatar ||
                                            null;
                                        out.reviewerPhoto = cleanBase64(rawPhoto) ?? null;
                                    } else {
                                        out.reviewerName = "User";
                                        out.reviewerPhoto = null;
                                    }
                                } else {
                                    out.reviewerName = "User";
                                    out.reviewerPhoto = null;
                                }
                            } catch (err) {
                                console.warn("Failed to fetch reviewer:", err);
                                out.reviewerName = "User";
                                out.reviewerPhoto = null;
                            }

                            // format date
                            if (r.date) {
                                try {
                                    let d: Date;
                                    if (typeof (r.date as any).toDate === "function") {
                                        d = (r.date as any).toDate();
                                    } else {
                                        d = new Date(r.date);
                                    }
                                    out.formattedDate = d.toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    });
                                } catch {
                                    out.formattedDate = "";
                                }
                            } else {
                                out.formattedDate = "";
                            }
                            return out;
                        })
                    );

                    // sort newest first
                    enriched.sort((a, b) => {
                        const aTime =
                            a.date && typeof (a.date as any).toDate === "function"
                                ? (a.date as any).toDate().getTime()
                                : a.date
                                    ? new Date(a.date).getTime()
                                    : 0;
                        const bTime =
                            b.date && typeof (b.date as any).toDate === "function"
                                ? (b.date as any).toDate().getTime()
                                : b.date
                                    ? new Date(b.date).getTime()
                                    : 0;
                        return bTime - aTime;
                    });

                    setEnrichedReviews(enriched);
                } else {
                    setEnrichedReviews([]);
                }

                // Compute distance
                if (distanceParam) {
                    const dist = Array.isArray(distanceParam)
                        ? distanceParam[0]
                        : distanceParam;
                    setComputedDistance(dist as string);
                } else {
                    try {
                        const user = auth.currentUser;
                        if (user) {
                            const userSnap = await getDoc(doc(db, "users", user.uid));
                            if (userSnap.exists()) {
                                const u = userSnap.data() as any;
                                if (
                                    typeof u.latitude === "number" &&
                                    typeof u.longitude === "number" &&
                                    typeof data.latitude === "number" &&
                                    typeof data.longitude === "number"
                                ) {
                                    const km = getDistanceFromLatLonInKm(
                                        u.latitude,
                                        u.longitude,
                                        data.latitude,
                                        data.longitude
                                    );
                                    setComputedDistance(`${km.toFixed(1)} km away`);
                                } else {
                                    setComputedDistance("Distance unavailable");
                                }
                            }
                        }
                    } catch (err) {
                        console.warn("Failed to compute distance:", err);
                        setComputedDistance("Distance unavailable");
                    }
                }
            } catch (error) {
                console.error("Error fetching tutor:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTutor();
    }, [tutorId, distanceParam]);

    const startConversation = async () => {
        if (!tutor || !auth.currentUser) return;

        try {
            const currentUser = auth.currentUser;

            // Check if conversation already exists
            const existingConvQuery = query(
                collection(db, "conversations"),
                where("participants", "array-contains", currentUser.uid)
            );

            const querySnapshot = await getDocs(existingConvQuery);
            let existingConversation: any = null;

            querySnapshot.forEach((doc) => {
                const conversation = doc.data();
                if (Array.isArray(conversation.participants) && conversation.participants.includes(tutor.id)) {
                    existingConversation = { id: doc.id, ...conversation };
                }
            });

            // param names expected by ChatScreen: conversationId, otherUserName, otherUserId, userType
            if (existingConversation) {
                router.push(
                    `/chat?conversationId=${encodeURIComponent(existingConversation.id)}&otherUserName=${encodeURIComponent(
                        tutor.name
                    )}&otherUserId=${encodeURIComponent(tutor.id)}&userType=provider`
                );
            } else {
                const newConversation = {
                    participants: [currentUser.uid, tutor.id],
                    participantNames: [currentUser.displayName || "User", tutor.name],
                    lastMessage: "Conversation started",
                    lastMessageTime: new Date(),
                    unread: false,
                    lastMessageSender: currentUser.uid,
                };

                const docRef = await addDoc(collection(db, "conversations"), newConversation);

                router.push(
                    `/chat?conversationId=${encodeURIComponent(docRef.id)}&otherUserName=${encodeURIComponent(
                        tutor.name
                    )}&otherUserId=${encodeURIComponent(tutor.id)}&userType=provider`
                );
            }
        } catch (error) {
            console.error("Error starting conversation:", error);
        }
    };


    // Function to get initials for avatar
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();
    };

    if (loading)
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#b58dde" />
                <Text style={styles.loading}>Loading tutor details...</Text>
            </View>
        );
    if (!tutor)
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.loading}>Provider not found.</Text>
            </View>
        );

    // Calculate review count & average rating
    const reviewCount =
        enrichedReviews.length > 0
            ? enrichedReviews.length
            : typeof tutor.reviews === "number"
                ? tutor.reviews
                : 0;

    const avgRating =
        enrichedReviews.length > 0
            ? +(
                enrichedReviews.map((r) => r.rating ?? 0).reduce((a, b) => a + b, 0) /
                enrichedReviews.length
            ).toFixed(1)
            : tutor.rating ?? 0;

    // Render Preferred Schedule section
    const renderSchedule = (availability?: AvailabilityMap) => {
        if (!availability) {
            return (
                <View style={[styles.sectionCard]}>
                    <Text style={styles.sectionTitle}>Preferred Schedule</Text>
                    <Text style={styles.noSchedule}>No schedule set.</Text>
                </View>
            );
        }

        return (
            <View style={styles.sectionCard}>
                <View style={styles.scheduleHeaderRow}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="calendar" size={20} color="#7B52AB" />
                        <Text style={styles.sectionTitle}> Preferred Schedule</Text>
                    </View>
                    <Text style={styles.smallHint}>Local timezone</Text>
                </View>

                <View style={styles.scheduleGrid}>
                    {DAYS.map((day) => {
                        const d = availability[day] ?? {};
                        const enabled = !!d.enabled;
                        const from = d.from ?? "--:--";
                        const to = d.to ?? "--:--";
                        return (
                            <View key={day} style={styles.dayRow}>
                                <View style={styles.dayLeft}>
                                    <Text style={styles.dayName}>{day.slice(0, 3)}</Text>
                                    <Text style={styles.dayFullName}>{day}</Text>
                                </View>

                                <View style={styles.dayRight}>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            enabled ? styles.statusOn : styles.statusOff,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusText,
                                                enabled ? styles.statusTextOn : styles.statusTextOff,
                                            ]}
                                        >
                                            {enabled ? "Available" : "Off"}
                                        </Text>
                                    </View>

                                    <View style={styles.timeContainer}>
                                        <Text style={styles.timeText}>
                                            {enabled
                                                ? `${formatTime24To12(from)} - ${formatTime24To12(to)}`
                                                : `${formatTime24To12(from)} - ${formatTime24To12(to)}`}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/user/search")}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Service Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Tutor Card - With Profile Picture */}
                <View style={styles.card}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            {profilePhoto ? (
                                <Image
                                    source={{ uri: profilePhoto }}
                                    style={styles.profileImage}
                                    onError={(e) => {
                                        console.log("Error loading profile image:", e.nativeEvent.error);
                                        setProfilePhoto(null);
                                    }}
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{getInitials(tutor.name)}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.name}>{tutor.name}</Text>

                            <View style={styles.distanceContainer}>
                                <Ionicons name="location-outline" size={14} color="#777" />
                                <Text style={styles.distanceText}>
                                    {computedDistance || tutor.distance || "Distance unavailable"}
                                </Text>
                            </View>

                            <View style={styles.ratingContainer}>
                                <View style={styles.ratingStars}>
                                    <Ionicons name="star" size={14} color="#FFD700" />
                                    <Text style={styles.ratingText}>{avgRating}</Text>
                                </View>
                                <Text style={styles.reviewCount}>| {reviewCount} reviews</Text>
                            </View>

                            {tutor.rate && (
                                <Text style={styles.rate}>
                                    {tutor.rate ? `₱${tutor.rate}/hour` : "—/hour"}
                                </Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.badgeAndMessageContainer}>
                        <View style={styles.fullTimeBadge}>
                            <Text style={styles.fullTimeText}>Full-time</Text>
                        </View>

                        <TouchableOpacity style={styles.messageButton} onPress={startConversation}>
                            <Text style={styles.messageButtonText}>Message now</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Address */}
                {(tutor.address || tutor.addressDetails) && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Location</Text>
                        {tutor.address ? (
                            <Text style={styles.paragraphSmall}>{tutor.address}</Text>
                        ) : null}
                        {tutor.addressDetails ? (
                            <Text style={styles.paragraphSmallMuted}>{tutor.addressDetails}</Text>
                        ) : null}
                    </View>
                )}



                {/* About Section */}
                {tutor.bio && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <Text style={styles.paragraph}>{tutor.bio}</Text>
                    </View>
                )}

                {/* Skills */}
                {tutor.skills && tutor.skills.length > 0 && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Skills</Text>
                        <View style={styles.skillsContainer}>
                            {tutor.skills.map((skill, index) => (
                                <View key={index} style={styles.skillPill}>
                                    <Text style={styles.skillText}>{skill}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Preferred Schedule */}
                {renderSchedule(tutor.availability)}

                {/* Reviews */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Reviews</Text>

                    {enrichedReviews.length === 0 ? (
                        <Text style={styles.noReviews}>No reviews yet.</Text>
                    ) : (
                        enrichedReviews.map((r, i) => (
                            <View key={i} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.reviewerInfo}>
                                        {r.reviewerPhoto ? (
                                            <Image
                                                source={{ uri: r.reviewerPhoto }}
                                                style={styles.reviewerAvatar}
                                                onError={() => {
                                                    /* ignore */
                                                }}
                                            />
                                        ) : (
                                            <View style={styles.reviewerAvatarPlaceholder}>
                                                <Text style={styles.reviewerAvatarText}>
                                                    {getInitials(r.reviewerName || "User")}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.reviewerTextInfo}>
                                            <Text style={styles.reviewerName}>{r.reviewerName ?? "User"}</Text>
                                            {r.formattedDate && <Text style={styles.reviewDate}>{r.formattedDate}</Text>}
                                        </View>
                                    </View>
                                    <View style={styles.reviewMeta}>
                                        <Ionicons name="star" size={12} color="#FFD700" />
                                        <Text style={styles.reviewRatingText}>{r.rating ?? "-"}</Text>
                                    </View>
                                </View>

                                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                            </View>
                        ))
                    )}
                </View>

                {/* Appointment Button */}
                <TouchableOpacity
                    style={styles.appointmentButton}
                    onPress={() =>
                        router.push({
                            pathname: "/user/appointment",
                            params: { id: tutor?.id },
                        })
                    }
                >
                    <Text style={styles.appointmentText}>Set Appointment</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/user/home")}>
                    <Ionicons name="home-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/bookinglists")}>
                    <Ionicons name="calendar-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/search")}>
                    <Ionicons name="search-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/message")}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/account")}>
                    <Ionicons name="person-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

/* ---------- Helpers & Styles ---------- */

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
) {
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
    return R * c;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5F5F5" },
    centered: { justifyContent: "center", alignItems: "center" },
    header: {
        backgroundColor: "#b58dde",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 45,
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
    loading: { marginTop: 12, textAlign: "center", fontSize: 14, color: "#fff" },
    scrollContent: { padding: 16, paddingBottom: 140 },

    // Card styles with profile picture
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 18,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    profileHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    avatarContainer: {
        marginRight: 14,
    },
    profileImage: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#f0f0f0",
    },
    avatarPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#b58dde",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
    },
    profileInfo: {
        flex: 1,
    },
    name: {
        fontSize: 20,
        fontWeight: "700",
        color: "#333",
        marginBottom: 6,
    },
    distanceContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    distanceText: {
        fontSize: 14,
        color: "#777",
        marginLeft: 6,
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    ratingStars: {
        flexDirection: "row",
        alignItems: "center",
    },
    ratingText: {
        fontSize: 14,
        color: "#333",
        marginLeft: 6,
        fontWeight: "600",
    },
    reviewCount: {
        fontSize: 14,
        color: "#777",
        marginLeft: 8,
    },
    rate: {
        fontSize: 16,
        fontWeight: "600",
        color: "#b58dde",
    },
    badgeAndMessageContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },
    fullTimeBadge: {
        backgroundColor: "#EDE4F7",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    fullTimeText: {
        fontSize: 12,
        color: "#7B52AB",
        fontWeight: "600",
    },
    messageButton: {
        backgroundColor: "#b58dde",
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    messageButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },

    /* Section card (used for schedule, about, reviews etc) */
    sectionCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#F0E7FB",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333",
    },
    smallHint: {
        fontSize: 12,
        color: "#888",
    },
    paragraph: {
        fontSize: 14,
        color: "#555",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 8,
        lineHeight: 20,
        marginTop: 10,
    },
    paragraphSmall: {
        fontSize: 14,
        color: "#444",
        marginTop: 8,
    },
    paragraphSmallMuted: {
        fontSize: 13,
        color: "#777",
        marginTop: 6,
    },

    /* Schedule */
    scheduleHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    scheduleGrid: {
        borderTopWidth: 1,
        borderTopColor: "#F3EBFB",
        marginTop: 8,
    },
    dayRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F3EBFB",
    },
    dayLeft: {
        flexDirection: "column",
    },
    dayName: {
        fontSize: 14,
        fontWeight: "700",
        color: "#333",
    },
    dayFullName: {
        fontSize: 12,
        color: "#888",
        marginTop: 2,
    },
    dayRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        marginRight: 12,
        borderWidth: 1,
    },
    statusOn: {
        backgroundColor: "#EAF7EE",
        borderColor: "#C7EFC8",
    },
    statusOff: {
        backgroundColor: "#FFF5F7",
        borderColor: "#F6D0DA",
    },
    statusText: {
        fontSize: 12,
        fontWeight: "700",
    },
    statusTextOn: { color: "#2F8F47" },
    statusTextOff: { color: "#E34B69" },
    timeContainer: {
        minWidth: 160,
        alignItems: "flex-end",
    },
    timeText: {
        fontSize: 13,
        color: "#555",
        fontWeight: "600",
    },
    noSchedule: {
        fontStyle: "italic",
        color: "#666",
        marginTop: 8,
    },

    /* Skills */
    skillsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    skillPill: {
        backgroundColor: "#EDE4F7",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 6,
        marginBottom: 6,
    },
    skillText: {
        fontSize: 13,
        color: "#7B52AB",
        fontWeight: "500",
    },

    /* Reviews */
    reviewCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#F0E7FB",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    reviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    reviewerInfo: {
        flexDirection: "row",
        alignItems: "flex-start",
        flex: 1,
    },
    reviewerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: "#f0f0f0",
    },
    reviewerAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#b58dde",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    reviewerAvatarText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },
    reviewerTextInfo: {
        flex: 1,
    },
    reviewerName: {
        fontWeight: "700",
        color: "#333",
        fontSize: 14,
        marginBottom: 2,
    },
    reviewMeta: {
        flexDirection: "row",
        alignItems: "center",
    },
    reviewRatingText: {
        marginLeft: 6,
        color: "#333",
        fontWeight: "700",
        fontSize: 12,
    },
    reviewDate: {
        color: "#888",
        fontSize: 12,
    },
    reviewComment: {
        color: "#444",
        fontSize: 14,
        lineHeight: 20,
        marginTop: 8,
    },

    noReviews: {
        color: "#666",
        fontStyle: "italic",
        textAlign: "center",
        padding: 12,
    },

    appointmentButton: {
        backgroundColor: "#b58dde",
        borderRadius: 30,
        paddingVertical: 16,
        alignItems: "center",
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    appointmentText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },

    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 14,
        borderTopWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
    },
});
