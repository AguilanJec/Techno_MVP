import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
    Platform
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { doc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export default function CallScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const otherUserName = params.otherUserName as string || "User";
    const otherUserId = params.otherUserId as string;
    const currentUserId = params.currentUserId as string;
    const conversationId = params.conversationId as string;
    const userType = params.userType as string;

    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [callStatus, setCallStatus] = useState<"initializing" | "connecting" | "connected" | "ended" | "failed">("connecting");
    const [remoteJoined, setRemoteJoined] = useState(false);

    const callTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Simulate call connection
        const timer = setTimeout(() => {
            setCallStatus("connected");
            setRemoteJoined(true);
            startCallTimer();
            addCallRecord("started");
        }, 2000);

        startCallTimer();

        return () => {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
            }
            clearTimeout(timer);
        };
    }, []);

    const startCallTimer = () => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
        }

        // @ts-ignore
        callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    const addCallRecord = async (action: "started" | "ended") => {
        if (!conversationId) return;

        try {
            const callData = {
                type: "call",
                action: action,
                duration: action === "ended" ? callDuration : 0,
                timestamp: serverTimestamp(),
                initiatedBy: currentUserId,
                participants: [currentUserId, otherUserId]
            };

            await addDoc(collection(db, "conversations", conversationId, "messages"), callData);

            const lastMessage = action === "started"
                ? "📞 Call started"
                : `📞 Call ended (${formatTime(callDuration)})`;

            await updateDoc(doc(db, "conversations", conversationId), {
                lastMessage: lastMessage,
                lastMessageTime: serverTimestamp(),
                lastMessageSender: currentUserId,
                unread: true
            });

        } catch (error) {
            console.error("Error adding call record:", error);
        }
    };

    const toggleAudio = () => {
        setIsMuted(!isMuted);
        Alert.alert(isMuted ? "Unmuted" : "Muted", `Audio ${isMuted ? "unmuted" : "muted"}`);
    };

    const toggleSpeaker = () => {
        setIsSpeakerOn(!isSpeakerOn);
        Alert.alert("Speaker", `Speaker ${isSpeakerOn ? "off" : "on"}`);
    };

    const toggleVideo = () => {
        setIsVideoOn(!isVideoOn);
        Alert.alert("Video", `Video ${isVideoOn ? "off" : "on"}`);
    };

    const switchCamera = () => {
        Alert.alert("Camera", "Camera switched");
    };

    const endCall = async () => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }

        if (callStatus === "connected" && callDuration > 0) {
            await addCallRecord("ended");
        }

        setCallStatus("ended");
        router.back();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusColor = () => {
        switch (callStatus) {
            case "connected": return "#4CAF50";
            case "connecting": return "#FF9800";
            case "failed": return "#F44336";
            case "initializing": return "#2196F3";
            default: return "#666";
        }
    };

    const getStatusText = () => {
        switch (callStatus) {
            case "connected": return "Connected";
            case "connecting": return "Connecting...";
            case "failed": return "Call Failed";
            case "ended": return "Call Ended";
            case "initializing": return "Initializing...";
            default: return "Unknown";
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Video Container */}
            <View style={styles.videoContainer}>
                {remoteJoined ? (
                    <View style={styles.remoteVideo}>
                        <View style={styles.videoPlaceholder}>
                            <Ionicons name="person" size={64} color="#fff" />
                            <Text style={styles.placeholderText}>{otherUserName}</Text>
                            <Text style={styles.placeholderSubText}>Video call active</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.remoteVideoPlaceholder}>
                        <Ionicons name="person" size={64} color="#fff" />
                        <Text style={styles.placeholderText}>Waiting for {otherUserName} to join...</Text>
                    </View>
                )}

                {isVideoOn && (
                    <View style={styles.localVideoContainer}>
                        <View style={styles.localVideo}>
                            <View style={styles.videoPlaceholder}>
                                <Ionicons name="person" size={24} color="#fff" />
                                <Text style={styles.placeholderText}>You</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.switchCameraButton}
                            onPress={switchCamera}
                        >
                            <Ionicons name="camera-reverse" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Call Info Overlay */}
            <View style={styles.callInfoOverlay}>
                <View style={[styles.callStatus, { backgroundColor: getStatusColor() + '20' }]}>
                    <Ionicons
                        name="call"
                        size={16}
                        color={getStatusColor()}
                    />
                    <Text style={[styles.callStatusText, { color: getStatusColor() }]}>
                        {getStatusText()}
                    </Text>
                </View>

                <Text style={styles.userName}>{otherUserName}</Text>

                {callStatus === "connected" && (
                    <Text style={styles.callTimer}>{formatTime(callDuration)}</Text>
                )}
            </View>

            {/* Controls */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity
                    style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                    onPress={toggleAudio}
                >
                    <View style={[styles.controlIconContainer, isMuted && styles.controlIconContainerActive]}>
                        <Ionicons
                            name={isMuted ? "mic-off" : "mic"}
                            size={24}
                            color={isMuted ? "#FF6B6B" : "#fff"}
                        />
                    </View>
                    <Text style={styles.controlText}>{isMuted ? "Unmute" : "Mute"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
                    onPress={toggleSpeaker}
                >
                    <View style={[styles.controlIconContainer, isSpeakerOn && styles.controlIconContainerActive]}>
                        <Ionicons
                            name={isSpeakerOn ? "volume-high" : "volume-medium"}
                            size={24}
                            color="#fff"
                        />
                    </View>
                    <Text style={styles.controlText}>Speaker</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.controlButton, isVideoOn && styles.controlButtonActive]}
                    onPress={toggleVideo}
                >
                    <View style={[styles.controlIconContainer, isVideoOn && styles.controlIconContainerActive]}>
                        <Ionicons
                            name={isVideoOn ? "videocam" : "videocam-off"}
                            size={24}
                            color="#fff"
                        />
                    </View>
                    <Text style={styles.controlText}>Video</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={switchCamera}
                >
                    <View style={styles.controlIconContainer}>
                        <Ionicons name="camera-reverse" size={24} color="#fff" />
                    </View>
                    <Text style={styles.controlText}>Flip</Text>
                </TouchableOpacity>
            </View>

            {/* End Call Button */}
            <View style={styles.endCallContainer}>
                <TouchableOpacity
                    style={styles.endCallButton}
                    onPress={endCall}
                >
                    <Ionicons name="call" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.endCallText}>End Call</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    videoContainer: {
        flex: 1,
        backgroundColor: "#000",
    },
    remoteVideo: {
        flex: 1,
        backgroundColor: "#000",
    },
    remoteVideoPlaceholder: {
        flex: 1,
        backgroundColor: "#1a1a1a",
        justifyContent: "center",
        alignItems: "center",
    },
    videoPlaceholder: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    placeholderText: {
        color: "#fff",
        fontSize: 16,
        marginTop: 16,
        textAlign: "center",
    },
    placeholderSubText: {
        color: "#ccc",
        fontSize: 14,
        marginTop: 8,
        textAlign: "center",
    },
    localVideoContainer: {
        position: "absolute",
        top: 50,
        right: 20,
        width: 120,
        height: 160,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#000",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    localVideo: {
        width: "100%",
        height: "100%",
        backgroundColor: "#333",
        justifyContent: "center",
        alignItems: "center",
    },
    switchCameraButton: {
        position: "absolute",
        bottom: 8,
        right: 8,
        backgroundColor: "rgba(0,0,0,0.6)",
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    callInfoOverlay: {
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingHorizontal: 20,
    },
    callStatus: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        marginBottom: 16,
    },
    callStatusText: {
        fontSize: 14,
        fontWeight: "500",
        marginLeft: 4,
    },
    userName: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 8,
        textAlign: "center",
    },
    callTimer: {
        fontSize: 18,
        color: "#fff",
        fontWeight: "500",
    },
    controlsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: "rgba(0,0,0,0.8)",
    },
    controlButton: {
        alignItems: "center",
        minWidth: 70,
    },
    controlButtonActive: {},
    controlIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
        borderWidth: 2,
        borderColor: "transparent",
    },
    controlIconContainerActive: {
        backgroundColor: "rgba(255,255,255,0.3)",
        borderColor: "#fff",
    },
    controlText: {
        fontSize: 12,
        color: "#fff",
        fontWeight: "500",
        textAlign: "center",
    },
    endCallContainer: {
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 40,
        backgroundColor: "rgba(0,0,0,0.8)",
    },
    endCallButton: {
        backgroundColor: "#FF6B6B",
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
        transform: [{ rotate: "135deg" }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    endCallText: {
        color: "#FF6B6B",
        fontSize: 16,
        fontWeight: "bold",
    },
});