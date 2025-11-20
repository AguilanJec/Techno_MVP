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
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, onSnapshot, orderBy, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getAuth } from "firebase/auth";

interface Message {
    id: string;
    text: string;
    senderId: string;
    time: any;
    type: "text" | "image" | "voice" | "file";
    imageUri?: string;
    voiceUri?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileUri?: string;
    duration?: number;
}

export default function ChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const conversationId = params.conversationId as string;
    const providerName = params.providerName as string;
    const providerId = params.providerId as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const auth = getAuth();
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (conversationId) {
            setupMessagesListener();
        }
    }, [conversationId]);

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

    const setupMessagesListener = () => {
        const messagesQuery = query(
            collection(db, "conversations", conversationId, "messages"),
            orderBy("time", "asc")
        );

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const messagesData: Message[] = [];
            snapshot.forEach((doc) => {
                messagesData.push({
                    id: doc.id,
                    ...doc.data()
                } as Message);
            });
            setMessages(messagesData);
        });

        return unsubscribe;
    };

    const sendMessage = async (messageData: Partial<Message>) => {
        if (!currentUser || !conversationId) return;

        try {
            const message = {
                text: messageData.text || "",
                senderId: currentUser.uid,
                time: new Date(),
                type: messageData.type || "text",
                imageUri: messageData.imageUri,
                voiceUri: messageData.voiceUri,
                fileName: messageData.fileName,
                fileSize: messageData.fileSize,
                fileType: messageData.fileType,
                fileUri: messageData.fileUri,
                duration: messageData.duration,
            };

            await addDoc(collection(db, "conversations", conversationId, "messages"), message);

            // Update conversation last message
            await updateDoc(doc(db, "conversations", conversationId), {
                lastMessage: messageData.type === "text" ? messageData.text : `Sent a ${messageData.type}`,
                lastMessageTime: new Date(),
                lastMessageSender: currentUser.uid,
                unread: true
            });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled) return;

            const file = result.assets[0];
            if (file) {
                const fileSizeInKB = Math.round((file.size || 0) / 1024);
                const fileType = file.mimeType || 'Unknown type';

                await sendMessage({
                    text: "Attached a file",
                    type: "file",
                    fileName: file.name,
                    fileSize: fileSizeInKB,
                    fileType: fileType,
                    fileUri: file.uri,
                });
            }
        } catch (error) {
            console.error("Error picking file:", error);
            Alert.alert("Error", "Failed to pick file. Please try again.");
        }
    };

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

    const formatFileSize = (sizeInKB?: number) => {
        if (!sizeInKB) return "Unknown size";
        if (sizeInKB < 1024) return `${sizeInKB} KB`;
        return `${(sizeInKB / 1024).toFixed(1)} MB`;
    };

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
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert("Error", "Failed to start recording");
        }
    };

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
            await sendMessage({
                text: "Voice message",
                type: "voice",
                voiceUri: uri,
                duration: recordingDuration,
            });
            setRecordingDuration(0);
        }
    };

    const playSound = async (uri: string) => {
        try {
            const { sound } = await Audio.Sound.createAsync({ uri });
            setSound(sound);
            await sound.playAsync();
        } catch (error) {
            console.error('Error playing sound', error);
        }
    };

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

        if (!result.canceled && result.assets[0]) {
            await sendMessage({
                text: "Here's a photo",
                type: "image",
                imageUri: result.assets[0].uri,
            });
        }
    };

    const takePhoto = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert("Permission required", "Sorry, we need camera permissions to make this work!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            await sendMessage({
                text: "Just took this photo",
                type: "image",
                imageUri: result.assets[0].uri,
            });
        }
    };

    const handleCall = () => {
        router.push(`/call?providerName=${encodeURIComponent(providerName)}&providerId=${providerId}`);
    };

    const handleSendMessage = () => {
        if (newMessage.trim() === "") return;

        sendMessage({
            text: newMessage,
            type: "text",
        });
        setNewMessage("");
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.senderId === currentUser?.uid;

        return (
            <View style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.otherBubble
            ]}>
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
                            color={isUser ? "#fff" : "#4B3C88"}
                        />
                        <View style={styles.fileInfo}>
                            <Text style={[
                                styles.fileName,
                                isUser ? styles.userFileText : styles.otherFileText
                            ]}>
                                {item.fileName}
                            </Text>
                            <Text style={[
                                styles.fileDetails,
                                isUser ? styles.userFileText : styles.otherFileText
                            ]}>
                                {formatFileSize(item.fileSize)} • {item.fileType || 'File'}
                            </Text>
                            {item.text && (
                                <Text style={[
                                    styles.fileText,
                                    isUser ? styles.userFileText : styles.otherFileText
                                ]}>
                                    {item.text}
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                {item.type === "voice" && (
                    <TouchableOpacity
                        style={[
                            styles.voiceMessage,
                            isUser ? styles.userVoiceMessage : styles.otherVoiceMessage
                        ]}
                        onPress={() => item.voiceUri && playSound(item.voiceUri)}
                    >
                        {isUser ? (
                            <>
                                <Text style={styles.voiceDuration}>{item.duration}s</Text>
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
                                <Text style={styles.voiceDuration}>{item.duration}s</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {item.type === "image" && item.imageUri ? (
                    <View style={styles.imageMessage}>
                        <Image source={{ uri: item.imageUri }} style={styles.messageImage} />
                        {item.text ? (
                            <Text style={[
                                styles.imageCaption,
                                isUser ? styles.userImageCaption : styles.otherImageCaption
                            ]}>
                                {item.text}
                            </Text>
                        ) : null}
                    </View>
                ) : null}

                {item.type === "text" && (
                    <Text style={[
                        styles.messageText,
                        isUser ? styles.userMessageText : styles.otherMessageText
                    ]}>
                        {item.text}
                    </Text>
                )}

                <Text style={[
                    styles.messageTime,
                    isUser ? styles.userMessageTime : styles.otherMessageTime
                ]}>
                    {item.time?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#4B3C88" />
                </TouchableOpacity>

                <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {providerName.split(" ").map((n: string) => n[0]).join("")}
                        </Text>
                    </View>
                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>{providerName}</Text>
                        <Text style={styles.userStatus}>Online</Text>
                    </View>
                </View>

                <TouchableOpacity onPress={handleCall} style={styles.callButton}>
                    <Ionicons name="call" size={24} color="#4B3C88" />
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
            />

            {isRecording && (
                <View style={styles.recordingIndicator}>
                    <Ionicons name="mic" size={16} color="#fff" />
                    <Text style={styles.recordingText}>Recording... {recordingDuration}s</Text>
                    <View style={styles.recordingDot} />
                </View>
            )}

            <View style={styles.inputContainer}>
                <TouchableOpacity onPress={pickFile} style={styles.iconButton}>
                    <Ionicons name="attach" size={24} color="#4B3C88" />
                </TouchableOpacity>

                <TouchableOpacity onPress={takePhoto} style={styles.iconButton}>
                    <Ionicons name="camera" size={24} color="#4B3C88" />
                </TouchableOpacity>

                <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
                    <Ionicons name="image" size={24} color="#4B3C88" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={isRecording ? stopRecording : startRecording}
                    style={[styles.iconButton, isRecording && styles.recordingButton]}
                >
                    <Ionicons
                        name={isRecording ? "stop-circle" : "mic"}
                        size={24}
                        color={isRecording ? "#FF6B6B" : "#4B3C88"}
                    />
                </TouchableOpacity>

                <TextInput
                    style={styles.textInput}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    placeholderTextColor="#999"
                />

                <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// ... (keep all the same styles from your original chat screen)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4EDFF",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "#F4EDFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E8D8F5",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    backButton: {
        padding: 4,
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginLeft: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#BFA2E0",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    avatarText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#4B3C88",
    },
    userStatus: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
    },
    callButton: {
        padding: 8,
        backgroundColor: "#E8D8F5",
        borderRadius: 20,
        marginLeft: 8,
    },
    messagesList: {
        flex: 1,
    },
    messagesContainer: {
        padding: 16,
        paddingBottom: 10,
    },
    messageBubble: {
        maxWidth: "80%",
        padding: 12,
        borderRadius: 18,
        marginVertical: 4,
    },
    userBubble: {
        alignSelf: "flex-end",
        backgroundColor: "#BFA2E0",
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
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    userMessageText: {
        color: "#fff",
    },
    otherMessageText: {
        color: "#333",
    },
    messageTime: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: "flex-end",
    },
    userMessageTime: {
        color: "rgba(255,255,255,0.7)",
    },
    otherMessageTime: {
        color: "#666",
    },
    voiceMessage: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
    },
    userVoiceMessage: {
        flexDirection: "row-reverse",
    },
    otherVoiceMessage: {
        flexDirection: "row",
    },
    voiceWaveform: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 12,
    },
    voiceBar: {
        width: 3,
        backgroundColor: "#fff",
        marginHorizontal: 1,
        borderRadius: 2,
    },
    voiceDuration: {
        fontSize: 12,
        color: "#fff",
        fontWeight: '500',
    },
    fileMessage: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
        minWidth: 200,
    },
    fileInfo: {
        flex: 1,
        marginLeft: 12,
    },
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
    fileText: {
        fontSize: 12,
    },
    userFileText: {
        color: "#fff",
    },
    otherFileText: {
        color: "#333",
    },
    imageMessage: {
        alignItems: "center",
    },
    messageImage: {
        width: 200,
        height: 150,
        borderRadius: 12,
        marginBottom: 6,
    },
    imageCaption: {
        fontSize: 12,
        marginTop: 2,
        textAlign: "center",
    },
    userImageCaption: {
        color: "rgba(255,255,255,0.8)",
    },
    otherImageCaption: {
        color: "#666",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#E8D8F5",
    },
    iconButton: {
        padding: 10,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: "#F4EDFF",
    },
    recordingButton: {
        backgroundColor: "#FFE6E6",
    },
    textInput: {
        flex: 1,
        backgroundColor: "#F4EDFF",
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxHeight: 100,
        marginRight: 8,
        fontSize: 16,
        color: "#333",
    },
    sendButton: {
        backgroundColor: "#BFA2E0",
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    recordingIndicator: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF6B6B",
        padding: 12,
    },
    recordingText: {
        color: "#fff",
        fontSize: 14,
        marginLeft: 8,
        marginRight: 12,
        fontWeight: '500',
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#fff",
    },
});