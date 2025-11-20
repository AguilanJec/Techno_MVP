// app/Home.tsx  (replace your current Home component with this)
import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    FlatList,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import { db } from "../firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const { width: screenWidth } = Dimensions.get('window');

interface Review {
    reviewer?: string;
    rating?: number;
    comment?: string;
    date?: any;
}

interface UserData {
    id: string;
    name: string;
    role: string;
    picture?: any;            // new picture field (string or object)
    latitude?: number;
    longitude?: number;
    distance?: string;
    distanceKm?: number;
    rate?: string;
    rating?: number;   // average rating (computed)
    reviews?: number;  // review count (computed)
    bio?: string;
}

interface ServiceCard {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    targetSection: 'tutors' | 'babysitters';
}

const Home = () => {
    const [tutors, setTutors] = useState<UserData[]>([]);
    const [babysitters, setBabysitters] = useState<UserData[]>([]);
    const scrollViewRef = useRef<ScrollView>(null);
    const tutorsSectionRef = useRef<View>(null);
    const babysittersSectionRef = useRef<View>(null);
    const [userName, setUserName] = useState<string>("");
    const [userLat, setUserLat] = useState<number | null>(null);
    const [userLon, setUserLon] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const auth = getAuth();
    const loggedInEmail = auth.currentUser?.email;

    // Haversine formula helpers
    const deg2rad = (deg: number) => deg * (Math.PI / 180);

    const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        return distance;
    };

    const formatDistance = (distanceKm: number) => `${distanceKm.toFixed(2)} km`;

    // Helper to normalize picture field into a usable URI or null
    const getPictureUri = (picture: any): string | null => {
        if (!picture && picture !== "") return null;

        // if it's already a data URL
        if (typeof picture === "string") {
            const s = picture.trim();

            // data URL
            if (s.startsWith("data:")) return s;

            // http(s) url
            if (s.startsWith("http://") || s.startsWith("https://")) return s;

            // some systems store "url(...)" wrappers — strip them
            if (s.startsWith("url(")) {
                const inside = s.replace(/^url\(['"]?/, "").replace(/['"]?\)$/, "");
                if (inside.startsWith("data:") || inside.startsWith("http")) return inside;
            }

            // plain base64 string (common): check if it looks like base64 and length is reasonably large
            const candidate = s.replace(/\s+/g, "");
            const base64Regex = /^[A-Za-z0-9+/=]+$/;
            if (candidate.length > 100 && base64Regex.test(candidate)) {
                // assume jpeg if unknown
                return `data:image/jpeg;base64,${candidate}`;
            }

            // fallback: maybe it's an URL without protocol
            if (s.startsWith("//")) return `https:${s}`;

            // otherwise return as-is (may still be valid)
            return s;
        }

        // if it's an object { base64: '...' } or { url: '...' }
        if (typeof picture === "object") {
            if (typeof picture.base64 === "string" && picture.base64.length > 0) {
                return `data:image/jpeg;base64,${String(picture.base64).replace(/\s+/g, "")}`;
            }
            if (typeof picture.url === "string") {
                return picture.url;
            }
        }

        return null;
    };

    // Fetch logged-in user and providers; compute avg rating from embedded reviews
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                let localLat: number | null = null;
                let localLon: number | null = null;

                // Fetch logged-in user (name + coords) from "users" collection
                if (loggedInEmail) {
                    const q = query(collection(db, "users"), where("email", "==", loggedInEmail));
                    const userSnap = await getDocs(q);
                    if (!userSnap.empty) {
                        const uDoc = userSnap.docs[0].data() as any;
                        setUserName(uDoc.name || "");
                        if (typeof uDoc.latitude === "number" && typeof uDoc.longitude === "number") {
                            localLat = uDoc.latitude;
                            localLon = uDoc.longitude;
                            setUserLat(localLat);
                            setUserLon(localLon);
                        }
                    }
                }

                // Fetch all providers
                const providersSnap = await getDocs(collection(db, "providers"));

                const providersData: UserData[] = providersSnap.docs.map(docSnap => {
                    const d = docSnap.data() as any;

                    // reviews might be an array of map objects in the provider doc
                    const reviewsArray: Review[] = Array.isArray(d.reviews) ? d.reviews : [];

                    // Compute review count
                    const reviewCount = reviewsArray.length;

                    // Compute average rating (only include numeric ratings)
                    let avgRating: number | undefined = undefined;
                    if (reviewCount > 0) {
                        const sum = reviewsArray.reduce((acc, r) => {
                            const rVal = typeof r?.rating === "number" ? r.rating : (Number(r?.rating) || 0);
                            return acc + rVal;
                        }, 0);
                        avgRating = Number((sum / reviewCount).toFixed(1)); // one decimal place
                    }

                    return {
                        id: docSnap.id,
                        name: d.name || "",
                        role: d.role || "",
                        picture: d.picture ?? undefined, // <-- new picture field
                        latitude: typeof d.latitude === "number" ? d.latitude : undefined,
                        longitude: typeof d.longitude === "number" ? d.longitude : undefined,
                        rate: d.rate ? String(d.rate) : undefined,
                        rating: avgRating,
                        reviews: reviewCount,
                        bio: d.bio || undefined,
                    } as UserData;
                });

                // Compute distance if we have user's coords
                const withDistance = providersData.map(p => {
                    if (localLat !== null && localLon !== null && typeof p.latitude === "number" && typeof p.longitude === "number") {
                        const km = getDistanceFromLatLonInKm(localLat, localLon, p.latitude, p.longitude);
                        return { ...p, distanceKm: km, distance: formatDistance(km) };
                    } else {
                        return { ...p, distanceKm: undefined, distance: "—" };
                    }
                });

                // Filter by role (case-insensitive); support role strings like "tutoring", "tutor", "babysitting", "babysitter"
                setTutors(withDistance.filter(item => (item.role || "").toLowerCase().includes("tutor")));
                setBabysitters(withDistance.filter(item => (item.role || "").toLowerCase().includes("baby")));
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [loggedInEmail]);

    // Popular services (unchanged)
    const popularServices: ServiceCard[] = [
        {
            id: '1',
            title: 'Babysitting',
            subtitle: 'Quick booking at\nyour home',
            icon: 'home-outline',
            color: '#E8DEF8',
            targetSection: 'babysitters'
        },
        {
            id: '2',
            title: 'Tutoring',
            subtitle: 'Early childhood\ndevelopment',
            icon: 'school-outline',
            color: '#FFE8E9',
            targetSection: 'tutors'
        }
    ];

    // Scroll helper (you may want to compute exact offsets later)
    const scrollToSection = (section: 'tutors' | 'babysitters') => {
        let yPosition = 0;
        if (section === 'tutors') yPosition = 200;
        else if (section === 'babysitters') yPosition = 650;
        scrollViewRef.current?.scrollTo({ y: yPosition, animated: true });
    };

    const renderServiceCard = ({ item }: { item: ServiceCard }) => (
        <TouchableOpacity
            style={[styles.serviceCard, { backgroundColor: item.color }]}
            onPress={() => scrollToSection(item.targetSection)}
        >
            <View style={styles.serviceContent}>
                <Text style={styles.serviceTitle}>{item.title}</Text>
                <Text style={styles.serviceSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name={item.icon as any} size={32} color="#8e44ad" />
        </TouchableOpacity>
    );

    // Tutor & Babysitter card renderers now use picture if present
    const renderTutorCard = ({ item }: { item: UserData }) => {
        const uri = getPictureUri(item.picture);
        return (
            <TouchableOpacity style={styles.tutorCard} onPress={() => router.push({ pathname: "/details", params: { id: item.id } })}>
                <View style={styles.tutorHeader}>
                    {uri ? (
                        <Image source={{ uri }} style={styles.avatar} resizeMode="cover" />
                    ) : (
                        <Ionicons name="person-circle-outline" size={50} color="#b58dde" />
                    )}
                    <Ionicons name="heart-outline" size={20} color="#8e44ad" style={styles.heartIcon} />
                </View>
                <Text style={styles.tutorName}>{item.name}</Text>
                <Text style={styles.tutorDistance}>
                    <Ionicons name="location-outline" size={12} color="#666" /> {item.distance ?? "—"}
                </Text>
                <Text style={styles.tutorRating}>
                    <Ionicons name="star" size={12} color="#f1c40f" /> {item.rating ?? "—"} | {item.reviews ?? 0} reviews
                </Text>
            </TouchableOpacity>
        );
    };

    const renderBabysitterCard = ({ item }: { item: UserData }) => {
        const uri = getPictureUri(item.picture);
        return (
            <TouchableOpacity style={styles.babysitterCard} onPress={() => router.push({ pathname: "/details", params: { id: item.id } })}>
                <View style={styles.babysitterHeader}>
                    {uri ? (
                        <Image source={{ uri }} style={styles.avatar} resizeMode="cover" />
                    ) : (
                        <Ionicons name="person-circle-outline" size={50} color="#b58dde" />
                    )}
                    <Ionicons name="heart-outline" size={20} color="#8e44ad" style={styles.heartIcon} />
                </View>
                <Text style={styles.babysitterName}>{item.name}</Text>
                <Text style={styles.babysitterDistance}>
                    <Ionicons name="location-outline" size={12} color="#666" /> {item.distance ?? "—"}
                </Text>
                <Text style={styles.babysitterRating}>
                    <Ionicons name="star" size={12} color="#f1c40f" /> {item.rating ?? "—"} | {item.reviews ?? 0} reviews
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.greeting}>Hi, {userName || "there"}!</Text>
                    <Text style={styles.welcome}>Welcome back!</Text>
                </View>
                <TouchableOpacity
                    onPress={() => router.push("/account")}
                    style={styles.profileIcon}
                >
                    <Ionicons name="person-circle-outline" size={40} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Location Card */}
            <TouchableOpacity
                onPress={() => router.push({
                    pathname: "/authentication/edit_address",
                    params: { origin: "home" } // Pass the origin
                })}
                style={styles.locationCard}
            >
                <Ionicons name="location-outline" size={22} color="#fff" />
                <View>
                    <Text style={styles.locationText}>Baguio City</Text>
                    <Text style={styles.locationSubText}>2019 Sustainable</Text>
                </View>

                <View style={styles.profileIcon} />
                <Ionicons name="chevron-down-outline" size={18} color="#fff" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Scroll Content */}
            <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                style={styles.scrollContent}
            >
                {/* No Service Planned */}
                <View style={styles.servicePlannedCard}>
                    <View style={styles.servicePlannedLeft}>
                        <Text style={styles.noServiceText}>No Service planned</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.scheduleButton}
                        onPress={() => router.push("/schedule")}
                    >
                        <Text style={styles.scheduleButtonText}>Schedule</Text>
                    </TouchableOpacity>
                </View>

                {/* Popular Services */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Popular services</Text>
                </View>

                <FlatList
                    data={popularServices}
                    renderItem={renderServiceCard}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.servicesList}
                />

                {/* Best Tutors */}
                <View ref={tutorsSectionRef} style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Best Tutors</Text>
                        <TouchableOpacity><Text style={styles.seeMoreText}>See more</Text></TouchableOpacity>
                    </View>

                    {loading ? <ActivityIndicator size="small" /> : (
                        <FlatList
                            data={tutors}
                            renderItem={renderTutorCard}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tutorsList}
                        />
                    )}
                </View>

                {/* Best Babysitters */}
                <View ref={babysittersSectionRef} style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Best Babysitters</Text>
                        <TouchableOpacity><Text style={styles.seeMoreText}>See more</Text></TouchableOpacity>
                    </View>

                    {loading ? <ActivityIndicator size="small" /> : (
                        <FlatList
                            data={babysitters}
                            renderItem={renderBabysitterCard}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.babysittersList}
                        />
                    )}
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Floating Chatbot */}
            <TouchableOpacity
                onPress={() => router.push("/chatbot")}
                style={styles.floatingChatbotButton}
            >
                <Image source={require("../assets/images/chat-bot.png")} style={styles.floatingChatbotIcon} />
            </TouchableOpacity>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/home")}><Ionicons name="home-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/bookinglists")}><Ionicons name="calendar-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/search")}><Ionicons name="search-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/message")}><Ionicons name="chatbubble-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/account")}><Ionicons name="person-outline" size={24} color="#8e44ad" /></TouchableOpacity>
            </View>
        </View>
    );
};

export default Home;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { backgroundColor: '#b58dde', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 10 },
    headerTextContainer: { flex: 1 },
    greeting: { color: '#fff', fontSize: 16 },
    welcome: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    profileIcon: { marginLeft: 10 },
    locationCard: { flexDirection: 'row', backgroundColor: '#ddc9dd', marginHorizontal: 20, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: -10 },
    locationText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
    locationSubText: { color: '#f0f0f0', fontSize: 12, marginLeft: 8 },
    scrollContent: { paddingHorizontal: 20, marginTop: 10, marginBottom: 70 },
    sectionContainer: { marginTop: 20 },
    servicePlannedCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, marginTop: 20, marginBottom: 20 },
    noServiceText: { fontSize: 16, fontWeight: '600', color: '#333' },
    scheduleButton: { backgroundColor: '#b58dde', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    scheduleButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    seeMoreText: { color: '#b58dde', fontWeight: '600', fontSize: 14 },
    servicesList: { paddingBottom: 10 },
    serviceCard: { width: 160, height: 100, borderRadius: 12, padding: 15, marginRight: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    serviceContent: { flex: 1 },
    servicePlannedLeft: { },
    serviceTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    serviceSubtitle: { fontSize: 12, color: '#666', lineHeight: 16 },
    tutorsList: { paddingBottom: 20 },
    tutorCard: { width: 140, backgroundColor: '#fff', borderRadius: 12, padding: 15, marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    tutorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    heartIcon: { marginTop: 5 },
    tutorName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 10, marginBottom: 5 },
    tutorDistance: { fontSize: 12, color: '#666', marginBottom: 5 },
    tutorRating: { fontSize: 12, color: '#666' },
    babysittersList: { paddingBottom: 30 },
    babysitterCard: { width: 140, backgroundColor: '#fff', borderRadius: 12, padding: 15, marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    babysitterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    babysitterName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 10, marginBottom: 5 },
    babysitterDistance: { fontSize: 12, color: '#666', marginBottom: 5 },
    babysitterRating: { fontSize: 12, color: '#666' },
    bottomPadding: { height: 30 },
    floatingChatbotButton: { position: 'absolute', bottom: 70, alignSelf: 'flex-end', zIndex: 10 },
    floatingChatbotIcon: { width: 60, height: 60, borderRadius: 30 },
    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },

    // avatar style
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EEE',
        overflow: 'hidden',
    },
});
