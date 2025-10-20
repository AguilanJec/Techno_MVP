import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";

interface Tutor {
    id: string;
    name: string;
    distance: string;
    rating: number;
    reviews: number;
    price: number;
    favorite?: boolean;
}

const tutors: Tutor[] = [
    { id: '1', name: 'Peter Parker', distance: '0.3 km away', rating: 5.0, reviews: 12, price: 5, favorite: true },
    { id: '2', name: 'Natasha Romanoff', distance: '0.3 km away', rating: 5.0, reviews: 12, price: 5 },
];

const SearchScreen: React.FC = () => {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState('Tutor');

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TextInput placeholder="Search..." style={styles.searchBar} placeholderTextColor="#aaa" />
                <TouchableOpacity style={styles.filterButton}>
                    <Ionicons name="options-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Category Tabs */}
            <View style={styles.tabs}>
                {['All', 'Tutor', 'Baby sitter'].map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        style={[styles.tab, selectedCategory === cat && styles.tabActive]}
                        onPress={() => setSelectedCategory(cat)}
                    >
                        <Text style={[styles.tabText, selectedCategory === cat && styles.tabTextActive]}>
                            {cat}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Recommended */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recommended</Text>
                        <TouchableOpacity>
                            <Text style={styles.link}>See more</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={tutors}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <TutorCard tutor={item} />}
                    />
                </View>

                {/* Closest to you */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Closest to you</Text>
                    {tutors.map((item) => (
                        <TutorCard key={item.id} tutor={item} />
                    ))}
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <Ionicons name="home-outline" size={24} color="#8e44ad" />
                <Ionicons name="calendar-outline" size={24} color="#8e44ad" />
                <Ionicons name="search-outline" size={24} color="#8e44ad" />
                <Ionicons name="person-outline" size={24} color="#8e44ad" />
            </View>

            <TouchableOpacity onPress={() => router.replace("/login")} style={{ marginTop: 10 }}>
                <Text style={{ color: "#b58dde", textAlign: "center" }}>Log Out</Text>
            </TouchableOpacity>
        </View>
    );
};

const TutorCard: React.FC<{ tutor: Tutor }> = ({ tutor }) => (
    <View style={styles.card}>
        <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-circle-outline" size={40} color="#b58dde" />
        </View>
        <View style={styles.cardInfo}>
            <Text style={styles.name}>{tutor.name}</Text>
            <View style={styles.row}>
                <Ionicons name="location-outline" size={14} color="#777" />
                <Text style={styles.distance}>{tutor.distance}</Text>
            </View>
            <View style={styles.row}>
                <Ionicons name="star" size={14} color="#f1c40f" />
                <Text style={styles.rating}>{tutor.rating} · {tutor.reviews} reviews</Text>
            </View>
        </View>
        <View style={styles.priceContainer}>
            {tutor.favorite ? (
                <Ionicons name="heart" size={20} color="red" />
            ) : (
                <Ionicons name="heart-outline" size={20} color="#aaa" />
            )}
            <Text style={styles.price}>₱{tutor.price}</Text>
            <Text style={styles.perHour}>per hour</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 40 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    searchBar: {
        flex: 1,
        backgroundColor: '#f2f2f2',
        borderRadius: 20,
        paddingHorizontal: 16,
        height: 40,
    },
    filterButton: {
        backgroundColor: '#b58dde',
        borderRadius: 20,
        padding: 8,
        marginLeft: 8,
    },
    tabs: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f2f2f2',
    },
    tabActive: {
        backgroundColor: '#b58dde',
    },
    tabText: { color: '#777' },
    tabTextActive: { color: '#fff', fontWeight: '600' },
    section: { marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '600' },
    link: { color: '#b58dde', fontWeight: '500' },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarPlaceholder: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
    cardInfo: { flex: 1, marginLeft: 10 },
    name: { fontSize: 16, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    distance: { fontSize: 12, color: '#777', marginLeft: 4 },
    rating: { fontSize: 12, color: '#777', marginLeft: 4 },
    priceContainer: { alignItems: 'flex-end' },
    price: { fontSize: 16, fontWeight: '600', color: '#8e44ad' },
    perHour: { fontSize: 10, color: '#777' },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: '#eee',
    },
});

export default SearchScreen;
