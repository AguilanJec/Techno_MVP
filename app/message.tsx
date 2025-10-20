import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    Modal,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";

// Mock data for messages
const INITIAL_MESSAGES = [
    {
        id: "1",
        name: "Steve Rogers",
        lastMessage: "Hello is Tom 10AM okay for us",
        time: "9:40 AM",
        unread: false,
    },
    {
        id: "2",
        name: "Natasha Romanof",
        lastMessage: "Your: What's man!",
        time: "9:40 AM",
        unread: true,
    },
    {
        id: "3",
        name: "Peter Parker",
        lastMessage: "Your: What's man!",
        time: "9:40 AM",
        unread: false,
    },
];

const ALL_CONTACTS = [
    { id: "1", name: "Steve Rogers" },
    { id: "2", name: "Natasha Romanof" },
    { id: "3", name: "Peter Parker" },
    { id: "4", name: "Tony Stark" },
    { id: "5", name: "Bruce Banner" },
    { id: "6", name: "Thor Odinson" },
    { id: "7", name: "Clint Barton" },
    { id: "8", name: "Wanda Maximoff" },
    { id: "9", name: "Sam Wilson" },
];

export default function MessageScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [messages, setMessages] = useState(INITIAL_MESSAGES);

    // Filter messages based on search query
    const filteredMessages = messages.filter(message =>
        message.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter contacts for modal (exclude existing conversations)
    const availableContacts = ALL_CONTACTS.filter(contact =>
        !messages.some(msg => msg.name === contact.name)
    );

    const filteredContacts = availableContacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderMessageItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.messageItem}
            onPress={() => router.push(`/chat?user=${encodeURIComponent(item.name)}`)}
        >
            <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.name.split(" ").map((n: string) => n[0]).join("")}
                    </Text>
                </View>
                {item.unread && <View style={styles.unreadDot} />}
            </View>
            <View style={styles.messageContent}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.messageText}>{item.lastMessage}</Text>
            </View>
            <Text style={styles.time}>{item.time}</Text>
        </TouchableOpacity>
    );

    const renderContactItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.contactItem}
            onPress={() => {
                // Add new conversation
                const newMessage = {
                    id: Date.now().toString(),
                    name: item.name,
                    lastMessage: "New conversation",
                    time: "Now",
                    unread: true,
                };
                setMessages(prev => [newMessage, ...prev]);
                setModalVisible(false);
                setSearchQuery(""); // Clear search
                router.push(`/chat?user=${encodeURIComponent(item.name)}`);
            }}
        >
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {item.name.split(" ").map((n: string) => n[0]).join("")}
                </Text>
            </View>
            <Text style={styles.contactName}>{item.name}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Messages</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Current Time */}
            <Text style={styles.currentTime}>12:00</Text>

            {/* Search Bar */}
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

            {/* Messages List */}
            <FlatList
                data={filteredMessages}
                renderItem={renderMessageItem}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            {searchQuery ? "No messages found" : "No messages yet"}
                        </Text>
                    </View>
                }
            />

            {/* Write Message Button */}
            <TouchableOpacity
                style={styles.writeButton}
                onPress={() => {
                    setSearchQuery(""); // Clear search when opening modal
                    setModalVisible(true);
                }}
            >
                <Text style={styles.writeButtonText}>Write a message</Text>
            </TouchableOpacity>

            {/* Contact Selection Modal */}
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
                            placeholder="Search contacts..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus={true}
                        />

                        <FlatList
                            data={filteredContacts}
                            renderItem={renderContactItem}
                            keyExtractor={(item) => item.id}
                            style={styles.contactsList}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateText}>
                                        {searchQuery ? "No contacts found" : "No contacts available"}
                                    </Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
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
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: "#F4EDFF",
    },
    backButton: {
        padding: 5,
    },
    backButtonText: {
        fontSize: 20,
        color: "#4B3C88",
        fontWeight: "bold",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#4B3C88",
    },
    placeholder: {
        width: 30,
    },
    currentTime: {
        textAlign: "center",
        fontSize: 16,
        color: "#666",
        marginVertical: 10,
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    searchInput: {
        backgroundColor: "#fff",
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#DDD",
    },
    messagesList: {
        flex: 1,
        paddingHorizontal: 15,
    },
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
    avatarContainer: {
        position: "relative",
        marginRight: 15,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#BFA2E0",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
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
    messageContent: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#4B3C88",
        marginBottom: 4,
    },
    messageText: {
        fontSize: 14,
        color: "#666",
    },
    time: {
        fontSize: 12,
        color: "#999",
    },
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
    writeButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
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
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#4B3C88",
    },
    closeButton: {
        fontSize: 20,
        color: "#666",
    },
    modalSearchInput: {
        backgroundColor: "#F4EDFF",
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 15,
    },
    contactsList: {
        maxHeight: 300,
    },
    contactItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    contactName: {
        fontSize: 16,
        color: "#333",
        marginLeft: 15,
    },
    emptyState: {
        padding: 20,
        alignItems: "center",
    },
    emptyStateText: {
        color: "#666",
        fontSize: 16,
        textAlign: "center",
    },
});