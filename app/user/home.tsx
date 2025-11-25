// app/Home.tsx
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
    Modal,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import { db } from "../../firebaseConfig";
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
    picture?: any;
    latitude?: number;
    longitude?: number;
    distance?: string;
    distanceKm?: number;
    rate?: string;
    rating?: number;
    reviews?: number;
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

    // See-more modal state
    const [seeMoreVisible, setSeeMoreVisible] = useState(false);
    const [seeMoreTitle, setSeeMoreTitle] = useState("");
    const [seeMoreList, setSeeMoreList] = useState<UserData[]>([]);

    const auth = getAuth();
    const loggedInEmail = auth.currentUser?.email;

    // Haversine formula helpers
    const deg2rad = (deg: number) => deg * (Math.PI / 180);

    const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance;
    };

    const formatDistance = (distanceKm: number) => `${distanceKm.toFixed(2)} km`;

    // Helper to normalize picture field
    const getPictureUri = (picture: any): string | null => {
        if (!picture && picture !== "") return null;

        if (typeof picture === "string") {
            const s = picture.trim();
            if (s.startsWith("data:")) return s;
            if (s.startsWith("http://") || s.startsWith("https://")) return s;
            if (s.startsWith("url(")) {
                const inside = s.replace(/^url\(['"]?/, "").replace(/['"]?\)$/, "");
                if (inside.startsWith("data:") || inside.startsWith("http")) return inside;
            }

            const candidate = s.replace(/\s+/g, "");
            const base64Regex = /^[A-Za-z0-9+/=]+$/;
            if (candidate.length > 100 && base64Regex.test(candidate)) {
                return `data:image/jpeg;base64,${candidate}`;
            }
            if (s.startsWith("//")) return `https:${s}`;
            return s;
        }

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

    // Fetch data
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                let localLat: number | null = null;
                let localLon: number | null = null;

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

                const providersSnap = await getDocs(collection(db, "providers"));

                const providersData: UserData[] = providersSnap.docs.map(docSnap => {
                    const d = docSnap.data() as any;
                    const reviewsArray: Review[] = Array.isArray(d.reviews) ? d.reviews : [];
                    const reviewCount = reviewsArray.length;

                    let avgRating: number | undefined = undefined;
                    if (reviewCount > 0) {
                        const sum = reviewsArray.reduce((acc, r) => {
                            const rVal = typeof r?.rating === "number" ? r.rating : (Number(r?.rating) || 0);
                            return acc + rVal;
                        }, 0);
                        avgRating = Number((sum / reviewCount).toFixed(1));
                    }

                    return {
                        id: docSnap.id,
                        name: d.name || "",
                        role: d.role || "",
                        picture: d.picture ?? undefined,
                        latitude: typeof d.latitude === "number" ? d.latitude : undefined,
                        longitude: typeof d.longitude === "number" ? d.longitude : undefined,
                        rate: d.rate ? String(d.rate) : undefined,
                        rating: avgRating,
                        reviews: reviewCount,
                        bio: d.bio || undefined,
                    } as UserData;
                });

                const withDistance = providersData.map(p => {
                    if (localLat !== null && localLon !== null && typeof p.latitude === "number" && typeof p.longitude === "number") {
                        const km = getDistanceFromLatLonInKm(localLat, localLon, p.latitude, p.longitude);
                        return { ...p, distanceKm: km, distance: formatDistance(km) };
                    } else {
                        return { ...p, distanceKm: undefined, distance: "—" };
                    }
                });

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

    // Popular services
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

    // Scroll helper
    const scrollToSection = (section: 'tutors' | 'babysitters') => {
        let yPosition = 0;
        if (section === 'tutors') yPosition = 200;
        else if (section === 'babysitters') yPosition = 650;
        scrollViewRef.current?.scrollTo({ y: yPosition, animated: true });
    };

    // See-more functionality
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

    // Render functions
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

    const renderTutorCard = ({ item }: { item: UserData }) => {
        const uri = getPictureUri(item.picture);
        return (
            <TouchableOpacity style={styles.tutorCard} onPress={() => router.push({ pathname: "/user/details", params: { id: item.id } })}>
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
            <TouchableOpacity style={styles.babysitterCard} onPress={() => router.push({ pathname: "/user/details", params: { id: item.id } })}>
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

    // Modal card renderer (similar to Search screen)
    const renderModalCard = ({ item }: { item: UserData }) => {
        const uri = getPictureUri(item.picture);
        return (
            <TouchableOpacity
                style={styles.modalCard}
                onPress={() => {
                    closeSeeMore();
                    router.push({ pathname: "/user/details", params: { id: item.id } });
                }}
            >
                <View style={styles.modalCardContent}>
                    <View style={styles.modalProfileInfo}>
                        {uri ? (
                            <Image source={{ uri }} style={styles.modalAvatar} resizeMode="cover" />
                        ) : (
                            <Ionicons name="person-circle-outline" size={50} color="#b58dde" />
                        )}
                        <View style={styles.modalTextInfo}>
                            <Text style={styles.modalName}>{item.name}</Text>
                            <Text style={styles.modalRole}>{item.role}</Text>
                            <View style={styles.modalDistanceContainer}>
                                <Ionicons name="location-outline" size={14} color="#666" />
                                <Text style={styles.modalDistance}>{item.distance ?? "—"}</Text>
                            </View>
                            <View style={styles.modalRatingContainer}>
                                <Ionicons name="star" size={14} color="#f1c40f" />
                                <Text style={styles.modalRating}>{item.rating ?? "—"}</Text>
                                <Text style={styles.modalReviews}>{item.reviews ?? 0} reviews</Text>
                            </View>
                        </View>
                    </View>
                    <Ionicons
                        name="heart-outline"
                        size={20}
                        color="#E85D75"
                        style={styles.modalHeartIcon}
                    />
                </View>
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
                    onPress={() => router.push("/user/account")}
                    style={styles.profileIcon}
                >
                    <Ionicons name="person-circle-outline" size={40} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Location Card */}
            <TouchableOpacity style={styles.locationCard}>
                <Ionicons name="location-outline" size={22} color="#fff" />
                <View>
                    <Text style={styles.locationText}>Baguio City</Text>
                    <Text style={styles.locationSubText}>2019 Sustainable</Text>
                </View>
                <Ionicons name="chevron-down-outline" size={18} color="#fff" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Scroll Content */}
            <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                style={styles.scrollContent}
            >
                {/* No service Planned */}
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
                        <TouchableOpacity onPress={() => openSeeMore("Best Tutors", tutors)}>
                            <Text style={styles.seeMoreText}>See more</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? <ActivityIndicator size="small" /> : (
                        <FlatList
                            data={tutors.slice(0, 5)} // Show only first 5 in horizontal list
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
                        <TouchableOpacity onPress={() => openSeeMore("Best Babysitters", babysitters)}>
                            <Text style={styles.seeMoreText}>See more</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? <ActivityIndicator size="small" /> : (
                        <FlatList
                            data={babysitters.slice(0, 5)} // Show only first 5 in horizontal list
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

            {/* See More Modal */}
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
                            renderItem={renderModalCard}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.seeMoreListContent}
                        />
                    </View>
                </View>
            </Modal>

            {/* Floating Chatbot */}
            <TouchableOpacity
                onPress={() => router.push("/chatbot")}
                style={styles.floatingChatbotButton}
            >
                <Image source={require("../../assets/images/chat-bot.png")} style={styles.floatingChatbotIcon} />
            </TouchableOpacity>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/user/home")}><Ionicons name="home-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/bookinglists")}><Ionicons name="calendar-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/search")}><Ionicons name="search-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/message")}><Ionicons name="chatbubble-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/account")}><Ionicons name="person-outline" size={24} color="#8e44ad" /></TouchableOpacity>
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

    // Avatar style
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EEE',
        overflow: 'hidden',
    },

    // See More Modal Styles
    seeMoreModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    seeMoreModal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingHorizontal: 16,
        paddingTop: 12,
        maxHeight: '80%',
    },
    seeMoreHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 8,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    seeMoreTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    seeMoreListContent: {
        paddingBottom: 30,
    },

    // Modal Card Styles
    modalCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    modalCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    modalProfileInfo: {
        flexDirection: 'row',
        flex: 1,
    },
    modalTextInfo: {
        flex: 1,
        marginLeft: 12,
    },
    modalAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EEE',
    },
    modalName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    modalRole: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
    },
    modalDistanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    modalDistance: {
        fontSize: 14,
        color: '#666',
        marginLeft: 6,
    },
    modalRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalRating: {
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
        marginLeft: 4,
        marginRight: 4,
    },
    modalReviews: {
        fontSize: 14,
        color: '#666',
    },
    modalHeartIcon: {
        marginTop: 4,
    },
});