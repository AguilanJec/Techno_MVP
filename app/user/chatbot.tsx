import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    Image,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Safe env loading (EXPO_PUBLIC_ prefix for client-side)
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY missing! Add EXPO_PUBLIC_GEMINI_API_KEY=yourkey to .env.local");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash", // ← THIS FIXES THE 404 ERROR (latest stable model)
    systemInstruction:
        "You are M.A.V.I — a warm, caring Filipino virtual assistant for Hiraya. Reply in natural Taglish with emojis and line breaks. Be kind and helpful.",
});

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    time: string;
}

export default function ChatbotScreen() {
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    // Welcome message on first load
    useEffect(() => {
        setMessages([
            {
                id: "welcome",
                text: "Hi po! I'm Mavi, your friendly Hiraya assistant. Salamat sa pagbisita! How can I help you today?",
                isUser: false,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
        ]);
    }, []);

    // Auto scroll
    useEffect(() => {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, [messages]);

    const getTime = () =>
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const sendMessage = async () => {
        if (!input.trim() || isTyping) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: input.trim(),
            isUser: true,
            time: getTime(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        try {
            // RN-safe: Use sendMessage instead of sendMessageStream (fixes 'pipeThrough' error)
            const chat = model.startChat({
                history: messages
                    .filter((m) => m.id !== "welcome")
                    .map((m) => ({
                        role: m.isUser ? "user" : "model",
                        parts: [{ text: m.text }],
                    })),
            });

            const result = await chat.sendMessage(input);  // ← Non-streaming (fast & reliable in RN)

            const fullResponse = result.response.text();   // ← Get full text at once
            const botMsgId = (Date.now() + 1).toString();

            // Add bot message with delay for "typing" feel
            setTimeout(() => {
                setMessages((prev) => [
                    ...prev,
                    { id: botMsgId, text: fullResponse, isUser: false, time: getTime() },
                ]);
                setIsTyping(false);
            }, 800);  // 800ms delay simulates typing
        } catch (error: any) {
            console.error("Gemini Error:", error);
            setIsTyping(false);
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    text: "Sorry po, may problema sa connection. Pwede po ulitin? 😊",
                    isUser: false,
                    time: getTime(),
                },
            ]);
        }
    };

    const comingSoon = (feature: string) => {
        setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), text: `I want to ${feature}`, isUser: true, time: getTime() },
            {
                id: (Date.now() + 1).toString(),
                text: `${feature} is coming very soon! Excited na kami!`,
                isUser: false,
                time: getTime(),
            },
        ]);
    };

    const renderItem = ({ item }: { item: Message }) => (
        <View style={[styles.messageRow, item.isUser ? styles.userRow : styles.botRow]}>
            {!item.isUser && (
                <Image source={require("../../assets/images/chat-bot.png")} style={styles.avatar} />
            )}
            <View style={[styles.bubble, item.isUser ? styles.userBubble : styles.botBubble]}>
                <Text style={[styles.messageText, item.isUser ? styles.userText : styles.botText]}>
                    {item.text}
                </Text>
                <Text style={[styles.time, item.isUser ? styles.userTime : styles.botTime]}>
                    {item.time}
                </Text>
            </View>
            {item.isUser && <View style={{ width: 40 }} />}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <View style={styles.headerTitle}>
                    <Image source={require("../../assets/images/chat-bot.png")} style={styles.headerAvatar} />
                    <Text style={styles.headerText}>M.A.V.I</Text>
                </View>
                <View style={{ width: 50 }} />
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
            />

            {/* Typing Indicator */}
            {isTyping && (
                <View style={[styles.messageRow, styles.botRow]}>
                    <Image source={require("../../assets/images/chat-bot.png")} style={styles.avatar} />
                    <View style={[styles.bubble, styles.botBubble]}>
                        <ActivityIndicator size="small" color="#999" />
                        <Text style={{ marginLeft: 8, color: "#999" }}>Mavi is typing...</Text>
                    </View>
                </View>
            )}

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
                <Text style={styles.disclaimerText}>
                    M.A.V.I is powered by Google Gemini • May occasionally make mistakes
                </Text>
            </View>

            {/* Input Bar */}
            <View style={styles.inputBar}>
                <TouchableOpacity onPress={() => comingSoon("attach file")} style={styles.icon}>
                    <Ionicons name="attach" size={26} color="#4B3C88" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => comingSoon("send photo")} style={styles.icon}>
                    <Ionicons name="image" size={26} color="#4B3C88" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => comingSoon("voice message")} style={styles.icon}>
                    <Ionicons name="mic" size={26} color="#4B3C88" />
                </TouchableOpacity>

                <TextInput
                    style={styles.textInput}
                    placeholder="Message Mavi..."
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={sendMessage}
                    multiline
                    editable={!isTyping}
                    placeholderTextColor="#888"
                />

                <TouchableOpacity
                    onPress={sendMessage}
                    disabled={!input.trim() || isTyping}
                    style={[styles.sendBtn, (!input.trim() || isTyping) && { opacity: 0.5 }]}
                >
                    <Ionicons name="send" size={22} color="white" />
                </TouchableOpacity>
            </View>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/user/home")}>
                    <Ionicons name="home-outline" size={26} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/bookinglists")}>
                    <Ionicons name="calendar-outline" size={26} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/search")}>
                    <Ionicons name="search-outline" size={26} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/message")}>
                    <Ionicons name="chatbubble-outline" size={30} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/account")}>
                    <Ionicons name="person" size={26} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// Beautiful styles (your original design)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4EDFF" },
    header: {
        backgroundColor: "#b58dde",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 50,
    },
    backBtn: { padding: 4 },
    headerTitle: { flexDirection: "row", alignItems: "center" },
    headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
    headerText: { color: "white", fontSize: 20, fontWeight: "bold" },

    messageRow: { flexDirection: "row", marginVertical: 6, alignItems: "flex-end" },
    botRow: { justifyContent: "flex-start" },
    userRow: { justifyContent: "flex-end" },

    avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },

    bubble: {
        maxWidth: "78%",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
    },
    userBubble: { backgroundColor: "#b58dde", borderBottomRightRadius: 6 },
    botBubble: { backgroundColor: "white", borderBottomLeftRadius: 6, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },

    messageText: { fontSize: 16, lineHeight: 22 },
    userText: { color: "white" },
    botText: { color: "#333" },

    time: { fontSize: 11, marginTop: 4, opacity: 0.7, alignSelf: "flex-end" },
    userTime: { color: "rgba(255,255,255,0.8)" },
    botTime: { color: "#888" },

    disclaimer: { padding: 10, alignItems: "center" },
    disclaimerText: { fontSize: 12, color: "#666", fontStyle: "italic" },

    inputBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        padding: 12,
        borderTopWidth: 1,
        borderColor: "#eee",
    },
    icon: { padding: 8, backgroundColor: "#F4EDFF", borderRadius: 20, marginRight: 8 },
    textInput: {
        flex: 1,
        backgroundColor: "#F4EDFF",
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        maxHeight: 100,
    },
    sendBtn: {
        backgroundColor: "#b58dde",
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },

    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 12,
        backgroundColor: "white",
        borderTopWidth: 1,
        borderColor: "#eee",
    },
});