import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    FlatList,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import { db } from "../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

const { width: screenWidth } = Dimensions.get('window');

interface UserData {
    id: string;
    name: string;
    type: string;
    distance: string;
    rate: string;
    rating: number;
    reviews: number;
    bio: string;
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

    // Popular services data - now with target sections
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

    useEffect(() => {
        const fetchData = async () => {
            const querySnapshot = await getDocs(collection(db, "providers"));

            const data = querySnapshot.docs.map(doc => doc.data() as UserData);

            setTutors(data.filter(item => item.type === "Tutor"));
            setBabysitters(data.filter(item => item.type === "Babysitter"));
        };

        fetchData();
    }, []);

    // Function to scroll to specific section
    const scrollToSection = (section: 'tutors' | 'babysitters') => {
        let yPosition = 0;

        // Calculate approximate positions based on your layout
        if (section === 'tutors') {
            yPosition = 200;
        } else if (section === 'babysitters') {
            yPosition = 650;
        }

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

    const renderTutorCard = ({ item }: { item: UserData }) => (
        <TouchableOpacity style={styles.tutorCard}>
            <View style={styles.tutorHeader}>
                <Ionicons name="person-circle-outline" size={50} color="#b58dde" />
                <Ionicons name="heart-outline" size={20} color="#8e44ad" style={styles.heartIcon} />
            </View>
            <Text style={styles.tutorName}>{item.name}</Text>
            <Text style={styles.tutorDistance}>
                <Ionicons name="location-outline" size={12} color="#666" /> {item.distance}
            </Text>
            <Text style={styles.tutorRating}>
                <Ionicons name="star" size={12} color="#f1c40f" /> {item.rating} | {item.reviews} reviews
            </Text>
        </TouchableOpacity>
    );

    const renderBabysitterCard = ({ item }: { item: UserData }) => (
        <TouchableOpacity style={styles.babysitterCard}>
            <View style={styles.babysitterHeader}>
                <Ionicons name="person-circle-outline" size={50} color="#b58dde" />
                <Ionicons name="heart-outline" size={20} color="#8e44ad" style={styles.heartIcon} />
            </View>
            <Text style={styles.babysitterName}>{item.name}</Text>
            <Text style={styles.babysitterDistance}>
                <Ionicons name="location-outline" size={12} color="#666" /> {item.distance}
            </Text>
            <Text style={styles.babysitterRating}>
                <Ionicons name="star" size={12} color="#f1c40f" /> {item.rating} | {item.reviews} reviews
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.greeting}>Hi, Tony!</Text>
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
                    pathname: "/edit_address",
                    params: { origin: "home" } // Pass the origin
                })}
                style={styles.locationCard}
            >
                <Ionicons name="location-outline" size={22} color="#fff" />
                <View>
                    <Text style={styles.locationText}>Baguio City</Text>
                    <Text style={styles.locationSubText}>2019 Sustainable</Text>
                </View>

                <View style={styles.profileIcon}>
                </View>

                <Ionicons name="chevron-down-outline" size={18} color="#fff" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Scroll Content */}
            <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                style={styles.scrollContent}
            >
                {/* No Service Planned Section */}
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

                {/* Popular Services Section */}
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

                {/* Best Tutors Section */}
                <View
                    ref={tutorsSectionRef}
                    style={styles.sectionContainer}
                >
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Best Tutors</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeMoreText}>See more</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={tutors}
                        renderItem={renderTutorCard}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tutorsList}
                    />
                </View>

                {/* Best Babysitters Section */}
                <View
                    ref={babysittersSectionRef}
                    style={styles.sectionContainer}
                >
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Best Babysitters</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeMoreText}>See more</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={babysitters}
                        renderItem={renderBabysitterCard}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.babysittersList}
                    />
                </View>

                {/* Add some bottom padding */}
                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Floating Chatbot Button */}
            <TouchableOpacity
                onPress={() => router.push("/chatbot")}
                style={styles.floatingChatbotButton}
            >
                <Image
                    source={require("../assets/images/chat-bot.png")}
                    style={styles.floatingChatbotIcon}
                />
            </TouchableOpacity>

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
};

export default Home;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    header: {
        backgroundColor: '#b58dde',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 10
    },
    headerTextContainer: {
        flex: 1
    },
    greeting: {
        color: '#fff',
        fontSize: 16
    },
    welcome: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold'
    },
    profileIcon: {
        marginLeft: 10
    },
    locationCard: {
        flexDirection: 'row',
        backgroundColor: '#ddc9dd',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginTop: -10
    },
    locationText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8
    },
    locationSubText: {
        color: '#f0f0f0',
        fontSize: 12,
        marginLeft: 8
    },
    scrollContent: {
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 70
    },

    // Section Container for refs
    sectionContainer: {
        marginTop: 20,
    },

    // No Service Planned Section
    servicePlannedCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        marginBottom: 20,
    },

    servicePlannedLeft: {

    },

    noServiceText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    scheduleButton: {
        backgroundColor: '#b58dde',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    scheduleButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },

    // Section Headers
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    seeMoreText: {
        color: '#b58dde',
        fontWeight: '600',
        fontSize: 14,
    },

    // Popular Services
    servicesList: {
        paddingBottom: 10,
    },
    serviceCard: {
        width: 160,
        height: 100,
        borderRadius: 12,
        padding: 15,
        marginRight: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    serviceContent: {
        flex: 1,
    },
    serviceTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    serviceSubtitle: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
    },

    // Tutor Cards
    tutorsList: {
        paddingBottom: 20,
    },
    tutorCard: {
        width: 140,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tutorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    heartIcon: {
        marginTop: 5,
    },
    tutorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
        marginBottom: 5,
    },
    tutorDistance: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
    },
    tutorRating: {
        fontSize: 12,
        color: '#666',
    },

    // Babysitter Cards
    babysittersList: {
        paddingBottom: 30,
    },
    babysitterCard: {
        width: 140,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    babysitterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    babysitterName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
        marginBottom: 5,
    },
    babysitterDistance: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
    },
    babysitterRating: {
        fontSize: 12,
        color: '#666',
    },

    // Bottom Padding
    bottomPadding: {
        height: 30,
    },

    // Floating Chatbot Button
    floatingChatbotButton: {
        position: 'absolute',
        bottom: 70,
        alignSelf: 'flex-end',
        zIndex: 10,
    },
    floatingChatbotIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },

    // Bottom Navigation
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#fff'
    },
});