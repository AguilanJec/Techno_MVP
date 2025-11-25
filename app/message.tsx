import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, onSnapshot, orderBy, getDoc, doc as firestoreDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getAuth } from "firebase/auth";

interface Conversation {
    id: string;
    participants: string[];
    participantNames: string[];
    lastMessage: string;
    lastMessageTime: any;
    unread: boolean;
    lastMessageSender: string;
}

interface ProviderData {
    name: string;
    email?: string;
}

export default function MessageScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
            setCurrentUser(user);
            setupConversationsListener(user.uid);
        } else {
            setLoading(false);
        }
    }, []);

    const setupConversationsListener = (currentUserId: string) => {
        try {
            const conversationsQuery = query(
                collection(db, "conversations"),
                where("participants", "array-contains", currentUserId),
                orderBy("lastMessageTime", "desc")
            );

            const unsubscribe = onSnapshot(conversationsQuery,
                async (snapshot) => {
                    const conversationsData: Conversation[] = [];

                    for (const docSnap of snapshot.docs) {
                        const data = docSnap.data();
                        const otherUserId = data.participants.find((id: string) => id !== currentUserId);

                        // Get provider name from providers collection
                        let providerName = "Provider";
                        if (otherUserId) {
                            try {
                                const providerDoc = await getDoc(firestoreDoc(db, "providers", otherUserId));
                                if (providerDoc.exists()) {
                                    const providerData = providerDoc.data() as ProviderData;
                                    providerName = providerData.name || "Provider";
                                }
                            } catch (error) {
                                console.error("Error fetching provider name:", error);
                            }
                        }

                        conversationsData.push({
                            id: docSnap.id,
                            participants: data.participants || [],
                            participantNames: [currentUser?.displayName || "User", providerName],
                            lastMessage: data.lastMessage || "No messages yet",
                            lastMessageTime: data.lastMessageTime,
                            unread: data.unread || false,
                            lastMessageSender: data.lastMessageSender || ""
                        } as Conversation);
                    }

                    setConversations(conversationsData);
                    setLoading(false);
                },
                (error) => {
                    console.error("Error in conversations listener:", error);
                    setLoading(false);
                }
            );

            return unsubscribe;
        } catch (error) {
            console.error("Error setting up conversations listener:", error);
            setLoading(false);
        }
    };

    const filteredConversations = conversations.filter(conversation => {
        if (!searchQuery) return true;

        const otherParticipantName = conversation.participantNames.find((name, index) =>
            conversation.participants[index] !== currentUser?.uid
        ) || "";

        return otherParticipantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const getOtherUserName = (participants: string[], participantNames: string[]) => {
        if (!currentUser || !participants) return "Provider";

        const otherParticipantIndex = participants.findIndex(id => id !== currentUser.uid);
        return participantNames[otherParticipantIndex] || "Provider";
    };

    const getOtherUserId = (participants: string[]) => {
        if (!currentUser || !participants) return "";
        return participants.find(id => id !== currentUser?.uid) || "";
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return "";
        try {
            const date = timestamp.toDate();
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            return "";
        }
    };

    const renderConversationItem = ({ item }: { item: Conversation }) => {
        const otherUserName = getOtherUserName(item.participants, item.participantNames);
        const otherUserId = getOtherUserId(item.participants);
        const userType = "provider";

        return (
            <TouchableOpacity
                style={styles.messageItem}
                onPress={() => {
                    if (otherUserId) {
                        router.push({
                            pathname: "/chat",
                            params: {
                                conversationId: item.id,
                                otherUserName: otherUserName,
                                otherUserId: otherUserId,
                                userType: userType
                            }
                        });
                    }
                }}
            >
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {otherUserName.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                        </Text>
                    </View>
                    {item.unread && <View style={styles.unreadDot} />}
                </View>
                <View style={styles.messageContent}>
                    <Text style={styles.name}>{otherUserName}</Text>
                    <Text style={styles.messageText}>{item.lastMessage}</Text>
                </View>
                <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8e44ad" />
                    <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Messages</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search conversations..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                />
            </View>

            <FlatList
                data={filteredConversations}
                renderItem={renderConversationItem}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            {searchQuery ? "No conversations found" : "No conversations yet"}
                        </Text>
                        <Text style={styles.emptyStateSubText}>
                            Start a conversation from a provider&#39;s profile
                        </Text>
                    </View>
                }
            />

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
                <TouchableOpacity onPress={() => router.push("/user/account")}>
                    <Ionicons name="person-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4EDFF" },
    header: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: "#F4EDFF",
    },
    backButton: { padding: 5 },
    backButtonText: { fontSize: 20, color: "#4B3C88", fontWeight: "bold" },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4B3C88" },
    placeholder: { width: 30 },
    searchContainer: { paddingHorizontal: 20, marginBottom: 10 },
    searchInput: {
        backgroundColor: "#fff",
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#DDD",
    },
    messagesList: { flex: 1, paddingHorizontal: 15 },
    messageItem: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        backgroundColor: "#fff",
        borderRadius: 15,
        padding: 15,
        marginVertical: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    avatarContainer: { position: "relative" as const, marginRight: 15 },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#BFA2E0",
        justifyContent: "center" as const,
        alignItems: "center" as const,
    },
    avatarText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    unreadDot: {
        position: "absolute" as const,
        top: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#FF6B6B",
        borderWidth: 2,
        borderColor: "#fff",
    },
    messageContent: { flex: 1 },
    name: { fontSize: 16, fontWeight: "bold", color: "#4B3C88", marginBottom: 4 },
    messageText: { fontSize: 14, color: "#666" },
    time: { fontSize: 12, color: "#999" },
    bottomNav: {
        flexDirection: "row" as const,
        justifyContent: "space-around" as const,
        alignItems: "center" as const,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
    },
    emptyState: { padding: 20, alignItems: "center" as const },
    emptyStateText: { color: "#666", fontSize: 16, textAlign: "center" as const },
    emptyStateSubText: { color: "#999", fontSize: 14, textAlign: "center" as const, marginTop: 8 },
    loadingContainer: { flex: 1, justifyContent: "center" as const, alignItems: "center" as const },
    loadingText: { marginTop: 10, color: "#666" },
});