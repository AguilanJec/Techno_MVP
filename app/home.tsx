import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {router} from "expo-router";

const Home = () => {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            {/* ======= TOP HEADER ======= */}
            <View style={styles.header}>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.greeting}>Hi, Tony!</Text>
                    <Text style={styles.welcome}>Welcome back!</Text>
                </View>
                <TouchableOpacity style={styles.profileIcon}>
                    <Ionicons name="person-circle-outline" size={40} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* ======= LOCATION CARD ======= */}
            <View style={styles.locationCard}>
                <Ionicons name="location-outline" size={22} color="#fff" />
                <View>
                    <Text style={styles.locationText}>Baguio City</Text>
                    <Text style={styles.locationSubText}>2600 Session Rd.</Text>
                </View>
                <Ionicons name="chevron-down-outline" size={18} color="#fff" style={{ marginLeft: 'auto' }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
                {/* ======= SCHEDULE ======= */}
                <View style={styles.scheduleContainer}>
                    <Text style={styles.noService}>No Service planned</Text>
                    <TouchableOpacity style={styles.scheduleButton}>
                        <Text style={styles.scheduleButtonText}>Schedule</Text>
                    </TouchableOpacity>
                </View>

                {/* ======= POPULAR SERVICES ======= */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Popular services</Text>
                    <Text style={styles.seeMore}>See more</Text>
                </View>
                <View style={styles.popularContainer}>
                    <View style={styles.serviceCard}>
                        <Ionicons name="home-outline" size={28} color="#8e44ad" />
                        <Text style={styles.serviceTitle}>Babysitting</Text>
                        <Text style={styles.serviceDesc}>Quick booking at your home</Text>
                    </View>
                    <View style={styles.serviceCard}>
                        <Ionicons name="school-outline" size={28} color="#8e44ad" />
                        <Text style={styles.serviceTitle}>Tutoring</Text>
                        <Text style={styles.serviceDesc}>Early childhood development</Text>
                    </View>
                </View>

                {/* ======= BEST TUTORS ======= */}
                <Text style={styles.sectionTitle}>Best Tutors</Text>
                <View style={styles.listCard}>
                    <Ionicons name="person-circle-outline" size={50} color="#8e44ad" />
                    <View style={styles.listDetails}>
                        <Text style={styles.name}>Peter Parker</Text>
                        <Text style={styles.subText}>
                            <Ionicons name="location-outline" size={14} /> 0.5 km away
                        </Text>
                        <Text style={styles.subText}>
                            <Ionicons name="star" size={14} color="#f1c40f" /> 5.0 | 12 reviews
                        </Text>
                    </View>
                    <View style={styles.priceContainer}>
                        <Ionicons name="heart" size={20} color="red" />
                        <Text style={styles.price}>₱5</Text>
                        <Text style={styles.perHour}>per hour</Text>
                    </View>
                </View>

                {/* ======= BEST BABY SITTERS ======= */}
                <Text style={styles.sectionTitle}>Best baby sitters</Text>
                <View style={styles.listCard}>
                    <Ionicons name="person-circle-outline" size={50} color="#8e44ad" />
                    <View style={styles.listDetails}>
                        <Text style={styles.name}>Natasha Romanof</Text>
                        <Text style={styles.subText}>
                            <Ionicons name="location-outline" size={14} /> 0.5 km away
                        </Text>
                        <Text style={styles.subText}>
                            <Ionicons name="star" size={14} color="#f1c40f" /> 5.0 | 12 reviews
                        </Text>
                    </View>
                    <View style={styles.priceContainer}>
                        <Ionicons name="heart" size={20} color="red" />
                        <Text style={styles.price}>₱5</Text>
                        <Text style={styles.perHour}>per hour</Text>
                    </View>
                </View>
            </ScrollView>

            {/* ======= BOTTOM NAVIGATION ======= */}
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
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        backgroundColor: '#8e44ad',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 10,
    },
    headerTextContainer: { flex: 1 },
    greeting: { color: '#fff', fontSize: 16 },
    welcome: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    profileIcon: { marginLeft: 10 },
    locationCard: {
        flexDirection: 'row',
        backgroundColor: '#9b59b6',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginTop: -10,
    },
    locationText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
    locationSubText: { color: '#f0f0f0', fontSize: 12, marginLeft: 8 },
    scrollContent: { paddingHorizontal: 20, marginTop: 10 },
    scheduleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 12,
        justifyContent: 'space-between',
    },
    noService: { color: '#7f8c8d' },
    scheduleButton: {
        backgroundColor: '#8e44ad',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    scheduleButtonText: { color: '#fff', fontWeight: 'bold' },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
    seeMore: { color: '#8e44ad', fontSize: 14 },
    popularContainer: { flexDirection: 'row', gap: 10, marginTop: 10 },
    serviceCard: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        alignItems: 'center',
        paddingVertical: 16,
    },
    serviceTitle: { fontWeight: 'bold', marginTop: 8 },
    serviceDesc: { fontSize: 12, color: '#7f8c8d', textAlign: 'center', marginTop: 4 },
    listCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        elevation: 2,
        marginTop: 10,
    },
    listDetails: { flex: 1, marginLeft: 10 },
    name: { fontWeight: 'bold', fontSize: 16 },
    subText: { color: '#7f8c8d', fontSize: 13 },
    priceContainer: { alignItems: 'flex-end' },
    price: { fontWeight: 'bold', fontSize: 16, color: '#8e44ad' },
    perHour: { color: '#7f8c8d', fontSize: 12 },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: '#eee',
    },
});
