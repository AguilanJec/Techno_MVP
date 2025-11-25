import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    ActivityIndicator,
    Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    getDoc,
    doc as firestoreDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";

interface Conversation {
    id: string;
    participants: string[];
    participantNames: string[];
    lastMessage: string;
    lastMessageTime: any;
    unread: boolean;
    lastMessageSender: string;
    otherUserId?: string;
    otherUserName?: string;
    otherUserPicture?: string | null; // data URI or remote URL
}

interface UserData {
    name?: string;
    email?: string;
    phone?: string;
    picture?: string;
}

export default function MessageScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // small cache to avoid repeated reads
    const userCacheRef = React.useRef<Record<string, { name?: string; picture?: string | null }>>({});

    useEffect(() => {
        const auth = getAuth();
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
                setupConversationsListener(user.uid);
            } else {
                setCurrentUser(null);
                setConversations([]);
                setLoading(false);
            }
        });

        return () => unsub();
    }, []);

    // sanitize picture string stored in Firestore (base64, data:..., url(...), raw base64)
    const sanitizePictureUri = useCallback((raw?: string | null) => {
        if (!raw) return null;
        let s = raw.trim();

        // unwrap url(...) wrappers and surrounding quotes
        const urlMatch = s.match(/^url\(["']?(.*?)["']?\)$/i);
        if (urlMatch && urlMatch[1]) s = urlMatch[1];

        // if it's an http(s) url, return as is
        if (/^https?:\/\//i.test(s)) return s;

        // if it's already a data URI (data:image/...), return as is
        if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(s)) return s;

        // sometimes firestore might have "data:imag..." truncated - try to repair if possible
        if (/^data:imag[e]*/i.test(s) && s.includes("base64,")) {
            return s.replace(/^data:imag/, "data:image");
        }

        // raw base64 detection: JPEG header often starts with '/9j/' in base64, png has 'iVBOR'
        if (/^(\/9j\/|iVBOR|R0lGOD)/.test(s)) {
            return `data:image/jpeg;base64,${s}`;
        }

        // if it contains only base64 chars and is long, assume base64 jpeg
        if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 100) {
            return `data:image/jpeg;base64,${s}`;
        }

        return null;
    }, []);

    // Try providers first (your picture field is in providers collection),
    // then fallback to users collection.
    const fetchUserDocWithFallback = useCallback(
        async (id: string) => {
            // consult cache first
            const cache = userCacheRef.current[id];
            if (cache) return cache;

            try {
                // try providers collection first (since picture field lives there)
                const pDoc = await getDoc(firestoreDoc(db, "providers", id));
                if (pDoc.exists()) {
                    const pd = pDoc.data() as UserData;
                    const name = pd?.name || pd?.email || "Provider";
                    const picture = sanitizePictureUri(pd?.picture ?? null);
                    const result = { name, picture: picture ?? null };
                    userCacheRef.current[id] = result;
                    return result;
                }

                // then try users collection
                const uDoc = await getDoc(firestoreDoc(db, "users", id));
                if (uDoc.exists()) {
                    const d = uDoc.data() as UserData;
                    const name = d?.name || d?.email || "Customer";
                    const picture = sanitizePictureUri(d?.picture ?? null);
                    const result = { name, picture: picture ?? null };
                    userCacheRef.current[id] = result;
                    return result;
                }

                // not found
                const fallback = { name: "Customer", picture: null };
                userCacheRef.current[id] = fallback;
                return fallback;
            } catch (err) {
                console.error("fetchUserDocWithFallback error:", err);
                const fallback = { name: "Customer", picture: null };
                userCacheRef.current[id] = fallback;
                return fallback;
            }
        },
        [sanitizePictureUri]
    );

    const setupConversationsListener = async (currentUserId: string) => {
        setLoading(true);

        try {
            const conversationsQuery = query(
                collection(db, "conversations"),
                where("participants", "array-contains", currentUserId),
                orderBy("lastMessageTime", "desc")
            );

            const unsubscribe = onSnapshot(
                conversationsQuery,
                async (snapshot) => {
                    const convs: Conversation[] = [];

                    const fetchPromises = snapshot.docs.map(async (docSnap) => {
                        const data = docSnap.data();
                        const participants: string[] = data.participants || [];
                        const otherUserId = participants.find((id: string) => id !== currentUserId) || "";

                        let otherUserName = "Provider";
                        let otherUserPicture: string | null = null;

                        if (otherUserId) {
                            const u = await fetchUserDocWithFallback(otherUserId);
                            otherUserName = u.name || otherUserName;
                            otherUserPicture = u.picture ?? null;
                        }

                        return {
                            id: docSnap.id,
                            participants,
                            participantNames: [currentUser?.displayName || "User", otherUserName],
                            lastMessage: data.lastMessage || "No messages yet",
                            lastMessageTime: data.lastMessageTime,
                            unread: data.unread || false,
                            lastMessageSender: data.lastMessageSender || "",
                            otherUserId,
                            otherUserName,
                            otherUserPicture,
                        } as Conversation;
                    });

                    const results = await Promise.all(fetchPromises);
                    convs.push(...results);

                    setConversations(convs);
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

    const filteredConversations = conversations.filter((conversation) => {
        if (!searchQuery) return true;

        const otherParticipantName = conversation.otherUserName || conversation.participantNames[1] || "";

        return (
            otherParticipantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (conversation.lastMessage || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const formatTime = (timestamp: any) => {
        if (!timestamp) return "";
        try {
            const date = timestamp.toDate();
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch (error) {
            return "";
        }
    };

    const renderConversationItem = ({ item }: { item: Conversation }) => {
        const otherUserName = item.otherUserName || item.participantNames[1] || "Customer";
        const otherUserId = item.otherUserId || "";
        const pictureUri = item.otherUserPicture ?? null;

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
                                otherUserId,
                                userType: "provider", // other participant is provider
                            },
                        });
                    }
                }}
            >
                <View style={styles.avatarContainer}>
                    {pictureUri ? (
                        <Image
                            source={{ uri: pictureUri }}
                            style={styles.avatarImage}
                            onError={(e) => {
                                console.warn("Avatar image failed to load:", e.nativeEvent);
                            }}
                        />
                    ) : (
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {otherUserName
                                    .split(" ")
                                    .map((n) => n[0] || "")
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                            </Text>
                        </View>
                    )}
                    {item.unread && <View style={styles.unreadDot} />}
                </View>

                <View style={styles.messageContent}>
                    <Text style={styles.name}>{otherUserName}</Text>
                    <Text style={styles.messageText} numberOfLines={1}>
                        {item.lastMessage}
                    </Text>
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
                            Start a conversation from a provider's profile
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
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#eee",
    },
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
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
    },
    emptyState: { padding: 20, alignItems: "center" },
    emptyStateText: { color: "#666", fontSize: 16, textAlign: "center" },
    emptyStateSubText: { color: "#999", fontSize: 14, textAlign: "center", marginTop: 8 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 10, color: "#666" },
});
