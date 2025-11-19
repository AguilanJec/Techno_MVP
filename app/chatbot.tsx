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
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    time: string;
    type: "text" | "image" | "voice" | "file";
    imageUri?: string;
    voiceUri?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileUri?: string;
    duration?: number;
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
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const flatListRef = useRef<FlatList<any> | null>(null);

    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    useEffect(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const timestamp = () =>
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // AI Response Logic
    const getAIResponse = (userMessage: string): string => {
        const message = userMessage.toLowerCase().trim();

        // Greetings
        if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
            return "Hello! I'm Mavi, your virtual assistant. How can I help you today?";
        }

        // Thanks
        if (message.includes('thank') || message.includes('thanks') || message.includes('ty') || message.includes('cool')) {
            return "You're welcome! I'm always here to help. Just type your question anytime.";
        }

        // What can you do
        if (message.includes('what can you do') || message.includes('what can u do') || message.includes('capabilities')) {
            return "I can provide information about our services, assist you with navigation in the app, and help you find the support you need quickly.";
        }

        // Example request
        if (message.includes('example') || message.includes('give me an example') || message.includes('show me')) {
            return "Of course! ❌ You can ask me things like:\n\n- \"What services does Hiraya offer?\"\n- \"How can I book childcare support?\"\n- \"Where can I find safety guidelines?\"";
        }

        // Services
        if (message.includes('service') || message.includes('what does hiraya offer') || message.includes('offer')) {
            return "Hiraya offers various services including childcare support, educational resources, family counseling, and community programs. Would you like to know more about any specific service?";
        }

        // Booking childcare
        if (message.includes('book') || message.includes('childcare') || message.includes('child care')) {
            return "To book childcare support, you can go to the Booking section in the app, select your preferred date and time, and choose the type of care needed. Would you like me to guide you through the process?";
        }

        // Safety guidelines
        if (message.includes('safety') || message.includes('guideline') || message.includes('safe')) {
            return "You can find our complete safety guidelines in the 'Resources' section of the app. We prioritize the safety and well-being of all children and families in our community.";
        }

        // Help
        if (message.includes('help') || message.includes('support') || message.includes('assist')) {
            return "I can help you with:\n- Information about our services\n- Booking childcare support\n- Finding resources and guidelines\n- Navigating the app\n\nWhat do you need help with?";
        }

        // Default response
        return "I understand you're asking about \"" + userMessage + "\". I'm here to help with information about Hiraya's services, booking childcare support, safety guidelines, and more. Could you please rephrase your question or ask about our specific services?";
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

        // AI response
        setTimeout(() => {
            const aiResponse = getAIResponse(newMessage);
            const reply: Message = {
                id: Date.now().toString() + "-bot",
                text: aiResponse,
                isUser: false,
                time: timestamp(),
                type: "text",
            };
            setMessages((prev) => [...prev, reply]);
        }, 1000);
    };

    // Pick image from library
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert("Permission required", "Sorry, we need camera roll permissions to make this work!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        // @ts-ignore
        if (!result.canceled && result.assets && result.assets[0]) {
            const uri = result.assets[0].uri;
            const newMsg: Message = {
                id: Date.now().toString(),
                text: "Here's a photo",
                isUser: true,
                time: timestamp(),
                type: "image",
                imageUri: uri,
            };
            setMessages((prev) => [...prev, newMsg]);
        }
    };

    // File picker - Now functional!
    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*', // All file types
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled) {
                return; // User canceled the picker
            }

            const file = result.assets[0];

            if (file) {
                const fileSizeInKB = Math.round((file.size || 0) / 1024);
                const fileType = file.mimeType || 'Unknown type';

                const newMsg: Message = {
                    id: Date.now().toString(),
                    text: "Attached a file",
                    isUser: true,
                    time: timestamp(),
                    type: "file",
                    fileName: file.name,
                    fileSize: fileSizeInKB,
                    fileType: fileType,
                    fileUri: file.uri,
                };
                setMessages((prev) => [...prev, newMsg]);

                // Show file info to user
                Alert.alert(
                    "File Attached",
                    `File: ${file.name}\nSize: ${fileSizeInKB} KB\nType: ${fileType}`,
                    [{ text: "OK" }]
                );
            }
        } catch (error) {
            console.error("Error picking file:", error);
            Alert.alert("Error", "Failed to pick file. Please try again.");
        }
    };

    // Start voice recording
    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (!permission.granted) {
                Alert.alert("Permission required", "Please grant microphone permission to record voice messages.");
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            setRecordingDuration(0);

            // @ts-ignore
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Failed to start recording", err);
            Alert.alert("Error", "Failed to start recording");
        }
    };

    // Stop recording and add voice message
    const stopRecording = async () => {
        if (!recording) return;

        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);

        if (uri) {
            const newMsg: Message = {
                id: Date.now().toString(),
                text: "Voice message",
                isUser: true,
                time: timestamp(),
                type: "voice",
                voiceUri: uri,
                duration: recordingDuration,
            };
            setMessages((prev) => [...prev, newMsg]);
            setRecordingDuration(0);
        }
    };

    // Play audio
    const playSound = async (uri: string) => {
        try {
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
            }
            const { sound: created } = await Audio.Sound.createAsync({ uri });
            setSound(created);
            await created.playAsync();
        } catch (err) {
            console.error("Error playing sound", err);
        }
    };

    // Get file icon based on file type
    const getFileIcon = (fileType?: string) => {
        if (!fileType) return "document";

        if (fileType.includes('pdf')) return "document-text";
        if (fileType.includes('word') || fileType.includes('document')) return "document-text";
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return "document";
        if (fileType.includes('image')) return "image";
        if (fileType.includes('video')) return "videocam";
        if (fileType.includes('audio')) return "musical-notes";
        if (fileType.includes('zip') || fileType.includes('compressed')) return "archive";

        return "document";
    };

    // Format file size
    const formatFileSize = (sizeInKB?: number) => {
        if (!sizeInKB) return "Unknown size";
        if (sizeInKB < 1024) return `${sizeInKB} KB`;
        return `${(sizeInKB / 1024).toFixed(1)} MB`;
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[styles.messageRow, item.isUser ? styles.userRow : styles.otherRow]}>
            {/* Chatbot image for bot messages */}
            {!item.isUser && (
                <Image
                    source={require("../assets/images/chat-bot.png")}
                    style={styles.chatbotMessageImage}
                />
            )}

            <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.otherBubble]}>
                {/* File */}
                {item.type === "file" && (
                    <TouchableOpacity
                        style={styles.fileMessage}
                        onPress={() => {
                            if (item.fileUri) {
                                Alert.alert(
                                    "File Information",
                                    `File: ${item.fileName}\nSize: ${formatFileSize(item.fileSize)}\nType: ${item.fileType || 'Unknown'}`,
                                    [{ text: "OK" }]
                                );
                            }
                        }}
                    >
                        <Ionicons
                            name={getFileIcon(item.fileType) as any}
                            size={32}
                            color={item.isUser ? "#fff" : "#4B3C88"}
                        />
                        <View style={styles.fileInfo}>
                            <Text style={[styles.fileName, item.isUser ? styles.userFileText : styles.otherFileText]}>
                                {item.fileName || "Unknown file"}
                            </Text>
                            <Text style={[styles.fileDetails, item.isUser ? styles.userFileText : styles.otherFileText]}>
                                {formatFileSize(item.fileSize)} • {item.fileType || 'File'}
                            </Text>
                            {item.text && (
                                <Text style={[styles.fileText, item.isUser ? styles.userFileText : styles.otherFileText]}>
                                    {item.text}
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                {/* Image */}
                {item.type === "image" && item.imageUri && (
                    <View style={styles.imageMessage}>
                        <Image source={{ uri: item.imageUri }} style={styles.messageImage} />
                        {item.text ? (
                            <Text style={[styles.imageCaption, item.isUser ? styles.userImageCaption : styles.otherImageCaption]}>
                                {item.text}
                            </Text>
                        ) : null}
                    </View>
                )}

                {/* Voice */}
                {item.type === "voice" && (
                    <TouchableOpacity
                        style={[styles.voiceMessage, item.isUser ? styles.userVoiceMessage : styles.otherVoiceMessage]}
                        onPress={() => item.voiceUri && playSound(item.voiceUri)}
                    >
                        {item.isUser ? (
                            <>
                                <Text style={styles.voiceDuration}>{item.duration ?? 0}s</Text>
                                <View style={styles.voiceWaveform}>
                                    <View style={[styles.voiceBar, { height: 8 }]} />
                                    <View style={[styles.voiceBar, { height: 12 }]} />
                                    <View style={[styles.voiceBar, { height: 16 }]} />
                                    <View style={[styles.voiceBar, { height: 12 }]} />
                                    <View style={[styles.voiceBar, { height: 8 }]} />
                                </View>
                                <Ionicons name="mic" size={20} color="#fff" />
                            </>
                        ) : (
                            <>
                                <Ionicons name="mic" size={20} color="#4B3C88" />
                                <View style={styles.voiceWaveform}>
                                    <View style={[styles.voiceBar, { height: 8 }]} />
                                    <View style={[styles.voiceBar, { height: 12 }]} />
                                    <View style={[styles.voiceBar, { height: 16 }]} />
                                    <View style={[styles.voiceBar, { height: 12 }]} />
                                    <View style={[styles.voiceBar, { height: 8 }]} />
                                </View>
                                <Text style={styles.voiceDuration}>{item.duration ?? 0}s</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {/* Text */}
                {item.type === "text" && <Text style={[styles.messageText, item.isUser ? styles.userMessageText : styles.otherMessageText]}>{item.text}</Text>}

                <Text style={[styles.messageTime, item.isUser ? styles.userMessageTime : styles.otherMessageTime]}>{item.time}</Text>
            </View>

            {/* Empty space for user messages to maintain alignment */}
            {item.isUser && <View style={styles.chatbotImagePlaceholder} />}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/home")} style={styles.backBtn}>
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
                style={styles.messagesList}
            />

            {/* DISCLAIMER */}
            <View style={styles.disclaimerContainer}>
                <Text style={styles.disclaimerText}>M.A.V.I can make mistakes. Check important information.</Text>
            </View>

            {/* RECORDING INDICATOR */}
            {isRecording && (
                <View style={styles.recordingIndicator}>
                    <Ionicons name="mic" size={16} color="#fff" />
                    <Text style={styles.recordingText}>Recording... {recordingDuration}s</Text>
                    <View style={styles.recordingDot} />
                </View>
            )}

            {/* INPUT */}
            <View style={styles.inputContainer}>
                <TouchableOpacity onPress={pickFile} style={styles.iconButton}>
                    <Ionicons name="attach" size={24} color="#4B3C88" />
                </TouchableOpacity>

                <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
                    <Ionicons name="image" size={24} color="#4B3C88" />
                </TouchableOpacity>

                <TouchableOpacity onPress={isRecording ? stopRecording : startRecording} style={[styles.iconButton, isRecording && styles.recordingButton]}>
                    <Ionicons name={isRecording ? "stop-circle" : "mic"} size={24} color={isRecording ? "#FF6B6B" : "#4B3C88"} />
                </TouchableOpacity>

                <TextInput
                    style={styles.textInput}
                    placeholder="Write a message..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholderTextColor="#888"
                    multiline
                />

                <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* BOTTOM NAV */}
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
                    <Ionicons name="person" size={24} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

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
    headerTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    chatbotImage: {
        width: 32,
        height: 32,
        marginRight: 8,
        borderRadius: 16,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
    },

    messagesList: { flex: 1 },
    messagesContainer: { padding: 16, paddingBottom: 10 },

    // New styles for message row layout
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 6,
    },
    userRow: {
        justifyContent: 'flex-end',
    },
    otherRow: {
        justifyContent: 'flex-start',
    },

    // Chatbot image next to message
    chatbotMessageImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 12, // Align with message bubble
    },

    // Placeholder for user messages to maintain symmetry
    chatbotImagePlaceholder: {
        width: 32,
        height: 32,
        marginLeft: 8,
    },

    // Update message bubble to remove the alignSelf
    messageBubble: {
        maxWidth: "80%",
        padding: 12,
        borderRadius: 18,
    },
    userBubble: {
        backgroundColor: "#b58dde",
        borderBottomRightRadius: 5,
    },
    otherBubble: {
        backgroundColor: "#fff",
        borderBottomLeftRadius: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },

    messageText: { fontSize: 16, lineHeight: 20 },
    userMessageText: { color: "#fff" },
    otherMessageText: { color: "#333" },

    messageTime: { fontSize: 10, marginTop: 6, alignSelf: "flex-end" },
    userMessageTime: { color: "rgba(255,255,255,0.7)" },
    otherMessageTime: { color: "#666" },

    // image
    imageMessage: { alignItems: "center" },
    messageImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 6 },
    imageCaption: { fontSize: 12, marginTop: 2, textAlign: "center" },
    userImageCaption: { color: "rgba(255,255,255,0.8)" },
    otherImageCaption: { color: "#666" },

    // voice
    voiceMessage: { flexDirection: "row", alignItems: "center", padding: 8 },
    userVoiceMessage: { flexDirection: "row-reverse" },
    otherVoiceMessage: { flexDirection: "row" },
    voiceWaveform: { flexDirection: "row", alignItems: "center", marginHorizontal: 12 },
    voiceBar: { width: 3, backgroundColor: "#fff", marginHorizontal: 1, borderRadius: 2 },
    voiceDuration: { fontSize: 12, color: "#fff", fontWeight: "500" },

    // file - Updated styles
    fileMessage: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
        minWidth: 200,
    },
    fileInfo: { flex: 1, marginLeft: 12 },
    fileName: {
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 2,
    },
    fileDetails: {
        fontSize: 12,
        marginBottom: 4,
        opacity: 0.8,
    },
    fileText: { fontSize: 12 },
    userFileText: { color: "#fff" },
    otherFileText: { color: "#333" },

    // disclaimer
    disclaimerContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: "center",
    },
    disclaimerText: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
        fontStyle: "italic",
    },

    // input
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: "#DDD",
    },
    iconButton: {
        marginRight: 10,
        padding: 8,
        backgroundColor: "#F4EDFF",
        borderRadius: 20,
    },
    recordingButton: { backgroundColor: "#FFE6E6" },
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

    // recording indicator
    recordingIndicator: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF6B6B",
        padding: 12,
    },
    recordingText: { color: "#fff", fontSize: 14, marginLeft: 8, marginRight: 12, fontWeight: "500" },
    recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },

    // bottom nav
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