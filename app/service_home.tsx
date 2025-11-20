// app/service_home.tsx
import React, { useState, useEffect } from 'react';
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

const { width: screenWidth } = Dimensions.get('window');

// Sample data for upcoming bookings (service provider perspective)
interface Booking {
    id: string;
    parentName: string;
    date: string;
    time: string;
    location: string;
    status: 'confirmed' | 'pending' | 'completed';
    type: 'babysitting' | 'tutoring';
}

// Sample data for service stats
interface StatCard {
    id: string;
    title: string;
    value: string;
    icon: string;
    color: string;
}

const ServiceHome = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [stats, setStats] = useState<StatCard[]>([]);

    // Mock data initialization
    useEffect(() => {
        // In a real app, you would fetch this data from your backend/Firestore
        setBookings([
            {
                id: '1',
                parentName: 'Maria Santos',
                date: 'Nov 21, 2025',
                time: '08:00 AM - 12:00 PM',
                location: 'Baguio City',
                status: 'confirmed',
                type: 'babysitting'
            },
            {
                id: '2',
                parentName: 'John Dela Cruz',
                date: 'Nov 22, 2025',
                time: '03:00 PM - 06:00 PM',
                location: 'Baguio City',
                status: 'pending',
                type: 'tutoring'
            },
            {
                id: '3',
                parentName: 'Ana Reyes',
                date: 'Nov 23, 2025',
                time: '05:00 PM - 08:00 PM',
                location: 'Baguio City',
                status: 'confirmed',
                type: 'babysitting'
            },
        ]);

        setStats([
            {
                id: '1',
                title: 'Total Bookings',
                value: '24',
                icon: 'calendar',
                color: '#E8DEF8',
            },
            {
                id: '2',
                title: 'Avg. Rating',
                value: '4.8',
                icon: 'star',
                color: '#FFE8E9',
            },
            {
                id: '3',
                title: 'Earnings',
                value: '₱12,500',
                icon: 'cash',
                color: '#E3F2FD',
            },
        ]);
    }, []);

    // Render stat card
    const renderStatCard = ({ item }: { item: StatCard }) => (
        <TouchableOpacity style={[styles.statCard, { backgroundColor: item.color }]}>
            <Ionicons name={item.icon as any} size={28} color="#8e44ad" />
            <View style={styles.statCardContent}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statTitle}>{item.title}</Text>
            </View>
        </TouchableOpacity>
    );

    // Render booking item
    const renderBooking = ({ item }: { item: Booking }) => {
        let statusColor = '#8e44ad'; // Default color
        if (item.status === 'pending') statusColor = '#f39c12';
        if (item.status === 'completed') statusColor = '#27ae60';

        return (
            <TouchableOpacity style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                    <Ionicons name="person-circle-outline" size={40} color="#b58dde" />
                    <View style={styles.bookingInfo}>
                        <Text style={styles.parentName}>{item.parentName}</Text>
                        <Text style={styles.bookingDate}>{item.date} | {item.time}</Text>
                        <Text style={styles.bookingLocation}>{item.location}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>
                <View style={styles.bookingFooter}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="chatbubble-outline" size={18} color="#8e44ad" />
                        <Text style={styles.actionButtonText}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="call-outline" size={18} color="#8e44ad" />
                        <Text style={styles.actionButtonText}>Call</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

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
                onPress={() => router.push("/authentication/edit_address")}
                style={styles.locationCard}
            >
                <Ionicons name="location-outline" size={22} color="#fff" />
                <View>
                    <Text style={styles.locationText}>Baguio City</Text>
                    <Text style={styles.locationSubText}>2019 Sustainable</Text>
                </View>
                <Ionicons name="chevron-down-outline" size={18} color="#fff" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Scroll Content */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollContent}
            >
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
                        <TouchableOpacity>
                            <Text style={styles.seeMoreText}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={bookings}
                        renderItem={renderBooking}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.bookingsList}
                    />
                </View>

                {/* Add some bottom padding */}
                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/service_home")}>
                    <Ionicons name="home" size={24} color="#8e44ad" />
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

export default ServiceHome;

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
        marginBottom: 70 // Space for bottom nav
    },
    sectionContainer: {
        marginTop: 20,
    },
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
    statsList: {
        paddingBottom: 10,
    },
    statCard: {
        width: 130,
        height: 80,
        borderRadius: 12,
        padding: 12,
        marginRight: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    statCardContent: {
        marginLeft: 10,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statTitle: {
        fontSize: 12,
        color: '#666',
    },
    bookingsList: {
        paddingBottom: 20,
    },
    bookingCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bookingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    bookingInfo: {
        flex: 1,
        marginLeft: 10,
    },
    parentName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    bookingDate: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    bookingLocation: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    bookingFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 10,
    },
    actionButtonText: {
        color: '#8e44ad',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 5,
    },
    bottomPadding: {
        height: 30,
    },
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