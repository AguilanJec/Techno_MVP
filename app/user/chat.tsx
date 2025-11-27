import React, { useState, useRef, useEffect, useCallback } from "react";
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
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Linking,
    Keyboard,
    NativeSyntheticEvent,
    TextInputSubmitEditingEventData,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    addDoc,
    doc,
    updateDoc,
    getDoc,
    serverTimestamp
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth } from "firebase/auth";

interface Message {
    id: string;
    text: string;
    senderId: string;
    time: any;
    type: "text" | "image" | "voice" | "file" | "system" | "call";
    imageUri?: string;
    voiceUri?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileUri?: string;
    duration?: number;
    callAction?: "started" | "ended";
}

export default function ChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const conversationId = params.conversationId as string;
    const otherUserNameParam = params.otherUserName as string;
    const otherUserId = params.otherUserId as string;
    const userType = params.userType as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [otherUserData, setOtherUserData] = useState<any>(null);
    const [isSending, setIsSending] = useState(false);

    // show/hide extra action icons
    const [showExtras, setShowExtras] = useState(true);

    // approximate input row height (used for FlatList bottom padding)
    const INPUT_ROW_HEIGHT = 84;

    // keyboard helpers
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput | null>(null);

    const auth = getAuth();
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (conversationId && currentUser) {
            const unsub = setupMessagesListener();
            markConversationAsRead();
            fetchOtherUserData();
            return () => {
                if (unsub && typeof unsub === "function") unsub();
            };
        } else {
            setIsLoading(false);
        }
    }, [conversationId, currentUser]);

    // lightweight keyboard listeners to scroll and keep state (no heavy layout math)
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => {
            setIsKeyboardVisible(true);
            // ensure chat scrolls to bottom when keyboard appears
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            setIsKeyboardVisible(false);
            // ensure chat scrolls to bottom when keyboard hides
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // sanitize picture helper (unchanged)
    const sanitizePictureUri = useCallback((raw?: string | null) => {
        if (!raw) return null;
        let s = raw.trim();
        const urlMatch = s.match(/^url\(["']?(.*?)["']?\)$/i);
        if (urlMatch && urlMatch[1]) s = urlMatch[1];
        if (/^https?:\/\//i.test(s)) return s;
        if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(s)) return s;
        if (/^data:imag[e]*/i.test(s) && s.includes("base64,")) {
            return s.replace(/^data:imag/, "data:image");
        }
        if (/^(\/9j\/|iVBOR|R0lGOD)/.test(s)) {
            return `data:image/jpeg;base64,${s}`;
        }
        if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 100) {
            return `data:image/jpeg;base64,${s}`;
        }
        return null;
    }, []);

    const fetchOtherUserData = async () => {
        if (!otherUserId) {
            setIsLoading(false);
            return;
        }
        try {
            const collectionName = userType === "provider" ? "providers" : "users";
            let userDoc = await getDoc(doc(db, collectionName, otherUserId));
            if (!userDoc.exists()) {
                const alt = collectionName === "providers" ? "users" : "providers";
                userDoc = await getDoc(doc(db, alt, otherUserId));
            }
            if (userDoc.exists()) {
                const raw = userDoc.data();
                const pictureUri = sanitizePictureUri(raw?.picture ?? null);
                setOtherUserData({
                    ...raw,
                    pictureUri: pictureUri ?? null,
                });
            } else {
                setOtherUserData(null);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            setOtherUserData(null);
        } finally {
            setIsLoading(false);
        }
    };

    const setupMessagesListener = () => {
        if (!conversationId) return;
        try {
            const messagesQuery = query(
                collection(db, "conversations", conversationId, "messages"),
                orderBy("time", "asc")
            );
            const unsubscribe = onSnapshot(messagesQuery,
                (snapshot) => {
                    const messagesData: Message[] = [];
                    snapshot.forEach((d) => {
                        const data = d.data();
                        messagesData.push({
                            id: d.id,
                            text: data.text || "",
                            senderId: data.senderId,
                            time: data.time,
                            type: data.type || "text",
                            imageUri: data.imageUri,
                            voiceUri: data.voiceUri,
                            fileName: data.fileName,
                            fileSize: data.fileSize,
                            fileType: data.fileType,
                            fileUri: data.fileUri,
                            duration: data.duration,
                            callAction: data.callAction,
                        } as Message);
                    });
                    setMessages(messagesData);
                    // auto-scroll when new messages arrive
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
                },
                (error) => {
                    console.error("Error in messages listener:", error);
                    Alert.alert("Error", "Failed to load messages");
                    setIsLoading(false);
                }
            );
            return unsubscribe;
        } catch (error) {
            console.error("Error setting up messages listener:", error);
            setIsLoading(false);
        }
    };

    const markConversationAsRead = async () => {
        if (!currentUser || !conversationId) return;
        try {
            await updateDoc(doc(db, "conversations", conversationId), {
                unread: false,
                lastMessageSender: currentUser.uid
            });
        } catch (error) {
            console.error("Error marking conversation as read:", error);
        }
    };

    const sendMessage = async (messageData: Partial<Message>) => {
        if (!currentUser || !conversationId) return;
        try {
            setIsSending(true);
            const message: any = {
                text: messageData.text || "",
                senderId: currentUser.uid,
                time: serverTimestamp(),
                type: messageData.type || "text",
            };
            if (messageData.imageUri) message.imageUri = messageData.imageUri;
            if (messageData.voiceUri) message.voiceUri = messageData.voiceUri;
            if (messageData.fileName) message.fileName = messageData.fileName;
            if (messageData.fileSize) message.fileSize = messageData.fileSize;
            if (messageData.fileType) message.fileType = messageData.fileType;
            if (messageData.fileUri) message.fileUri = messageData.fileUri;
            if (messageData.duration) message.duration = messageData.duration;
            if (messageData.callAction) message.callAction = messageData.callAction;
            await addDoc(collection(db, "conversations", conversationId, "messages"), message);

            let lastMessageText = "";
            switch (messageData.type) {
                case "text":
                    lastMessageText = messageData.text || "";
                    break;
                case "image":
                    lastMessageText = "📷 Sent a photo";
                    break;
                case "voice":
                    lastMessageText = "🎤 Voice message";
                    break;
                case "file":
                    lastMessageText = "📎 Sent a file";
                    break;
                case "call":
                    lastMessageText = messageData.callAction === "started" ? "📞 Call started" : "📞 Call ended";
                    break;
                default:
                    lastMessageText = "Sent a message";
            }

            await updateDoc(doc(db, "conversations", conversationId), {
                lastMessage: lastMessageText,
                lastMessageTime: serverTimestamp(),
                lastMessageSender: currentUser.uid,
                unread: true
            });
        } catch (error) {
            console.error("Error sending message:", error);
            Alert.alert("Error", "Failed to send message");
        } finally {
            setIsSending(false);
        }
    };

    // file/image/voice helpers (kept as before - unchanged)
    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
                multiple: false,
            });
            if ((result as any).canceled) return;
            const file = (result as any).assets?.[0] ?? result;
            if (file) {
                const fileSizeInKB = Math.round((file.size || 0) / 1024);
                const fileType = (file.mimeType || file.type) || 'Unknown type';
                await sendMessage({
                    text: `Sent file: ${file.name}`,
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
                staysActiveInBackground: true,
            });
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            setRecordingDuration(0);

            // timer
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

        if (uri && recordingDuration > 1) {
            await sendMessage({
                text: "Voice message",
                type: "voice",
                voiceUri: uri,
                duration: recordingDuration,
            });
        } else if (recordingDuration <= 1) {
            Alert.alert("Too Short", "Please record a longer voice message");
        }
        setRecordingDuration(0);
    };

    const playSound = async (uri: string) => {
        try {
            if (sound) {
                await sound.unloadAsync();
            }
            const { sound: newSound } = await Audio.Sound.createAsync({ uri });
            setSound(newSound);
            await newSound.playAsync();
        } catch (error) {
            console.error('Error playing sound', error);
            Alert.alert("Error", "Could not play voice message");
        }
    };

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Permission required", "Sorry, we need camera roll permissions to make this work!");
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });
            if (!result.canceled && result.assets?.[0]) {
                await sendMessage({
                    text: "Photo",
                    type: "image",
                    imageUri: result.assets[0].uri,
                });
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const takePhoto = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Permission required", "Sorry, we need camera permissions to make this work!");
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.8,
            });
            if (!result.canceled && result.assets?.[0]) {
                await sendMessage({
                    text: "Photo",
                    type: "image",
                    imageUri: result.assets[0].uri,
                });
            }
        } catch (error) {
            console.error("Error taking photo:", error);
            Alert.alert("Error", "Failed to take photo");
        }
    };

    const handleCall = () => {
        const phoneNumber = otherUserData?.phone || "+1234567890";
        sendMessage({
            type: "call",
            callAction: "started",
            text: "Call started"
        });
        Linking.openURL(`tel:${phoneNumber}`)
            .catch(err => {
                console.error('Error opening phone dialer:', err);
                Alert.alert("Error", "Could not open phone dialer");
            });
    };

    const handleVideoCall = () => {
        Alert.alert("Video Call", "Video calling feature coming soon!");
    };

    const handleSendMessage = () => {
        if (newMessage.trim() === "" || isSending) return;
        sendMessage({
            text: newMessage.trim(),
            type: "text",
        });
        setNewMessage("");
        // keep input focused so user can continue typing
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const formatMessageTime = (timestamp: any) => {
        if (!timestamp) return "";
        try {
            const date = timestamp.toDate();
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            return "";
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.senderId === currentUser?.uid;
        const isSystem = item.type === "system";

        if (isSystem) {
            return (
                <View style={styles.systemMessage}>
                    <Text style={styles.systemMessageText}>{item.text}</Text>
                </View>
            );
        }

        if (item.type === "call") {
            return (
                <View style={styles.systemMessage}>
                    <Text style={styles.systemMessageText}>
                        {item.callAction === "started" ? "📞 Call started" : "📞 Call ended"}
                        {item.duration ? ` (${formatCallDuration(item.duration)})` : ""}
                    </Text>
                </View>
            );
        }

        return (
            <View style={[
                styles.messageContainer,
                isUser ? styles.userContainer : styles.otherContainer
            ]}>
                <View style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.otherBubble
                ]}>
                    {item.type === "file" && (
                        <TouchableOpacity
                            style={styles.fileMessage}
                            onPress={() => {
                                Alert.alert(
                                    "File Information",
                                    `File: ${item.fileName}\nSize: ${formatFileSize(item.fileSize)}\nType: ${item.fileType || 'Unknown'}`,
                                    [{ text: "OK" }]
                                );
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
                                {item.text && item.text !== `Sent file: ${item.fileName}` && (
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
                                    <Ionicons name="play" size={20} color="#fff" />
                                </>
                            ) : (
                                <>
                                    <Ionicons name="play" size={20} color="#4B3C88" />
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
                            {item.text && item.text !== "Photo" ? (
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
                        {formatMessageTime(item.time)}
                    </Text>
                </View>
            </View>
        );
    };

    const formatCallDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8e44ad" />
                    <Text style={styles.loadingText}>Loading conversation...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const headerDisplayName = otherUserData?.name || otherUserNameParam || "Unknown User";
    const headerPictureUri = otherUserData?.pictureUri ?? null;

    // keep flatlist bottom padding so messages don't hide behind input
    const flatListPaddingBottom = INPUT_ROW_HEIGHT + (Platform.OS === 'ios' ? 34 : 16);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#4B3C88" />
                </TouchableOpacity>

                <View style={styles.userInfo}>
                    {headerPictureUri ? (
                        <Image
                            source={{ uri: headerPictureUri }}
                            style={styles.avatarImage}
                            onError={() => {
                                setOtherUserData((prev: any) => prev ? { ...prev, pictureUri: null } : prev);                            }}
                        />
                    ) : (
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {headerDisplayName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
                            </Text>
                        </View>
                    )}

                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>{headerDisplayName}</Text>
                        <Text style={styles.userStatus}>
                            {otherUserData?.status === "online" ? "Online" : "Offline"}
                        </Text>
                    </View>
                </View>

                <View style={styles.headerButtons}>
                    <TouchableOpacity onPress={handleVideoCall} style={styles.callButton}>
                        <Ionicons name="videocam" size={24} color="#4B3C88" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCall} style={styles.callButton}>
                        <Ionicons name="call" size={24} color="#4B3C88" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* messages area */}
            <View style={{ flex: 1 }}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    style={styles.messagesList}
                    contentContainerStyle={[styles.messagesContainer, { paddingBottom: flatListPaddingBottom }]}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyStateText}>No messages yet</Text>
                            <Text style={styles.emptyStateSubText}>Start the conversation by sending a message!</Text>
                        </View>
                    }
                />
            </View>

            {/* Absolute pinned input; wrapped in KeyboardAvoidingView so it moves up on iOS */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
                pointerEvents="box-none"
            >
                <View style={[styles.inputContainerAbsolute, Platform.OS === 'ios' ? { paddingBottom: 8 } : { paddingBottom: 8 }]}>
                    {showExtras ? (
                        <>
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
                        </>
                    ) : null}

                    <TextInput
                        ref={inputRef}
                        style={[
                            styles.textInput,
                            !showExtras ? { marginRight: 8 } : { marginRight: 8 }
                        ]}
                        placeholder="Type a message..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                        placeholderTextColor="#999"
                        editable={!isSending}
                        onFocus={() => {
                            // hide action icons when user focuses input
                            setShowExtras(false);
                        }}
                        onSubmitEditing={(e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
                            // On pressing "send" from keyboard on single-line input
                            if (!e.nativeEvent.text) return;
                            handleSendMessage();
                        }}
                    />

                    {!showExtras ? (
                        <TouchableOpacity
                            onPress={() => {
                                inputRef.current?.blur();
                                Keyboard.dismiss();
                                // small delay so the UI doesn't flash
                                setTimeout(() => setShowExtras(true), 120);
                            }}
                            style={styles.toggleExtrasButton}
                        >
                            <Ionicons name="chevron-up" size={20} color="#4B3C88" />
                        </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                        onPress={handleSendMessage}
                        style={[styles.sendButton, (!newMessage.trim() || isSending) && styles.sendButtonDisabled]}
                        disabled={!newMessage.trim() || isSending}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

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
    },
    avatarText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#eee",
        marginRight: 12,
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
    headerButtons: {
        flexDirection: "row",
        alignItems: "center",
    },
    callButton: {
        padding: 8,
        backgroundColor: "#E8D8F5",
        borderRadius: 20,
        marginLeft: 8,
    },
    chatContainer: {
        flex: 1,
    },
    messagesList: {
        flex: 1,
    },
    messagesContainer: {
        padding: 16,
        paddingBottom: 16,
    },
    messageContainer: {
        marginVertical: 4,
    },
    userContainer: {
        alignItems: "flex-end",
    },
    otherContainer: {
        alignItems: "flex-start",
    },
    messageBubble: {
        maxWidth: "80%",
        padding: 12,
        borderRadius: 18,
    },
    userBubble: {
        backgroundColor: "#BFA2E0",
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
    systemMessage: {
        alignItems: "center",
        marginVertical: 8,
    },
    systemMessageText: {
        fontSize: 12,
        color: "#999",
        fontStyle: "italic",
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

    /* INPUT ROW styles (original) */
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#E8D8F5",
    },
    /* NEW: absolute pinned input */
    inputContainerAbsolute: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingTop: 12,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#E8D8F5",
        // small elevation/shadow so input sits above messages
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 6,
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
    toggleExtrasButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F4EDFF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    sendButton: {
        backgroundColor: "#BFA2E0",
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
    },
    sendButtonDisabled: {
        backgroundColor: "#ccc",
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
        fontWeight: "500",
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#fff",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F4EDFF",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#666",
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 100,
    },
    emptyStateText: {
        fontSize: 18,
        color: "#666",
        marginTop: 16,
        fontWeight: "500",
    },
    emptyStateSubText: {
        fontSize: 14,
        color: "#999",
        marginTop: 8,
        textAlign: "center",
    },
});
