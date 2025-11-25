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
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    time: string;
    type: "text";
}

export default function ChatbotScreen() {
    const router = useRouter();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            text: "Hi there! I'm Mavi, your virtual assistant. I'm here to guide you and answer any questions you have about Hiraya.",
            isUser: false,
            time: "9:41 AM",
            type: "text",
        },
    ]);

    const [newMessage, setNewMessage] = useState("");
    const flatListRef = useRef<FlatList<any> | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        return () => clearTimeout(timer);
    }, [messages]);

    const timestamp = () =>
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // ENHANCED AI RESPONSE WITH MANY PARENT-FOCUSED PRESETS
    const getAIResponse = (userMessage: string): string => {
        const msg = userMessage.toLowerCase().trim();

        // 2. Thanks / Gratitude - moved up
        if (/\b(thank you|thanks|ty|thank u|gracias|salamat)\b/i.test(msg)) {
            return "You're very welcome! I'm always here whenever you need support. Just ask anytime";
        }

        // 3. Special Needs & Disabilities
        if (/\b(special needs|special child|autism|asd|adhd|down syndrome|developmental delay|speech delay|sensory|disability|inclusive|handle special)\b/i.test(msg)) {
            return "Every child is unique and deserves the best support. Hiraya is fully committed to helping families with children who have special needs.\n\nHere's how we can help:\n\n• Trained caregivers experienced in autism, ADHD, Down syndrome, sensory processing, and more\n• One-on-one consultations with child development specialists\n• Inclusive childcare with low ratios & sensory-friendly spaces\n• Personalized care plans and therapy recommendations\n• Parent support groups & workshops\n• Home activity guides and visual schedules\n\nYou're doing an amazing job. Would you like to book a free consultation or get specific resources for your child?";
        }

        // 4. Tantrums / Meltdowns
        if (/\b(tantrum|meltdown|crying|screaming|angry|out of control|throwing things|hitting)\b/i.test(msg)) {
            return "Tantrums are tough, but very normal! Here are quick tips:\n\n• Stay calm — your calm helps them calm\n• Name their feeling: 'I see you're really upset because…'\n• Offer a safe space or hug (if they want it)\n• Use a calm-down corner with soft toys or fidget items\n• After they calm: talk about feelings and better choices\n\nWe also have a free 'Calm Down Kit' PDF in the Resources section. Want me to send you the link?";
        }

        // 5. Biting / Hitting / Aggressive Behavior - more specific
        if (/\b(bite|biting|hitting|hit|aggressive|hurts others|push|kick)\b/i.test(msg)) {
            return "This behavior is usually about big feelings or wanting attention.\n\nWhat helps:\n• Stay calm & stop the action safely\n• Say: 'We don't hit. Hands are for helping.'\n• Teach words: 'You're angry. Say: I'm mad!'\n• Give positive attention for gentle hands\n• Short time-in (hug & breathe together)\n\nWe run monthly workshops on Positive Discipline. Want to join the next one?";
        }

        // 6. Screen Time / Too Much Gadget
        if (/\b(screen time|ipad|phone|tablet|addicted to gadget|too much youtube)\b/i.test(msg)) {
            return "Many parents worry about screen time — you're not alone!\n\nHealthy limits:\n• Under 2 years: almost none (except video calls)\n• 2–5 years: max 1 hour/day with parent\n• 5+: consistent rules + balanced activities\n\nTry these instead:\n• Outdoor playdates\n• Art & crafts\n• Reading together\n• Sensory bins (rice, water beads)\n\nWe have a 7-Day Screen Detox Challenge for families! Shall I guide you to it?";
        }

        // 7. Sleep Problems
        if (/\b(sleep|bedtime|won't sleep|night waking|nightmare|afraid of dark)\b/i.test(msg)) {
            return "Sleep struggles are so common! Here are proven tips:\n\n• Consistent bedtime routine (bath → book → bed)\n• No screens 1 hour before bed\n• Dim lights & white noise\n• Comfort item (blanket, stuffed toy)\n• Reward chart for staying in bed\n\nWe offer a free Sleep Guide for ages 1–10 in the Resources tab. Would you like it?";
        }

        // 8. Picky Eating / Won't Eat Vegetables
        if (/\b(picky eater|won't eat|vegetable|food|refuse to eat|only eats junk)\b/i.test(msg)) {
            return "Picky eating is super common up to age 7!\n\nTips that work:\n• Offer new food 10–15 times (no pressure)\n• Make food fun (smiley faces, colorful plates)\n• Let them help cook\n• Eat together as family — no separate meals\n• One-bite rule (just try one small bite)\n\nWe have a 'Fun with Food' e-book with recipes kids love. Want it?";
        }

        // 9. School Readiness / Separation Anxiety
        if (/\b(school|big school|kindergarten|afraid to go|separation anxiety|cry when leave)\b/i.test(msg)) {
            return "Starting school is a big milestone!\n\nTo help:\n• Visit the school together beforehand\n• Practice short goodbyes\n• Create a goodbye ritual (special hug + kiss)\n• Photo of family in their bag\n• Read books like 'The Kissing Hand'\n\nWe have a School Readiness Checklist & Storybooks in the app. Shall I show you?";
        }

        // 10. Potty Training
        if (/\b(potty training|toilet|diaper|pee|poop|accident)\b/i.test(msg)) {
            return "Ready for potty training?\n\nSigns of readiness:\n• Stays dry for 2+ hours\n• Tells you when diaper is wet/dirty\n• Can pull pants up/down\n\nTips:\n• Use fun underwear with favorite characters\n• Reward chart with stickers\n• No punishment for accidents\n• Celebrate every success!\n\nWe have a free Potty Training Guide + Reward Chart printable. Want it?";
        }

        // 11. Sibling Fighting / Jealousy
        if (/\b(sibling|fighting|jealous|new baby|brother|sister|rivals)\b/i.test(msg)) {
            return "Sibling rivalry is normal, but peaceful homes are possible!\n\nTry:\n• Special 1-on-1 time with each child\n• No comparison ('You're smarter' → hurts feelings)\n• Teach conflict words: 'Please stop, I don't like that'\n• Family meetings to solve problems together\n\nWe have a 'Peaceful Siblings' workshop every month. Interested?";
        }

        // 12. General Parenting Support
        if (/\b(tired|exhausted|overwhelmed|mom guilt|hard|struggling|need help)\b/i.test(msg)) {
            return "Parenting is the hardest, most important job — and it's okay to feel tired sometimes. You are doing better than you think.\n\nTake a deep breath. You've got this.\n\nWe have a free Parent Support Community where moms & dads share tips and encouragement daily. Would you like to join? Or would you like a list of self-care ideas for busy parents?";
        }

        // 13. Services Overview
        if (/\b(service|what do you offer|hiraya|what is hiraya)\b/i.test(msg)) {
            return "Hiraya offers loving support for every family:\n\n• Trusted childcare & babysitting\n• Special needs & inclusive care\n• Parenting workshops & support groups\n• Child development consultations\n• Emergency & last-minute care\n• Fun holiday programs\n\nWhich service interests you most?";
        }

        // 14. Booking Childcare
        if (/\b(book|childcare|babysitter|care|need sitter)\b/i.test(msg)) {
            return "I can help you book trusted childcare in seconds!\n\nJust go to the 'Booking' tab, choose date/time, and select the type of care you need (regular, special needs, overnight, etc.).\n\nNeed help choosing the right caregiver? Tell me your child's age and needs — I'll recommend the best matches!";
        }

        // 1. Greetings - moved to LAST with more specific pattern
        if (/^(hello|hi|hey|good morning|good afternoon|good evening)$/i.test(msg)) {
            return "Hello! I'm Mavi, your virtual assistant. How can I help you today?";
        }

        // Default Fallback
        return `I understand you're asking about "${userMessage}". I'm here to help with parenting tips, special needs support, booking childcare, emotional help, and more. Could you tell me a bit more so I can assist you better?`;
    };

    const sendMessage = () => {
        if (newMessage.trim() === "") return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: newMessage.trim(),
            isUser: true,
            time: timestamp(),
            type: "text",
        };
        setMessages((prev) => [...prev, userMsg]);
        setNewMessage("");

        // Simulate AI typing + response
        const timer = setTimeout(() => {
            const aiResponse = getAIResponse(newMessage);
            const reply: Message = {
                id: Date.now().toString() + "-bot",
                text: aiResponse,
                isUser: false,
                time: timestamp(),
                type: "text",
            };
            setMessages((prev) => [...prev, reply]);
        }, 800);

        return () => clearTimeout(timer);
    };

    // Coming soon feature handlers
    const handleComingSoonFeature = (featureType: string) => {
        const userMsg: Message = {
            id: Date.now().toString(),
            text: `I want to use ${featureType}`,
            isUser: true,
            time: timestamp(),
            type: "text",
        };
        setMessages((prev) => [...prev, userMsg]);

        // AI response about coming soon feature
        setTimeout(() => {
            const reply: Message = {
                id: Date.now().toString() + "-bot",
                text: `🎉 **${featureType.toUpperCase()}** 🎉\n\nThis exciting feature is coming soon! Our team is working hard to bring you:\n\n• ${featureType} capabilities\n• Enhanced user experience\n• More ways to connect and share\n\nStay tuned for updates! We'll notify you as soon as it's available.`,
                isUser: false,
                time: timestamp(),
                type: "text",
            };
            setMessages((prev) => [...prev, reply]);
        }, 800);
    };

    const pickImage = () => handleComingSoonFeature("image sharing");
    const pickFile = () => handleComingSoonFeature("file attachment");
    const startRecording = () => handleComingSoonFeature("voice messages");

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[styles.messageRow, item.isUser ? styles.userRow : styles.otherRow]}>
            {!item.isUser && (
                <Image
                    source={require("../assets/images/chat-bot.png")}
                    style={styles.chatbotMessageImage}
                />
            )}

            <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.otherBubble]}>
                {/* Text */}
                <Text style={[styles.messageText, item.isUser ? styles.userMessageText : styles.otherMessageText]}>
                    {item.text}
                </Text>

                <Text style={[styles.messageTime, item.isUser ? styles.userMessageTime : styles.otherMessageTime]}>
                    {item.time}
                </Text>
            </View>

            {item.isUser && <View style={styles.chatbotImagePlaceholder} />}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/user/home")} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={26} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Image source={require("../assets/images/chat-bot.png")} style={styles.chatbotImage} />
                    <Text style={styles.headerTitle}>M.A.V.I</Text>
                </View>
                <View style={{ width: 30 }} />
            </View>

            {/* MESSAGES */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
            />

            {/* DISCLAIMER */}
            <View style={styles.disclaimerContainer}>
                <Text style={styles.disclaimerText}>M.A.V.I can make mistakes. Check important information.</Text>
            </View>

            {/* INPUT BAR */}
            <View style={styles.inputContainer}>
                <TouchableOpacity onPress={pickFile} style={styles.iconButton}>
                    <Ionicons name="attach" size={24} color="#4B3C88" />
                </TouchableOpacity>

                <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
                    <Ionicons name="image" size={24} color="#4B3C88" />
                </TouchableOpacity>

                <TouchableOpacity onPress={startRecording} style={styles.iconButton}>
                    <Ionicons name="mic" size={24} color="#4B3C88" />
                </TouchableOpacity>

                <TextInput
                    style={styles.textInput}
                    placeholder="Write a message..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholderTextColor="#888"
                    multiline
                    onSubmitEditing={sendMessage}
                />

                <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* BOTTOM NAV */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push("/user/home")}><Ionicons name="home-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/bookinglists")}><Ionicons name="calendar-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/search")}><Ionicons name="search-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/message")}><Ionicons name="chatbubble-outline" size={24} color="#8e44ad" /></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/user/account")}><Ionicons name="person" size={24} color="#8e44ad" /></TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// ────────────── CLEANED STYLES ──────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4EDFF" },
    header: {
        backgroundColor: "#b58dde",
        paddingTop: 14,
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    backBtn: { padding: 4 },
    headerTitleContainer: { flexDirection: "row", alignItems: "center" },
    chatbotImage: { width: 32, height: 32, marginRight: 8, borderRadius: 16 },
    headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },

    messagesList: { flex: 1 },
    messagesContainer: { padding: 16, paddingBottom: 10 },

    messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 6 },
    userRow: { justifyContent: 'flex-end' },
    otherRow: { justifyContent: 'flex-start' },

    chatbotMessageImage: { width: 32, height: 32, borderRadius: 16, marginRight: 8, marginBottom: 12 },
    chatbotImagePlaceholder: { width: 32, height: 32, marginLeft: 8 },

    messageBubble: { maxWidth: "80%", padding: 12, borderRadius: 18 },
    userBubble: { backgroundColor: "#b58dde", borderBottomRightRadius: 5 },
    otherBubble: { backgroundColor: "#fff", borderBottomLeftRadius: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },

    messageText: { fontSize: 16, lineHeight: 22 },
    userMessageText: { color: "#fff" },
    otherMessageText: { color: "#333" },

    messageTime: { fontSize: 10, marginTop: 6, alignSelf: "flex-end" },
    userMessageTime: { color: "rgba(255,255,255,0.7)" },
    otherMessageTime: { color: "#666" },

    disclaimerContainer: { paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" },
    disclaimerText: { fontSize: 12, color: "#666", textAlign: "center", fontStyle: "italic" },

    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: "#DDD",
    },
    iconButton: { marginRight: 10, padding: 8, backgroundColor: "#F4EDFF", borderRadius: 20 },
    textInput: {
        flex: 1,
        backgroundColor: "#F4EDFF",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
        fontSize: 16,
        color: "#333",
    },
    sendBtn: {
        backgroundColor: "#b58dde",
        width: 45,
        height: 45,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
    },

    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff",
    },
});