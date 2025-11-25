// app/myBookings.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Pressable,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../firebaseConfig';
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    Query,
    QuerySnapshot,
    DocumentData,
    doc,
    getDoc,
    getDocs,
    addDoc,
} from 'firebase/firestore';

type Booking = {
    id: string;
    name: string; // provider name
    distance: string;
    rating: number; // average rating (computed)
    reviews: number; // review count
    price: number;
    favorite?: boolean;
    status: string;
    providerId?: string;
    picture?: string | null; // data URI or remote url
    _createdAt?: number;
};

const MyBookingsListScreen: React.FC = () => {
    const router = useRouter();
    const [selectedTab, setSelectedTab] = useState<'All' | 'Pending' | 'Accepted' | 'Completed'>('All');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    // startConversation — fixed param names so ChatScreen receives otherUserName / otherUserId / userType
    const startConversation = async (providerId: string, providerName: string) => {
        const auth = getAuth();
        if (!providerId || !auth.currentUser) return;

        try {
            const currentUser = auth.currentUser;

            // Check if conversation already exists
            const existingConvQuery = query(
                collection(db, 'conversations'),
                where('participants', 'array-contains', currentUser.uid)
            );

            const querySnapshot = await getDocs(existingConvQuery);
            let existingConversation: any = null;

            querySnapshot.forEach((docSnap) => {
                const conversation = docSnap.data();
                if (conversation.participants && conversation.participants.includes(providerId)) {
                    existingConversation = { id: docSnap.id, ...conversation };
                }
            });

            if (existingConversation) {
                // Use param names expected by ChatScreen
                router.push(
                    `/chat?conversationId=${existingConversation.id}&otherUserName=${encodeURIComponent(
                        providerName
                    )}&otherUserId=${encodeURIComponent(providerId)}&userType=provider`
                );
            } else {
                const newConversation = {
                    participants: [currentUser.uid, providerId],
                    participantNames: [currentUser.displayName || 'User', providerName],
                    lastMessage: 'Conversation started',
                    lastMessageTime: new Date(),
                    unread: false,
                    lastMessageSender: currentUser.uid,
                };

                const docRef = await addDoc(collection(db, 'conversations'), newConversation);

                router.push(
                    `/chat?conversationId=${docRef.id}&otherUserName=${encodeURIComponent(
                        providerName
                    )}&otherUserId=${encodeURIComponent(providerId)}&userType=provider`
                );
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
        }
    };

    useEffect(() => {
        const auth = getAuth();
        const unsubscribers: Array<() => void> = [];

        const cleanup = () => {
            unsubscribers.forEach((u) => {
                try {
                    u();
                } catch (e) {
                    /* ignore */
                }
            });
            unsubscribers.length = 0;
        };

        // provider cache to avoid refetching the same provider many times
        const providerCache = new Map<string, { avg: number; count: number; picture?: string | null }>();

        const mapDocToBooking = (docData: DocumentData) => {
            const d = docData as any;
            const rawStatus = (d.status ?? 'pending').toString().toLowerCase();
            const statusLabel =
                rawStatus === 'accepted'
                    ? 'Accepted'
                    : rawStatus === 'completed'
                        ? 'Completed'
                        : rawStatus === 'cancelled'
                            ? 'Cancelled'
                            : 'Pending';

            let createdAtNum = 0;
            try {
                if (d.createdAt) {
                    if (typeof d.createdAt.toMillis === 'function') {
                        createdAtNum = d.createdAt.toMillis();
                    } else if (typeof d.createdAt === 'number') {
                        createdAtNum = d.createdAt;
                    } else {
                        createdAtNum = new Date(d.createdAt).getTime();
                    }
                }
            } catch (e) {
                createdAtNum = 0;
            }

            return {
                id: docData.id,
                name: d.providerName ?? 'Provider',
                distance: d.providerDistance ?? d.distance ?? '—',
                rating: typeof d.providerRating === 'number' ? d.providerRating : 0,
                reviews: typeof d.providerReviews === 'number' ? d.providerReviews : 0,
                price: typeof d.ratePerHour === 'number' ? d.ratePerHour : parseFloat(d.ratePerHour || '0') || 0,
                favorite: false,
                status: statusLabel,
                providerId: d.providerId,
                _createdAt: createdAtNum,
            } as Booking;
        };

        // handleSnapshot is async because we fetch provider docs
        const handleSnapshot = async (snap: QuerySnapshot<DocumentData>, docsMap: Map<string, Booking>) => {
            try {
                // integrate snapshot docs into docsMap
                snap.docs.forEach((docSnap) => {
                    const booking = mapDocToBooking({ id: docSnap.id, ...docSnap.data() });
                    docsMap.set(booking.id, booking);
                });

                // create array from map, sort by createdAt desc (fallback to id if no date)
                const arr = Array.from(docsMap.values()).sort((a, b) => {
                    const ta = a._createdAt ?? 0;
                    const tb = b._createdAt ?? 0;
                    if (ta === tb) return a.id.localeCompare(b.id);
                    return tb - ta;
                });

                // collect unique providerIds we need to ensure have provider info for
                const providerIds = Array.from(new Set(arr.map((r) => r.providerId).filter(Boolean)));

                // fetch provider docs for ids not in cache
                const missing = providerIds.filter((id) => !providerCache.has(id!));
                if (missing.length > 0) {
                    await Promise.all(
                        missing.map(async (pid) => {
                            try {
                                const pref = doc(db, 'providers', pid!);
                                const psnap = await getDoc(pref);
                                if (!psnap.exists()) {
                                    providerCache.set(pid!, { avg: 0, count: 0, picture: null });
                                    return;
                                }
                                const p = psnap.data() as any;
                                const reviews: any[] = Array.isArray(p.reviews) ? p.reviews : [];
                                let sum = 0;
                                let count = 0;
                                for (const r of reviews) {
                                    if (!r) continue;
                                    const rr = typeof r.rating === 'number' ? r.rating : parseFloat(r.rating) || 0;
                                    if (rr > 0) {
                                        sum += rr;
                                        count++;
                                    }
                                }
                                const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 0; // one decimal
                                // clean picture field: if it's like url(data:...), extract inner data URI
                                let pic: string | null = null;
                                if (typeof p.picture === 'string' && p.picture.trim() !== '') {
                                    const s = p.picture.trim();
                                    const extracted = s.replace(/^url\((['"])?/, '').replace(/(['"])?\)$/, '');
                                    pic = extracted;
                                } else {
                                    pic = null;
                                }
                                providerCache.set(pid!, { avg, count, picture: pic });
                            } catch (err) {
                                console.warn('failed to load provider', pid, err);
                                providerCache.set(pid!, { avg: 0, count: 0, picture: null });
                            }
                        })
                    );
                }

                // merge provider info into bookings array
                const merged = arr.map((b) => {
                    const info = b.providerId ? providerCache.get(b.providerId) : undefined;
                    return {
                        ...b,
                        rating: info ? info.avg : b.rating,
                        reviews: info ? info.count : b.reviews,
                        picture: info ? info.picture ?? null : null,
                    };
                });

                // strip internal _createdAt before setting state
                const cleaned = merged.map(({ _createdAt, ...rest }) => rest);
                setBookings(cleaned);
                setLoading(false);
            } catch (err) {
                console.warn('handleSnapshot error', err);
                // fallback: set whatever docsMap has
                const arr = Array.from(docsMap.values()).map(({ _createdAt, ...rest }) => rest);
                setBookings(arr);
                setLoading(false);
            }
        };

        const authUnsub = onAuthStateChanged(auth, (user) => {
            // clear previous listeners if any
            cleanup();
            setBookings([]);
            setLoading(true);

            if (!user) {
                setBookings([]);
                setLoading(false);
                return;
            }

            const queries: Query<DocumentData>[] = [];

            try {
                if (user.uid) {
                    queries.push(
                        query(collection(db, 'appointments'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
                    );
                }
            } catch (e) {
                // ignore
            }

            if (user.email) {
                try {
                    queries.push(
                        query(collection(db, 'appointments'), where('userEmail', '==', user.email), orderBy('createdAt', 'desc'))
                    );
                } catch (e) {
                    // ignore
                }
            }

            if (queries.length === 0) {
                setLoading(false);
                return;
            }

            // We'll merge results from all snapshots into a map keyed by doc.id
            const docsMap = new Map<string, Booking>();

            queries.forEach((q) => {
                const unsub = onSnapshot(
                    q,
                    (snap) => {
                        // call async handler (fire-and-forget is OK here)
                        handleSnapshot(snap, docsMap);
                    },
                    (err) => {
                        console.warn('appointments onSnapshot error:', err);
                        setLoading(false);
                    }
                );
                unsubscribers.push(unsub);
            });
        });

        // make sure we unsubscribe auth listener on cleanup
        return () => {
            try {
                authUnsub();
            } catch (e) {
                /* ignore */
            }
            cleanup();
        };
    }, []);

    const filteredBookings = bookings.filter((booking) => {
        if (selectedTab === 'All') return true;
        return booking.status.toLowerCase() === selectedTab.toLowerCase();
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/user/home')}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.tabs}>
                {['All', 'Pending', 'Accepted', 'Completed'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, selectedTab === tab && styles.tabActive]}
                        onPress={() => setSelectedTab(tab as any)}
                    >
                        <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {loading ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#b58dde" />
                        <Text style={{ marginTop: 12, color: '#666' }}>Loading bookings…</Text>
                    </View>
                ) : filteredBookings.length > 0 ? (
                    filteredBookings.map((b) => (
                        // Make entire card pressable to view details
                        <TouchableOpacity
                            key={b.id}
                            style={styles.card}
                            onPress={() => router.push({ pathname: '/user/booking_details', params: { id: b.id } })}
                        >
                            <View style={styles.leftSection}>
                                {b.picture ? (
                                    // picture may already be a data URI like data:image/..., or wrapped in url(...) — we cleaned it earlier
                                    <Image
                                        source={{ uri: b.picture }}
                                        style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#EDE4F7' }}
                                    />
                                ) : (
                                    <Ionicons name="person-circle-outline" size={50} color="#b58dde" />
                                )}
                            </View>

                            <View style={styles.middleSection}>
                                <Text style={styles.name}>{b.name}</Text>
                                <View style={styles.row}>
                                    <Ionicons name="location-outline" size={14} color="#777" />
                                    <Text style={styles.mutedText}>{b.distance}</Text>
                                </View>
                                <View style={styles.row}>
                                    <Ionicons name="star" size={14} color="#f1c40f" />
                                    <Text style={styles.mutedText}>
                                        {b.rating} | {b.reviews} reviews
                                    </Text>
                                </View>

                                <View style={styles.actionsRow}>
                                    <View
                                        style={[
                                            styles.statusBox,
                                            b.status === 'Pending' && styles.statusPending,
                                            b.status === 'Accepted' && styles.statusAccepted,
                                            b.status === 'Completed' && styles.statusCompleted,
                                            b.status === 'Cancelled' && { backgroundColor: '#f8d7da' },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusText,
                                                b.status === 'Pending' && styles.statusTextPending,
                                                b.status === 'Accepted' && styles.statusTextAccepted,
                                                b.status === 'Completed' && styles.statusTextCompleted,
                                                b.status === 'Cancelled' && { color: '#721c24' },
                                            ]}
                                        >
                                            {b.status}
                                        </Text>
                                    </View>

                                    <Pressable
                                        style={styles.messageBtn}
                                        onPress={() => {
                                            if (b.providerId) {
                                                // Use the startConversation function instead of going directly to message
                                                startConversation(b.providerId, b.name);
                                            } else {
                                                // Fallback if no providerId
                                                router.push('/message');
                                            }
                                        }}
                                        onPressIn={(e) => e.stopPropagation()} // prevent parent card press
                                    >
                                        <Ionicons name="chatbubble-outline" size={14} color="#fff" />
                                        <Text style={styles.messageText}>Message now</Text>
                                    </Pressable>
                                </View>
                            </View>

                            <View style={styles.rightSection}>
                                <Ionicons name={b.favorite ? 'heart' : 'heart-outline'} size={20} color={b.favorite ? 'red' : '#aaa'} />
                                <Text style={styles.price}>₱{b.price}</Text>
                                <Text style={styles.perHour}>per hour</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyStateText}>No {selectedTab.toLowerCase()} bookings found</Text>
                        <Text style={styles.emptyStateSubText}>
                            {selectedTab === 'All' ? "You don't have any bookings yet" : `You don't have any ${selectedTab.toLowerCase()} bookings`}
                        </Text>
                    </View>
                )}
            </ScrollView>

            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push('/user/home')}>
                    <Ionicons name="home-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/user/bookinglists')}>
                    <Ionicons name="calendar-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/user/search')}>
                    <Ionicons name="search-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/message')}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/user/account')}>
                    <Ionicons name="person-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        backgroundColor: '#b58dde',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 45,
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },

    tabs: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: '#f8f8f8',
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tabActive: {
        backgroundColor: '#b58dde',
    },
    tabText: { color: '#777', fontSize: 14 },
    tabTextActive: { color: '#fff', fontWeight: '600' },

    scroll: {
        padding: 16,
        flexGrow: 1,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    leftSection: { justifyContent: 'center', alignItems: 'center' },
    middleSection: { flex: 1, marginLeft: 10 },
    rightSection: { alignItems: 'flex-end', justifyContent: 'center' },
    name: { fontWeight: '600', fontSize: 16 },
    row: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    mutedText: { color: '#777', fontSize: 12, marginLeft: 4 },
    price: { fontSize: 16, fontWeight: '600', color: '#8e44ad' },
    perHour: { fontSize: 10, color: '#777' },

    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    statusBox: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        marginRight: 10,
    },
    statusPending: {
        backgroundColor: '#fff3cd',
    },
    statusAccepted: {
        backgroundColor: '#d1ecf1',
    },
    statusCompleted: {
        backgroundColor: '#d4edda',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusTextPending: {
        color: '#856404',
    },
    statusTextAccepted: {
        color: '#0c5460',
    },
    statusTextCompleted: {
        color: '#155724',
    },
    messageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#b58dde',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    messageText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },

    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateSubText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },

    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: '#eee',
    },
});

export default MyBookingsListScreen;
