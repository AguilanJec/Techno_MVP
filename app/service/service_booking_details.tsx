// app/service/service_booking_details.tsx
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db } from "../../firebaseConfig";
import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    DocumentData,
    addDoc,
    collection,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

function formatDate(ts: any) {
    try {
        if (!ts) return "—";
        // Firestore Timestamp has toDate()
        const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
        return d.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    } catch {
        return String(ts);
    }
}

function safeNumber(val: any) {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
}

/** compute end time string when only startTime + duration given */
function addHoursToTime(start: any, hoursToAdd: number) {
    try {
        if (!start) return null;
        const h12 = Number(start.hour12 ?? start.hour ?? 0);
        const m = Number(start.minute ?? 0);
        const ampm = (start.ampm ?? "").toString().toUpperCase();
        let hour24 = h12 % 12;
        if (ampm === "PM") hour24 += 12;
        const startMinutes = hour24 * 60 + m;
        const endMinutes = startMinutes + Math.round(hoursToAdd * 60);
        const endHour24 = Math.floor((endMinutes / 60) % 24);
        const endMinute = endMinutes % 60;
        const endAmpm = endHour24 >= 12 ? "PM" : "AM";
        const endHour12 = (endHour24 % 12) === 0 ? 12 : endHour24 % 12;
        return `${String(endHour12)}:${String(endMinute).padStart(2, "0")} ${endAmpm}`;
    } catch {
        return null;
    }
}

export default function ServiceBookingDetails() {
    const { bookingId } = useLocalSearchParams();
    const id = Array.isArray(bookingId) ? bookingId[0] : bookingId;
    const router = useRouter();
    const auth = getAuth();

    const [loading, setLoading] = useState(true);
    const [appointment, setAppointment] = useState<DocumentData | null>(null);
    const [parentData, setParentData] = useState<DocumentData | null>(null);
    const [providerData, setProviderData] = useState<DocumentData | null>(null);
    const [updating, setUpdating] = useState(false);
    const [providerName, setProviderName] = useState<string>("Provider");

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            try {
                const ref = doc(db, "appointments", id);
                const snap = await getDoc(ref);
                if (!snap.exists()) {
                    Alert.alert("Not found", "Booking not found.");
                    setAppointment(null);
                    setLoading(false);
                    return;
                }
                const data = snap.data();
                if (cancelled) return;
                setAppointment(data);

                // Load provider name for conversation
                if (data?.providerId) {
                    try {
                        const pSnap = await getDoc(doc(db, "providers", data.providerId));
                        if (pSnap.exists()) {
                            const providerData = pSnap.data();
                            setProviderData(providerData);
                            setProviderName(providerData?.name || "Provider");
                        }
                    } catch (err) {
                        console.warn("Failed to load provider:", err);
                    }
                }

                // parent user doc if present
                if (data?.userId) {
                    try {
                        const uSnap = await getDoc(doc(db, "users", data.userId));
                        if (uSnap.exists()) setParentData(uSnap.data());
                    } catch (err) {
                        console.warn("Failed to load parent user:", err);
                    }
                }
            } catch (err) {
                console.error("Failed to load booking:", err);
                Alert.alert("Error", "Failed to load booking details.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [id]);

    // Function to handle message button press (same as in ServiceHome)
    const handleMessagePress = async () => {
        const currentUserUid = auth.currentUser?.uid;
        const parentUserId = appointment?.userId;
        const parentDisplayName = parentData?.name || appointment?.userEmail || "Parent";

        if (!parentUserId || !currentUserUid) {
            Alert.alert("Error", "Cannot message this user - missing user information");
            return;
        }

        try {
            // Check if conversation already exists
            const conversationsQuery = query(
                collection(db, "conversations"),
                where("participants", "array-contains", currentUserUid)
            );

            const conversationsSnapshot = await getDocs(conversationsQuery);
            let existingConversationId = null;

            conversationsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.participants.includes(parentUserId)) {
                    existingConversationId = doc.id;
                }
            });

            if (existingConversationId) {
                // Navigate to existing conversation
                router.push({
                    pathname: "/user/chat",
                    params: {
                        conversationId: existingConversationId,
                        otherUserName: parentDisplayName,
                        otherUserId: parentUserId,
                        userType: "customer"
                    }
                });
            } else {
                // Create new conversation
                const newConversation = {
                    participants: [currentUserUid, parentUserId],
                    participantNames: {
                        [currentUserUid]: providerName,
                        [parentUserId]: parentDisplayName
                    },
                    lastMessage: "Conversation started from booking",
                    lastMessageTime: new Date(),
                    unread: false,
                    lastMessageSender: currentUserUid,
                    createdAt: new Date()
                };

                const docRef = await addDoc(collection(db, "conversations"), newConversation);

                router.push({
                    pathname: "/user/chat",
                    params: {
                        conversationId: docRef.id,
                        otherUserName: parentDisplayName,
                        otherUserId: parentUserId,
                        userType: "customer"
                    }
                });
            }
        } catch (error) {
            console.error("Error handling message:", error);
            Alert.alert("Error", "Failed to start conversation. Please try again.");
        }
    };

    if (!id) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text>Missing booking id.</Text>
            </View>
        );
    }

    const currentUserUid = auth.currentUser?.uid;
    const canManage = Boolean(currentUserUid && appointment?.providerId && currentUserUid === appointment.providerId);

    // unified updater: accepts optional extra fields (like acceptedAt/completedAt)
    const updateStatus = async (newStatus: string, extra: Record<string, any> = {}) => {
        if (!appointment) return;
        const ok = await new Promise<boolean>((res) =>
            Alert.alert(
                "Confirm",
                `Set booking status to "${newStatus}"?`,
                [
                    { text: "Cancel", onPress: () => res(false), style: "cancel" },
                    { text: "Yes", onPress: () => res(true) },
                ],
                { cancelable: true }
            )
        );
        if (!ok) return;

        try {
            setUpdating(true);
            const ref = doc(db, "appointments", id);
            await updateDoc(ref, {
                status: newStatus,
                updatedAt: serverTimestamp(),
                ...extra,
            });
            // reflect locally for immediate UI feedback
            const localExtra = { ...Object.keys(extra).reduce((acc, k) => ({ ...acc, [k]: new Date() }), {} as any) };
            setAppointment((prev) => ({ ...(prev ?? {}), status: newStatus, updatedAt: new Date(), ...localExtra }));
            Alert.alert("Success", `Booking set to ${newStatus}.`);
        } catch (err) {
            console.error("Failed to update status:", err);
            Alert.alert("Error", "Failed to update booking status.");
        } finally {
            setUpdating(false);
        }
    };

    const onAccept = async () => {
        // Only allow accepting if it is pending and provider owns it
        if (!appointment) return;
        if (appointment.status !== "pending") {
            Alert.alert("Cannot accept", "Booking is not pending.");
            return;
        }
        await updateStatus("accepted", { acceptedAt: serverTimestamp() });
    };

    const onComplete = async () => {
        if (!appointment) return;
        if (appointment.status !== "accepted") {
            Alert.alert("Cannot complete", "Booking must be accepted first.");
            return;
        }
        await updateStatus("completed", { completedAt: serverTimestamp() });
    };

    const onCancel = async () => {
        if (!appointment) return;
        await updateStatus("cancelled");
    };

    const onCallParent = async () => {
        const phone = parentData?.phone ?? appointment?.phone;
        if (!phone) {
            Alert.alert("No phone", "Parent phone number not available.");
            return;
        }
        const url = `tel:${phone}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            Linking.openURL(url);
        } else {
            Alert.alert("Cannot call", "This device cannot place calls.");
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#8e44ad" />
            </View>
        );
    }

    if (!appointment) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text>Booking not found.</Text>
            </View>
        );
    }

    // pull fields safely
    const {
        appointmentType,
        createdAt,
        durationHours,
        endTime,
        hour12,
        minute,
        notes,
        providerId,
        providerName: appointmentProviderName,
        ratePerHour,
        schedule,
        startTime,
        status,
        updatedAt,
        userEmail,
        userId,
        date,
        address,
    } = appointment;

    const startLabel =
        startTime
            ? `${startTime.hour12}:${String(startTime.minute ?? "00").padStart(2, "0")} ${startTime.ampm ?? ""}`
            : (hour12 ? `${hour12}:${String(minute ?? "00").padStart(2,"0")} ${appointment.ampm ?? ""}` : "—");


    let endLabel = "—";
    if (endTime && endTime.hour12 !== undefined) {
        endLabel = `${endTime.hour12}:${String(endTime.minute ?? "00").padStart(2,"0")} ${endTime.ampm ?? ""}`;
    } else if (startTime && durationHours) {
        const computed = addHoursToTime(startTime || { hour12, minute, ampm: appointment.ampm }, safeNumber(durationHours));
        if (computed) endLabel = computed;
    }

    const createdLabel = formatDate(createdAt);
    const updatedLabel = updatedAt ? formatDate(updatedAt) : "—";
    const acceptedLabel = appointment.acceptedAt ? formatDate(appointment.acceptedAt) : "—";
    const completedLabel = appointment.completedAt ? formatDate(appointment.completedAt) : "—";

    const hourly = safeNumber(ratePerHour);
    const duration = safeNumber(durationHours);
    const total = hourly * duration;

    const parentDisplayName = parentData?.name ?? userEmail ?? "Parent";

    // status color
    const statusColor =
        status === "completed" ? "#27ae60" :
            status === "accepted" ? "#3b82f6" :
                status === "pending" ? "#f39c12" :
                    status === "cancelled" ? "#e74c3c" : "#8e44ad";

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Appointment summary */}
                <View style={styles.card}>
                    <View style={styles.rowTop}>
                        <View>
                            <Text style={styles.title}>{appointmentProviderName ?? providerData?.name ?? "Provider"}</Text>
                            <Text style={styles.subtle}>{appointmentType ? appointmentType.replace("_", " ") : "service"}</Text>
                        </View>

                        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                            <Text style={styles.statusText}>{(status ?? "—").toString().toUpperCase()}</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>When</Text>
                        <View style={styles.infoRow}>
                            <Ionicons name="calendar-outline" size={16} color="#777" />
                            <Text style={styles.infoText}>{startLabel}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="time-outline" size={16} color="#777" />
                            <Text style={styles.infoText}>From {startLabel} • To {endLabel}</Text>
                        </View>
                        {Array.isArray(schedule?.days) && schedule.days.length > 0 && (
                            <View style={styles.infoRow}>
                                <Ionicons name="repeat-outline" size={16} color="#777" />
                                <Text style={styles.infoText}>Days: {schedule.days.join(", ")}</Text>
                            </View>
                        )}
                        {date && (
                            <View style={styles.infoRow}>
                                <Ionicons name="calendar" size={16} color="#777" />
                                <Text style={styles.infoText}>Date: {date}</Text>
                            </View>
                        )}
                    </View>

                    {address ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Location</Text>
                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={16} color="#777" />
                                <Text style={styles.infoText}>{address}</Text>
                            </View>
                        </View>
                    ) : null}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Payment</Text>
                        <View style={styles.infoRow}>
                            <Ionicons name="cash-outline" size={16} color="#777" />
                            <Text style={styles.infoText}>Rate: ₱{hourly}/hr</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="calculator-outline" size={16} color="#777" />
                            <Text style={styles.infoText}>Duration: {duration} hr{duration !== 1 ? "s" : ""} • Total: ₱{total}</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Parent</Text>
                        <View style={styles.infoRow}>
                            <Ionicons name="person-outline" size={16} color="#777" />
                            <Text style={styles.infoText}>{parentDisplayName}</Text>
                        </View>
                        {parentData?.phone || appointment?.phone ? (
                            <View style={styles.infoRow}>
                                <Ionicons name="call-outline" size={16} color="#777" />
                                <Text style={styles.infoText}>{parentData?.phone ?? appointment?.phone}</Text>
                            </View>
                        ) : null}
                        {userEmail && (
                            <View style={styles.infoRow}>
                                <Ionicons name="mail-outline" size={16} color="#777" />
                                <Text style={styles.infoText}>{userEmail}</Text>
                            </View>
                        )}
                    </View>

                    {notes ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Notes</Text>
                            <Text style={styles.paragraph}>{notes}</Text>
                        </View>
                    ) : null}

                    <View style={styles.metaRowSingle}>
                        <Text style={styles.metaText}>Created: {createdLabel}</Text>
                    </View>
                    <View style={styles.metaRowSingle}>
                        <Text style={styles.metaText}>Updated: {updatedLabel}</Text>
                    </View>
                    <View style={styles.metaRowSingle}>
                        <Text style={styles.metaText}>Accepted: {acceptedLabel}</Text>
                    </View>
                    <View style={styles.metaRowSingle}>
                        <Text style={styles.metaText}>Completed: {completedLabel}</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsBlock}>
                    {/* Updated Message Button */}
                    <TouchableOpacity style={styles.contactBtn} onPress={handleMessagePress}>
                        <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                        <Text style={styles.contactText}>Message Parent</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactBtnSecondary} onPress={onCallParent}>
                        <Ionicons name="call-outline" size={18} color="#8e44ad" />
                        <Text style={[styles.contactTextSecondary]}>Call Parent</Text>
                    </TouchableOpacity>

                    {canManage && (
                        <>
                            {appointment.status === "pending" && (
                                <TouchableOpacity style={styles.primaryBtn} onPress={onAccept} disabled={updating}>
                                    {updating ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
                                    <Text style={styles.primaryText}>Accept Booking</Text>
                                </TouchableOpacity>
                            )}

                            {appointment.status === "accepted" && (
                                <TouchableOpacity style={styles.primaryBtn} onPress={onComplete} disabled={updating}>
                                    {updating ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-done-outline" size={18} color="#fff" />}
                                    <Text style={styles.primaryText}>Mark as Completed</Text>
                                </TouchableOpacity>
                            )}

                            {appointment.status !== "completed" && appointment.status !== "cancelled" && (
                                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={updating}>
                                    {updating ? <ActivityIndicator color="#fff" /> : <Ionicons name="close" size={18} color="#fff" />}
                                    <Text style={styles.cancelText}>Cancel Booking</Text>
                                </TouchableOpacity>
                            )}

                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    centered: { justifyContent: "center", alignItems: "center" },
    header: {
        backgroundColor: "#b58dde",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 45,
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
    scrollContent: { padding: 20, paddingBottom: 120 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 16,
    },
    rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { fontSize: 20, fontWeight: "700", color: "#333" },
    subtle: { color: "#777", marginTop: 2 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusText: { color: "#fff", fontWeight: "700" },

    section: { marginTop: 12 },
    sectionTitle: { fontWeight: "700", color: "#333", marginBottom: 6 },
    infoRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    infoText: { marginLeft: 8, color: "#444", fontSize: 14 },
    paragraph: {
        backgroundColor: "#F8F6FB",
        padding: 10,
        borderRadius: 8,
        color: "#444",
    },

    metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
    metaText: { color: "#888", fontSize: 12 },

    actionsBlock: {
        marginTop: 6,
        gap: 8,
    },

    contactBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#8e44ad",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        justifyContent: "center",
        marginBottom: 8,
    },
    contactText: { color: "#fff", marginLeft: 8, fontWeight: "700" },

    contactBtnSecondary: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F4EDFF",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        justifyContent: "center",
        marginBottom: 8,
    },
    contactTextSecondary: { color: "#8e44ad", marginLeft: 8, fontWeight: "700" },

    primaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#27ae60",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        justifyContent: "center",
        marginBottom: 8,
    },
    primaryText: { color: "#fff", marginLeft: 8, fontWeight: "700" },

    cancelBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#e74c3c",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        justifyContent: "center",
        marginBottom: 8,
    },
    cancelText: { color: "#fff", marginLeft: 8, fontWeight: "700" },
    metaRowSingle: { marginTop: 8 },
});