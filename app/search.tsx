import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

export default function SearchScreen() {
    const router = useRouter();
    const [tutors, setTutors] = useState([]);

    useEffect(() => {
        const fetchTutors = async () => {
            const querySnapshot = await getDocs(collection(db, "providers"));
            const list: any = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setTutors(list);
        };

        fetchTutors();
    }, []);

    const renderTutor = ({ item }: { item: UserData }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: "/details", params: { id: item.id } })}
        >
            <View style={styles.profileRow}>
                <Ionicons name="person-circle-outline" size={45} color="#7B52AB" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="location-outline" size={14} color="#777" />
                        <Text style={styles.subText}>{item.distance}</Text>
                    </View>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                    <Ionicons name="heart-outline" size={20} color="#E85D75" />
                    <Text style={styles.rate}>{item.rate}</Text>
                    <Text style={styles.perHour}>per hour</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color="#7B52AB" />
                <TextInput placeholder="Search..." style={styles.searchInput} placeholderTextColor="#999" />
                <Ionicons name="options-outline" size={18} color="#7B52AB" />
            </View>

            {/* Section Title */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Available Tutors Near You</Text>
            </View>

            <FlatList data={tutors} renderItem={renderTutor} keyExtractor={(item) => item.id} />

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

// ---------- Styles ----------
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EDE4F7",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        marginHorizontal: 8,
        color: "#333",
    },
    categoryRow: {
        flexDirection: "row",
        marginTop: 20,
        marginBottom: 10,
    },
    categoryButton: {
        backgroundColor: "#F2F2F2",
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
    },
    categoryButtonActive: {
        backgroundColor: "#7B52AB",
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
    },
    categoryText: {
        color: "#777",
    },
    categoryTextActive: {
        color: "#fff",
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 15,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    sectionLink: {
        fontSize: 14,
        color: "#7B52AB",
    },
    card: {
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#eee",
        marginBottom: 10,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    profileRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    name: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    subText: {
        fontSize: 13,
        color: "#777",
        marginLeft: 4,
    },
    rate: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#7B52AB",
    },
    perHour: {
        fontSize: 10,
        color: "#777",
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: '#eee'
    },
});
