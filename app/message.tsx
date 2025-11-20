import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    Modal,
    ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs, onSnapshot, orderBy, addDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getAuth } from "firebase/auth";

interface Provider {
    id: string;
    name: string;
    bio?: string;
    distance?: string;
    rate?: string;
    rating?: number;
    type?: string;
    skills?: string[];
}

interface Conversation {
    id: string;
    participants: string[];
    participantNames: string[];
    lastMessage: string;
    lastMessageTime: any;
    unread: boolean;
    lastMessageSender: string;
}

export default function MessageScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [contactsLoading, setContactsLoading] = useState(false);

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
            setCurrentUser(user);
            fetchProviders();
            setupConversationsListener(user.uid);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchProviders = async () => {
        try {
            setContactsLoading(true);
            const providersQuery = query(collection(db, "providers"));
            const querySnapshot = await getDocs(providersQuery);
            const providersData: Provider[] = [];

            querySnapshot.forEach((doc) => {
                const providerData = doc.data();
                if (providerData.name) {
                    providersData.push({
                        id: doc.id,
                        name: providerData.name,
                        bio: providerData.bio,
                        distance: providerData.distance,
                        rate: providerData.rate,
                        rating: providerData.rating,
                        type: providerData.type,
                        skills: providerData.skills
                    } as Provider);
                }
            });

            setProviders(providersData);
            setContactsLoading(false);
        } catch (error) {
            console.error("Error fetching providers:", error);
            setContactsLoading(false);
        }
    };

    const setupConversationsListener = (currentUserId: string) => {
        try {
            const conversationsQuery = query(
                collection(db, "conversations"),
                where("participants", "array-contains", currentUserId),
                orderBy("lastMessageTime", "desc")
            );

            const unsubscribe = onSnapshot(conversationsQuery,
                (snapshot) => {
                    const conversationsData: Conversation[] = [];

                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        conversationsData.push({
                            id: doc.id,
                            participants: data.participants || [],
                            participantNames: data.participantNames || [],
                            lastMessage: data.lastMessage || "No messages yet",
                            lastMessageTime: data.lastMessageTime,
                            unread: data.unread || false,
                            lastMessageSender: data.lastMessageSender || ""
                        } as Conversation);
                    });

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

    const startConversation = async (providerId: string, providerName: string) => {
        if (!currentUser) return;

        try {
            const existingConvQuery = query(
                collection(db, "conversations"),
                where("participants", "array-contains", currentUser.uid)
            );

            const querySnapshot = await getDocs(existingConvQuery);
            let existingConversation: Conversation | null = null;

            querySnapshot.forEach((doc) => {
                const conversation = doc.data() as Conversation;
                if (conversation.participants.includes(providerId)) {
                    // @ts-ignore
                    existingConversation = { id: doc.id, ...conversation };
                }
            });

            if (existingConversation) {
                // @ts-ignore
                router.push(`/chat?conversationId=${existingConversation.id}&providerName=${encodeURIComponent(providerName)}&providerId=${providerId}`);
            } else {
                const newConversation = {
                    participants: [currentUser.uid, providerId],
                    participantNames: [currentUser.displayName || "User", providerName],
                    lastMessage: "Conversation started",
                    lastMessageTime: new Date(),
                    unread: false,
                    lastMessageSender: currentUser.uid
                };

                const docRef = await addDoc(collection(db, "conversations"), newConversation);
                router.push(`/chat?conversationId=${docRef.id}&providerName=${encodeURIComponent(providerName)}&providerId=${providerId}`);
            }

            setModalVisible(false);
            setSearchQuery("");
        } catch (error) {
            console.error("Error starting conversation:", error);
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

    const filteredProviders = providers.filter(provider =>
        provider.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getProviderName = (participants: string[], participantNames: string[]) => {
        if (!currentUser || !participants) return "Unknown Provider";

        const otherParticipantIndex = participants.findIndex(id => id !== currentUser.uid);
        return participantNames[otherParticipantIndex] || "Unknown Provider";
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
        const providerName = getProviderName(item.participants, item.participantNames);

        return (
            <TouchableOpacity
                style={styles.messageItem}
                onPress={() => {
                    const providerId = item.participants.find(id => id !== currentUser?.uid);
                    router.push(`/chat?conversationId=${item.id}&providerName=${encodeURIComponent(providerName)}&providerId=${providerId}`);
                }}
            >
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {providerName.split(" ").map((n: string) => n[0]).join("")}
                        </Text>
                    </View>
                    {item.unread && <View style={styles.unreadDot} />}
                </View>
                <View style={styles.messageContent}>
                    <Text style={styles.name}>{providerName}</Text>
                    <Text style={styles.messageText}>{item.lastMessage}</Text>
                </View>
                <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
            </TouchableOpacity>
        );
    };

    const renderProviderItem = ({ item }: { item: Provider }) => (
        <TouchableOpacity
            style={styles.contactItem}
            onPress={() => startConversation(item.id, item.name)}
        >
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {item.name.split(" ").map((n: string) => n[0]).join("")}
                </Text>
            </View>
            <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.userType}>{item.type || "Tutor"}</Text>
                {item.skills && item.skills.length > 0 && (
                    <Text style={styles.skills} numberOfLines={1}>
                        {item.skills.slice(0, 2).join(", ")}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );

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

            <Text style={styles.currentTime}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search messages..."
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
                            Start a new conversation by tapping &#34;Write a message&#34;
                        </Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={styles.writeButton}
                onPress={() => {
                    setSearchQuery("");
                    setModalVisible(true);
                }}
            >
                <Text style={styles.writeButtonText}>Write a message</Text>
            </TouchableOpacity>

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

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Message</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.modalSearchInput}
                            placeholder="Search tutors..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus={true}
                        />

                        {contactsLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#8e44ad" />
                                <Text>Loading tutors...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredProviders}
                                renderItem={renderProviderItem}
                                keyExtractor={(item) => item.id}
                                style={styles.contactsList}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyStateText}>
                                            {searchQuery ? "No tutors found" : "No tutors available"}
                                        </Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4EDFF" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: "#F4EDFF",
    },
    backButton: { padding: 5 },
    backButtonText: { fontSize: 20, color: "#4B3C88", fontWeight: "bold" },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4B3C88" },
    placeholder: { width: 30 },
    currentTime: { textAlign: "center", fontSize: 16, color: "#666", marginVertical: 10 },
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
        flexDirection: "row",
        alignItems: "center",
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
    avatarContainer: { position: "relative", marginRight: 15 },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#BFA2E0",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    unreadDot: {
        position: "absolute",
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
    writeButton: {
        backgroundColor: "#BFA2E0",
        margin: 20,
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    writeButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
    },
    modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    modalTitle: { fontSize: 18, fontWeight: "bold", color: "#4B3C88" },
    closeButton: { fontSize: 20, color: "#666" },
    modalSearchInput: {
        backgroundColor: "#F4EDFF",
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 15,
    },
    contactsList: { maxHeight: 300 },
    contactItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    contactInfo: { marginLeft: 15, flex: 1 },
    contactName: { fontSize: 16, color: "#333", fontWeight: "500" },
    userType: { fontSize: 14, color: "#666", textTransform: "capitalize", marginTop: 2 },
    skills: { fontSize: 12, color: "#999", marginTop: 2 },
    emptyState: { padding: 20, alignItems: "center" },
    emptyStateText: { color: "#666", fontSize: 16, textAlign: "center" },
    emptyStateSubText: { color: "#999", fontSize: 14, textAlign: "center", marginTop: 8 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 10, color: "#666" },
});