// app/details.tsx
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db } from "../firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

interface ReviewRaw {
    comment?: string;
    date?: any;
    rating?: number;
    reviewer?: string; // reviewer uid
}

interface ReviewEnriched extends ReviewRaw {
    reviewerName?: string;
    formattedDate?: string;
    reviewerPhoto?: string | null; // Allow null
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
    phone?: string;
    latitude?: number;
    longitude?: number;
    role?: string;
    type?: string;
    photoURL?: string;
    profilePicture?: string;
    image?: string;
    avatar?: string;
}

export default function Details() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { id, distance: distanceParam } = params;
    const tutorId = Array.isArray(id) ? id[0] : id;

    const [tutor, setTutor] = useState<Tutor | null>(null);
    const [enrichedReviews, setEnrichedReviews] = useState<ReviewEnriched[]>([]);
    const [computedDistance, setComputedDistance] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

    const auth = getAuth();

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
                    ...(data as Omit<Tutor, "id">)
                };
                setTutor(t);

                // Get profile photo from tutor data - check multiple possible field names
                const photoUrl = data.photoURL || data.profilePicture || data.image || data.avatar || data.profileImage;
                console.log("Profile photo URL:", photoUrl); // Debug log
                if (photoUrl) {
                    setProfilePhoto(photoUrl);
                } else {
                    console.log("No profile photo found for tutor:", tutorId);
                    setProfilePhoto(null);
                }

                // 1) Enrich reviews: fetch reviewer name and photo for each review
                if (Array.isArray(data.reviews) && data.reviews.length > 0) {
                    const reviewsRaw: ReviewRaw[] = data.reviews;
                    const enriched: ReviewEnriched[] = await Promise.all(
                        reviewsRaw.map(async (r) => {
                            const out: ReviewEnriched = { ...r };

                            // get reviewer name and photo from users collection
                            try {
                                if (r.reviewer) {
                                    const userSnap = await getDoc(doc(db, "users", r.reviewer));
                                    if (userSnap.exists()) {
                                        const u = userSnap.data() as any;
                                        out.reviewerName = u.name || "User";
                                        // Check multiple possible photo field names
                                        out.reviewerPhoto = u.photoURL || u.profilePicture || u.image || u.avatar || null;
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
                        const aTime = a.date && typeof (a.date as any).toDate === "function" ? (a.date as any).toDate().getTime() : a.date ? new Date(a.date).getTime() : 0;
                        const bTime = b.date && typeof (b.date as any).toDate === "function" ? (b.date as any).toDate().getTime() : b.date ? new Date(b.date).getTime() : 0;
                        return bTime - aTime;
                    });

                    setEnrichedReviews(enriched);
                } else {
                    setEnrichedReviews([]);
                }

                // 2) Compute distance
                if (distanceParam) {
                    const dist = Array.isArray(distanceParam) ? distanceParam[0] : distanceParam;
                    setComputedDistance(dist as string);
                } else {
                    try {
                        const user = auth.currentUser;
                        if (user) {
                            const userSnap = await getDoc(doc(db, "users", user.uid));
                            if (userSnap.exists()) {
                                const u = userSnap.data() as any;
                                if (typeof u.latitude === "number" && typeof u.longitude === "number" && typeof data.latitude === "number" && typeof data.longitude === "number") {
                                    const km = getDistanceFromLatLonInKm(u.latitude, u.longitude, data.latitude, data.longitude);
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
                if (conversation.participants.includes(tutor.id)) {
                    existingConversation = { id: doc.id, ...conversation };
                }
            });

            if (existingConversation) {
                router.push(`/chat?conversationId=${existingConversation.id}&providerName=${encodeURIComponent(tutor.name)}&providerId=${tutor.id}`);
            } else {
                const newConversation = {
                    participants: [currentUser.uid, tutor.id],
                    participantNames: [currentUser.displayName || "User", tutor.name],
                    lastMessage: "Conversation started",
                    lastMessageTime: new Date(),
                    unread: false,
                    lastMessageSender: currentUser.uid
                };

                const docRef = await addDoc(collection(db, "conversations"), newConversation);
                router.push(`/chat?conversationId=${docRef.id}&providerName=${encodeURIComponent(tutor.name)}&providerId=${tutor.id}`);
            }
        } catch (error) {
            console.error("Error starting conversation:", error);
        }
    };

    // Function to get initials for avatar
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    if (loading) return <Text style={styles.loading}>Loading tutor details...</Text>;
    if (!tutor) return <Text style={styles.loading}>Provider not found.</Text>;

    // Calculate review count & average rating
    const reviewCount = enrichedReviews.length > 0 ? enrichedReviews.length : (typeof tutor.reviews === "number" ? tutor.reviews : 0);

    const avgRating =
        enrichedReviews.length > 0
            ? +(
                enrichedReviews
                    .map((r) => r.rating ?? 0)
                    .reduce((a, b) => a + b, 0) / enrichedReviews.length
            ).toFixed(1)
            : tutor.rating ?? 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/search")}>
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
                                    <Text style={styles.avatarText}>
                                        {getInitials(tutor.name)}
                                    </Text>
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

                        <TouchableOpacity
                            style={styles.messageButton}
                            onPress={startConversation}
                        >
                            <Text style={styles.messageButtonText}>Message now</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* About Section */}
                {tutor.bio && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <Text style={styles.paragraph}>{tutor.bio}</Text>
                    </View>
                )}

                {/* Skills */}
                {tutor.skills && tutor.skills.length > 0 && (
                    <View style={styles.section}>
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

                {/* Reviews */}
                <View style={styles.section}>
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
                                                onError={() => {/* Handle error silently */}}
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
                                            {r.formattedDate && (
                                                <Text style={styles.reviewDate}>{r.formattedDate}</Text>
                                            )}
                                        </View>
                                    </View>
                                    <View style={styles.reviewMeta}>
                                        <Ionicons name="star" size={12} color="#FFD700" />
                                        <Text style={styles.reviewRatingText}>{r.rating ?? "-"}</Text>
                                    </View>
                                </View>

                                {r.comment && (
                                    <Text style={styles.reviewComment}>{r.comment}</Text>
                                )}
                            </View>
                        ))
                    )}
                </View>

                {/* Appointment Button */}
                <TouchableOpacity
                    style={styles.appointmentButton}
                    onPress={() =>
                        router.push({
                            pathname: "/appointment",
                            params: { id: tutor?.id }
                        })
                    }
                >
                    <Text style={styles.appointmentText}>Set Appointment</Text>
                </TouchableOpacity>
            </ScrollView>

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

/* ---------- Helpers & Styles ---------- */

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5F5F5" },
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
    loading: { marginTop: 150, textAlign: "center", fontSize: 16, color: "#555" },
    scrollContent: { padding: 16, paddingBottom: 120 },

    // Card styles with profile picture
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    profileHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    avatarContainer: {
        marginRight: 16,
    },
    profileImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#f0f0f0',
    },
    avatarPlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 35,
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
        marginBottom: 6
    },
    distanceContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4
    },
    distanceText: {
        fontSize: 14,
        color: "#777",
        marginLeft: 6
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6
    },
    ratingStars: {
        flexDirection: "row",
        alignItems: "center"
    },
    ratingText: {
        fontSize: 14,
        color: "#333",
        marginLeft: 6,
        fontWeight: "600"
    },
    reviewCount: {
        fontSize: 14,
        color: "#777",
        marginLeft: 8
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

    section: {
        marginBottom: 20
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
        marginBottom: 12
    },
    paragraph: {
        fontSize: 14,
        color: "#555",
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 10,
        lineHeight: 20,
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    noReviews: {
        color: "#666",
        fontStyle: "italic",
        textAlign: "center",
        padding: 20,
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
        fontWeight: "700"
    },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 14,
        borderTopWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },

    /* Skills */
    skillsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8
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
        fontWeight: "500"
    },

    /* Reviews */
    reviewCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
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
        backgroundColor: '#f0f0f0',
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
        alignItems: "center"
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
});