import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import { db } from "../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

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

const Home = () => {
    const [tutors, setTutors] = useState<UserData[]>([]);
    const [babysitters, setBabysitters] = useState<UserData[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const querySnapshot = await getDocs(collection(db, "providers"));

            const data = querySnapshot.docs.map(doc => doc.data() as UserData);

            setTutors(data.filter(item => item.type === "Tutor"));
            setBabysitters(data.filter(item => item.type === "Babysitter"));
        };

        fetchData();
    }, []);

    return (
        <View style={styles.container}>

            <View style={styles.header}>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.greeting}>Hi, Tony!</Text>
                    <Text style={styles.welcome}>Welcome back!</Text>
                </View>
                <TouchableOpacity style={styles.profileIcon}>
                    <Ionicons name="person-circle-outline" size={40} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.locationCard}>
                <Ionicons name="location-outline" size={22} color="#fff" />
                <View>
                    <Text style={styles.locationText}>Baguio City</Text>
                    <Text style={styles.locationSubText}>2600 Session Rd.</Text>
                </View>
                <Ionicons name="chevron-down-outline" size={18} color="#fff" style={{ marginLeft: 'auto' }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>

                <Text style={styles.sectionTitle}>Best Tutors</Text>
                {tutors.map((item) => (
                    <View key={item.id} style={styles.listCard}>
                        <Ionicons name="person-circle-outline" size={50} color="#8e44ad" />
                        <View style={styles.listDetails}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.subText}>
                                <Ionicons name="location-outline" size={14} /> {item.distance}
                            </Text>
                            <Text style={styles.subText}>
                                <Ionicons name="star" size={14} color="#f1c40f" /> {item.rating} | {item.reviews} reviews
                            </Text>
                        </View>
                        <View style={styles.priceContainer}>
                            <Ionicons name="heart-outline" size={20} color="red" />
                            <Text style={styles.price}>{item.rate}</Text>
                            <Text style={styles.perHour}>per hour</Text>
                        </View>
                    </View>
                ))}

                <Text style={styles.sectionTitle}>Best Babysitters</Text>
                {babysitters.map((item) => (
                    <View key={item.id} style={styles.listCard}>
                        <Ionicons name="person-circle-outline" size={50} color="#8e44ad" />
                        <View style={styles.listDetails}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.subText}>
                                <Ionicons name="location-outline" size={14} /> {item.distance}
                            </Text>
                            <Text style={styles.subText}>
                                <Ionicons name="star" size={14} color="#f1c40f" /> {item.rating} | {item.reviews} reviews
                            </Text>
                        </View>
                        <View style={styles.priceContainer}>
                            <Ionicons name="heart-outline" size={20} color="red" />
                            <Text style={styles.price}>{item.rate}</Text>
                            <Text style={styles.perHour}>per hour</Text>
                        </View>
                    </View>
                ))}

            </ScrollView>

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
    header: { backgroundColor: '#8e44ad', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 10 },
    headerTextContainer: { flex: 1 },
    greeting: { color: '#fff', fontSize: 16 },
    welcome: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    profileIcon: { marginLeft: 10 },
    locationCard: { flexDirection: 'row', backgroundColor: '#9b59b6', marginHorizontal: 20, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: -10 },
    locationText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
    locationSubText: { color: '#f0f0f0', fontSize: 12, marginLeft: 8 },
    scrollContent: { paddingHorizontal: 20, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
    listCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 2, marginTop: 10 },
    listDetails: { flex: 1, marginLeft: 10 },
    name: { fontWeight: 'bold', fontSize: 16 },
    subText: { color: '#7f8c8d', fontSize: 13 },
    priceContainer: { alignItems: 'flex-end' },
    price: { fontWeight: 'bold', fontSize: 16, color: '#8e44ad' },
    perHour: { color: '#7f8c8d', fontSize: 12 },
    bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: '#eee' },
});
