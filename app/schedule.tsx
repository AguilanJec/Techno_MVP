import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";

const MyBookingsScreen: React.FC = () => {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {/* TOP LAYER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/user/home")}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <View style={{ width: 24 }} /> {/* spacer for balance */}
            </View>

            {/* MIDDLE LAYER */}
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Ionicons name="calendar-outline" size={40} color="#b58dde" />
                </View>

                <Text style={styles.mainText}>Booking and requests</Text>
                <Text style={styles.mainText}>are live here!</Text>
                <Text style={styles.subText}>This page shows all of your bookings.</Text>

                <TouchableOpacity onPress={() => router.push("/user/search")} style={styles.createButton}>
                    <Text style={styles.createButtonText}>Create Request</Text>
                </TouchableOpacity>
            </View>

            {/* BOTTOM NAVIGATION */}
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

                <TouchableOpacity onPress={() => router.push("/user/search")}>
                    <Ionicons name="person-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        backgroundColor: '#b58dde',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 45,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    iconCircle: {
        backgroundColor: '#f3e9ff',
        borderRadius: 100,
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    mainText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    subText: {
        color: '#777',
        fontSize: 14,
        marginTop: 8,
        marginBottom: 40,
    },
    createButton: {
        backgroundColor: '#b58dde',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 25,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: '#eee',
    },
});

export default MyBookingsScreen;

