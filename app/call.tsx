import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function CallScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const userName = params.user as string || "Steve Rogers";

    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEndCall = () => {
        router.back();
    };

    const handleToggleMute = () => {
        setIsMuted(!isMuted);
    };

    const handleToggleSpeaker = () => {
        setIsSpeakerOn(!isSpeakerOn);
    };

    const handleToggleVideo = () => {
        setIsVideoOn(!isVideoOn);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header with Time */}
            <View style={styles.header}>
                <Text style={styles.headerTime}>12:00</Text>
                <Text style={styles.callingVia}>Calling via Hirayag</Text>
            </View>

            {/* Call Info */}
            <View style={styles.callInfo}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {userName.split(" ").map((n: string) => n[0]).join("")}
                        </Text>
                    </View>
                    <View style={styles.callStatus}>
                        <Ionicons name="call" size={16} color="#4B3C88" />
                        <Text style={styles.callStatusText}>Connected</Text>
                    </View>
                </View>

                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.callTimer}>{formatTime(callDuration)}</Text>
            </View>

            {/* Call Controls */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity
                    style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                    onPress={handleToggleMute}
                >
                    <View style={[styles.controlIconContainer, isMuted && styles.controlIconContainerActive]}>
                        <Ionicons
                            name={isMuted ? "mic-off" : "mic"}
                            size={24}
                            color={isMuted ? "#FF6B6B" : "#4B3C88"}
                        />
                    </View>
                    <Text style={styles.controlText}>{isMuted ? "Unmute" : "Mute"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
                    onPress={handleToggleSpeaker}
                >
                    <View style={[styles.controlIconContainer, isSpeakerOn && styles.controlIconContainerActive]}>
                        <Ionicons
                            name={isSpeakerOn ? "volume-high" : "volume-medium"}
                            size={24}
                            color={isSpeakerOn ? "#4B3C88" : "#4B3C88"}
                        />
                    </View>
                    <Text style={styles.controlText}>{isSpeakerOn ? "Speaker" : "Speaker"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.controlButton, isVideoOn && styles.controlButtonActive]}
                    onPress={handleToggleVideo}
                >
                    <View style={[styles.controlIconContainer, isVideoOn && styles.controlIconContainerActive]}>
                        <Ionicons
                            name={isVideoOn ? "videocam" : "videocam-off"}
                            size={24}
                            color={isVideoOn ? "#4B3C88" : "#4B3C88"}
                        />
                    </View>
                    <Text style={styles.controlText}>{isVideoOn ? "Video On" : "Video Off"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.controlButton}
                >
                    <View style={styles.controlIconContainer}>
                        <Ionicons name="add" size={24} color="#4B3C88" />
                    </View>
                    <Text style={styles.controlText}>Add Call</Text>
                </TouchableOpacity>
            </View>

            {/* End Call Button */}
            <View style={styles.endCallContainer}>
                <TouchableOpacity
                    style={styles.endCallButton}
                    onPress={handleEndCall}
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
        backgroundColor: "#F4EDFF",
        justifyContent: "space-between",
        paddingVertical: 40,
    },
    header: {
        alignItems: "center",
        paddingHorizontal: 20,
    },
    headerTime: {
        fontSize: 16,
        color: "#666",
        fontWeight: "500",
        marginBottom: 4,
    },
    callingVia: {
        fontSize: 14,
        color: "#888",
    },
    callInfo: {
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    avatarContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#BFA2E0",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    avatarText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 36,
    },
    callStatus: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8D8F5",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    callStatusText: {
        fontSize: 12,
        color: "#4B3C88",
        fontWeight: "500",
        marginLeft: 4,
    },
    userName: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#4B3C88",
        marginBottom: 8,
        textAlign: "center",
    },
    callTimer: {
        fontSize: 18,
        color: "#666",
        fontWeight: "500",
    },
    controlsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    controlButton: {
        alignItems: "center",
        minWidth: 70,
    },
    controlButtonActive: {
        // Active state styling
    },
    controlIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#E8D8F5",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
        borderWidth: 2,
        borderColor: "transparent",
    },
    controlIconContainerActive: {
        backgroundColor: "#fff",
        borderColor: "#BFA2E0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    controlText: {
        fontSize: 12,
        color: "#4B3C88",
        fontWeight: "500",
        textAlign: "center",
    },
    endCallContainer: {
        alignItems: "center",
        paddingHorizontal: 20,
    },
    endCallButton: {
        backgroundColor: "#FF6B6B",
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: 12,
        transform: [{ rotate: "135deg" }],
    },
    endCallText: {
        color: "#FF6B6B",
        fontSize: 16,
        fontWeight: "bold",
    },
});