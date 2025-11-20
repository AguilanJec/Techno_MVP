// app/details.tsx
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
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
}

interface Tutor {
    id: string;
    name: string;
    distance?: string; // optional route param or computed
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
}

export default function Details() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { id, distance: distanceParam } = params; // distance can be passed from search
    const tutorId = Array.isArray(id) ? id[0] : id;

    const [tutor, setTutor] = useState<Tutor | null>(null);
    const [enrichedReviews, setEnrichedReviews] = useState<ReviewEnriched[]>([]);
    const [computedDistance, setComputedDistance] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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
                const t: Tutor = { id: snap.id, ...(data as Omit<Tutor, "id">) };
                setTutor(t);

                // 1) Enrich reviews: fetch reviewer name for each review (if review array)
                if (Array.isArray(data.reviews) && data.reviews.length > 0) {
                    const reviewsRaw: ReviewRaw[] = data.reviews;
                    const enriched: ReviewEnriched[] = await Promise.all(
                        reviewsRaw.map(async (r) => {
                            const out: ReviewEnriched = { ...r };
                            // get reviewer name from users collection (reviewer is uid)
                            try {
                                if (r.reviewer) {
                                    const userSnap = await getDoc(doc(db, "users", r.reviewer));
                                    if (userSnap.exists()) {
                                        const u = userSnap.data() as any;
                                        out.reviewerName = u.name || "User";
                                    } else {
                                        out.reviewerName = "User";
                                    }
                                }
                            } catch (err) {
                                console.warn("Failed to fetch reviewer:", err);
                                out.reviewerName = "User";
                            }

                            // format date if Firestore Timestamp or ISO string
                            if (r.date) {
                                try {
                                    // Firestore Timestamp has toDate()
                                    // otherwise try to construct Date
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

                    // sort newest first (by date if available)
                    enriched.sort((a, b) => {
                        const aTime = a.date && typeof (a.date as any).toDate === "function" ? (a.date as any).toDate().getTime() : a.date ? new Date(a.date).getTime() : 0;
                        const bTime = b.date && typeof (b.date as any).toDate === "function" ? (b.date as any).toDate().getTime() : b.date ? new Date(b.date).getTime() : 0;
                        return bTime - aTime;
                    });

                    setEnrichedReviews(enriched);
                } else {
                    setEnrichedReviews([]);
                }

                // 2) Compute distance if route passed distance param, otherwise attempt to compute using logged-in user's coords
                if (distanceParam) {
                    const dist = Array.isArray(distanceParam) ? distanceParam[0] : distanceParam;
                    setComputedDistance(dist as string);
                } else {
                    // try compute using logged-in user's coordinates from users doc
                    try {
                        const user = auth.currentUser;
                        if (user) {
                            const userSnap = await getDoc(doc(db, "users", user.uid));
                            if (userSnap.exists()) {
                                const u = userSnap.data() as any;
                                if (typeof u.latitude === "number" && typeof u.longitude === "number" && typeof data.latitude === "number" && typeof data.longitude === "number") {
                                    const km = getDistanceFromLatLonInKm(u.latitude, u.longitude, data.latitude, data.longitude);
                                    setComputedDistance(`${km.toFixed(2)} km`);
                                } else {
                                    setComputedDistance(undefined as any);
                                }
                            }
                        }
                    } catch (err) {
                        console.warn("Failed to compute distance:", err);
                        setComputedDistance(undefined as any);
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

    if (loading) return <Text style={styles.loading}>Loading tutor details...</Text>;
    if (!tutor) return <Text style={styles.loading}>Provider not found.</Text>;

    // calculate review count & average rating
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
                {/* Tutor Card */}
                <View style={styles.card}>
                    <Text style={styles.name}>{tutor.name}</Text>

                    <View style={{ flexDirection: "row", marginTop: 6, alignItems: "center" }}>
                        <Ionicons name="location-outline" size={14} color="#777" />
                        <Text style={styles.details}> {computedDistance ?? tutor.distance ?? "—"}</Text>
                    </View>

                    <View style={{ flexDirection: "row", marginTop: 6, alignItems: "center" }}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.details}> {avgRating} </Text>
                        <Text style={[styles.details, { marginLeft: 8 }]}>({reviewCount} reviews)</Text>
                    </View>

                    {tutor.rate && (
                        <Text style={styles.rate}>
                            {tutor.rate ? `₱${tutor.rate}/hour` : "—/hour"}
                        </Text>
                    )}
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
                            {tutor.skills.map((skill) => (
                                <View key={skill} style={styles.skillPill}>
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
                        <Text style={{ color: "#666" }}>No reviews yet.</Text>
                    ) : (
                        enrichedReviews.map((r, i) => (
                            <View key={i} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <Text style={styles.reviewerName}>{r.reviewerName ?? "User"}</Text>
                                    <View style={styles.reviewMeta}>
                                        <Ionicons name="star" size={12} color="#FFD700" />
                                        <Text style={styles.reviewRatingText}>{r.rating ?? "-"}</Text>
                                    </View>
                                </View>

                                {r.formattedDate ? <Text style={styles.reviewDate}>{r.formattedDate}</Text> : null}

                                {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
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
                            params: {id: tutor?.id }   // pass clicked provider ID
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
    scrollContent: { padding: 20, paddingBottom: 120 },
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
    name: { fontSize: 22, fontWeight: "700", color: "#333", marginBottom: 8 },
    details: { fontSize: 14, color: "#777", marginLeft: 6 },
    rate: { fontSize: 18, fontWeight: "600", color: "#b58dde", marginTop: 10 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 6 },
    paragraph: {
        fontSize: 14,
        color: "#555",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 10,
        lineHeight: 20,
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    appointmentButton: {
        backgroundColor: "#b58dde",
        borderRadius: 30,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    appointmentText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 14,
        borderTopWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
    },

    /* Skills */
    skillsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    skillPill: {
        backgroundColor: "#EDE4F7",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 6,
        marginBottom: 6,
    },
    skillText: { fontSize: 13, color: "#7B52AB", fontWeight: "500" },

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
    reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    reviewerName: { fontWeight: "700", color: "#333", fontSize: 14 },
    reviewMeta: { flexDirection: "row", alignItems: "center" },
    reviewRatingText: { marginLeft: 6, color: "#333", fontWeight: "700" },
    reviewDate: { color: "#888", fontSize: 12, marginTop: 4 },
    reviewComment: { marginTop: 8, color: "#444", fontSize: 14, lineHeight: 20 },
});
