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
    duration?: number;
}

export default function FeedbackScreen() {
    const router = useRouter();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            text: "👋 Hi there! I’m Mavi, your virtual assistant. Do you have any feedbacks?",
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

    const sendMessage = () => {
        if (newMessage.trim() === "") return;

        const msg: Message = {
            id: Date.now().toString(),
            text: newMessage.trim(),
            isUser: true,
            time: timestamp(),
            type: "text",
        };
        setMessages((prev) => [...prev, msg]);
        setNewMessage("");

        // optional quick auto-reply
        setTimeout(() => {
            const reply: Message = {
                id: Date.now().toString() + "-bot",
                text: "Thanks for your feedback — M.A.V.I got it!",
                isUser: false,
                time: timestamp(),
                type: "text",
            };
            setMessages((prev) => [...prev, reply]);
        }, 900);
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

    // File picker placeholder
    const pickFile = async () => {
        Alert.alert("Attach file", "This will open a file picker (placeholder).");
        const newMsg: Message = {
            id: Date.now().toString(),
            text: "Attached a document",
            isUser: true,
            time: timestamp(),
            type: "file",
            fileName: "document.pdf",
        };
        setMessages((prev) => [...prev, newMsg]);
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

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.otherBubble]}>
            {/* File */}
            {item.type === "file" && (
                <TouchableOpacity style={styles.fileMessage}>
                    <Ionicons name="document-attach" size={24} color={item.isUser ? "#fff" : "#4B3C88"} />
                    <View style={styles.fileInfo}>
                        <Text style={[styles.fileName, item.isUser ? styles.userFileText : styles.otherFileText]}>
                            {item.fileName || "file.pdf"}
                        </Text>
                        <Text style={[styles.fileText, item.isUser ? styles.userFileText : styles.otherFileText]}>
                            {item.text}
                        </Text>
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
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/account")} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Feedback</Text>
                <View style={{ width: 30 }} />
            </View>

            {/* GREETING */}
            <View style={styles.greetingContainer}>
                <Text style={styles.greetingText}>Hi Tony Stark!</Text>
                <Image source={require("../assets/images/female.png")} style={styles.femaleImage} />
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
        paddingBottom: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    backBtn: { padding: 4 },
    headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },

    greetingContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#b58dde",
        paddingHorizontal: 20,
        paddingVertical: 6,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    greetingText: { fontSize: 22, fontWeight: "600", color: "#fff" },
    femaleImage: { width: 100, height: 100, resizeMode: "contain" },

    messagesList: { flex: 1 },
    messagesContainer: { padding: 16, paddingBottom: 10 },

    messageBubble: {
        maxWidth: "80%",
        padding: 12,
        borderRadius: 18,
        marginVertical: 6,
    },
    userBubble: {
        alignSelf: "flex-end",
        backgroundColor: "#b58dde",
        borderBottomRightRadius: 5,
    },
    otherBubble: {
        alignSelf: "flex-start",
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

    // file
    fileMessage: { flexDirection: "row", alignItems: "center", padding: 8 },
    fileInfo: { flex: 1, marginLeft: 12 },
    fileName: { fontSize: 14, fontWeight: "bold", marginBottom: 2 },
    fileText: { fontSize: 12 },
    userFileText: { color: "#fff" },
    otherFileText: { color: "#333" },

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
    navItem: { alignItems: "center" },
});
