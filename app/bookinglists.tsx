import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";

interface Booking {
    id: string;
    name: string;
    distance: string;
    rating: number;
    reviews: number;
    price: number;
    favorite?: boolean;
    status: string;
}

const bookings: Booking[] = [
    { id: '1', name: 'Peter Parker', distance: '0.5 km away', rating: 5.0, reviews: 12, price: 5, favorite: true, status: 'Pending' },
    { id: '2', name: 'Steve Rogers', distance: '0.5 km away', rating: 5.0, reviews: 12, price: 5, favorite: true, status: 'Pending' },
    { id: '3', name: 'Natasha Romanof', distance: '0.5 km away', rating: 5.0, reviews: 12, price: 5, favorite: true, status: 'Pending' },
    { id: '4', name: 'Clint Barton', distance: '0.5 km away', rating: 5.0, reviews: 12, price: 5, favorite: true, status: 'Pending' },
];

const MyBookingsListScreen: React.FC = () => {
    const router = useRouter();
    const [selectedTab, setSelectedTab] = useState('All');

    return (
        <View style={styles.container}>
            {/* TOP LAYER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/home")}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* TABS */}
            <View style={styles.tabs}>
                {['All', 'Pending', 'Ongoing'].map((tab) => (
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

            {/* BOOKINGS LIST */}
            <ScrollView contentContainerStyle={styles.scroll}>
                {bookings.map((b) => (
                    <View key={b.id} style={styles.card}>
                        <View style={styles.leftSection}>
                            <Ionicons name="person-circle-outline" size={50} color="#b58dde" />
                        </View>

                        <View style={styles.middleSection}>
                            <Text style={styles.name}>{b.name}</Text>
                            <View style={styles.row}>
                                <Ionicons name="location-outline" size={14} color="#777" />
                                <Text style={styles.mutedText}>{b.distance}</Text>
                            </View>
                            <View style={styles.row}>
                                <Ionicons name="star" size={14} color="#f1c40f" />
                                <Text style={styles.mutedText}>{b.rating} | {b.reviews} reviews</Text>
                            </View>

                            <View style={styles.actionsRow}>
                                <View style={styles.statusBox}>
                                    <Text style={styles.statusText}>{b.status}</Text>
                                </View>
                                <TouchableOpacity style={styles.messageBtn}>
                                    <Ionicons name="chatbubble-outline" size={14} color="#fff" />
                                    <Text style={styles.messageText}>Message now</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.rightSection}>
                            {b.favorite ? (
                                <Ionicons name="heart" size={20} color="red" />
                            ) : (
                                <Ionicons name="heart-outline" size={20} color="#aaa" />
                            )}
                            <Text style={styles.price}>₱{b.price}</Text>
                            <Text style={styles.perHour}>per hour</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* BOTTOM NAVIGATION */}
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        backgroundColor: '#b58dde',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 45,
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },

    tabs: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: '#f8f8f8',
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tabActive: {
        backgroundColor: '#b58dde',
    },
    tabText: { color: '#777', fontSize: 14 },
    tabTextActive: { color: '#fff', fontWeight: '600' },

    scroll: { padding: 16 },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    leftSection: { justifyContent: 'center', alignItems: 'center' },
    middleSection: { flex: 1, marginLeft: 10 },
    rightSection: { alignItems: 'flex-end', justifyContent: 'center' },
    name: { fontWeight: '600', fontSize: 16 },
    row: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    mutedText: { color: '#777', fontSize: 12, marginLeft: 4 },
    price: { fontSize: 16, fontWeight: '600', color: '#8e44ad' },
    perHour: { fontSize: 10, color: '#777' },

    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    statusBox: {
        backgroundColor: '#f3e9ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        marginRight: 10,
    },
    statusText: { color: '#8e44ad', fontSize: 12 },
    messageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#b58dde',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    messageText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },

    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: '#eee',
    },
});

export default MyBookingsListScreen;
