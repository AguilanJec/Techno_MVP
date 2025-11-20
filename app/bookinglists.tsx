// app/myBookings.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db } from '../firebaseConfig';
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    Query,
    QuerySnapshot,
    DocumentData,
} from 'firebase/firestore';

type Booking = {
    id: string;
    name: string; // provider name
    distance: string;
    rating: number;
    reviews: number;
    price: number;
    favorite?: boolean;
    status: string;
    providerId?: string;
    // internal use: for sorting only (not required in UI)
    _createdAt?: number;
};

const MyBookingsListScreen: React.FC = () => {
    const router = useRouter();
    const [selectedTab, setSelectedTab] = useState<'All' | 'Pending' | 'Ongoing'>('All');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth();
        // Keep track of unsubscribe functions from all listeners
        const unsubscribers: Array<() => void> = [];

        const cleanup = () => {
            unsubscribers.forEach((u) => {
                try { u(); } catch (e) { /* ignore */ }
            });
            unsubscribers.length = 0;
        };

        const mapDocToBooking = (doc: DocumentData) => {
            const d = doc as any;
            const rawStatus = (d.status ?? 'pending').toString().toLowerCase();
            const statusLabel =
                rawStatus === 'ongoing' ? 'Ongoing' : rawStatus === 'completed' ? 'Completed' : 'Pending';

            // parse createdAt safely to a number for sorting
            let createdAtNum = 0;
            try {
                if (d.createdAt) {
                    // Firestore Timestamp has toMillis()
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
                id: doc.id,
                name: d.providerName ?? 'Provider',
                distance: d.providerDistance ?? d.distance ?? '—',
                rating: typeof d.providerRating === 'number' ? d.providerRating : 0,
                reviews: typeof d.providerReviews === 'number' ? d.providerReviews : 0,
                price:
                    typeof d.ratePerHour === 'number'
                        ? d.ratePerHour
                        : parseFloat(d.ratePerHour || '0') || 0,
                favorite: false,
                status: statusLabel,
                providerId: d.providerId,
                _createdAt: createdAtNum,
            } as Booking;
        };

        const handleSnapshot = (snap: QuerySnapshot<DocumentData>, docsMap: Map<string, Booking>) => {
            snap.docs.forEach((doc) => {
                const booking = mapDocToBooking({ id: doc.id, ...doc.data() });
                docsMap.set(booking.id, booking);
            });

            // create array from map, sort by createdAt desc (fallback to id if no date)
            const arr = Array.from(docsMap.values()).sort((a, b) => {
                const ta = a._createdAt ?? 0;
                const tb = b._createdAt ?? 0;
                // newest first
                if (ta === tb) return a.id.localeCompare(b.id);
                return tb - ta;
            });

            // strip internal _createdAt before setting state
            const cleaned = arr.map(({ _createdAt, ...rest }) => rest);
            setBookings(cleaned);
            setLoading(false);
        };

        const authUnsub = onAuthStateChanged(auth, (user) => {
            // clear previous listeners if any
            console.log("AUTH USER:", user?.uid, user?.email);
            cleanup();
            setBookings([]);
            setLoading(true);

            if (!user) {
                setBookings([]);
                setLoading(false);
                return;
            }

            // Build queries: by userId (auth uid) and by userEmail (auth email).
            const queries: Query<DocumentData>[] = [];

            try {
                if (user.uid) {
                    queries.push(
                        query(
                            collection(db, 'appointments'),
                            where('userId', '==', user.uid),
                            orderBy('createdAt', 'desc')
                        )
                    );
                }
            } catch (e) {
                // If orderBy on createdAt isn't valid for your data, remove orderBy above.
            }

            if (user.email) {
                try {
                    queries.push(
                        query(
                            collection(db, 'appointments'),
                            where('userEmail', '==', user.email),
                            orderBy('createdAt', 'desc')
                        )
                    );
                } catch (e) {
                    // ignore
                }
            }

            // If we couldn't build any query, bail out
            if (queries.length === 0) {
                setLoading(false);
                return;
            }

            // We'll merge results from all snapshots into a map keyed by doc.id
            const docsMap = new Map<string, Booking>();

            // subscribe to each query and keep unsubscribers
            queries.forEach((q) => {
                const unsub = onSnapshot(
                    q,
                    (snap) => {
                        handleSnapshot(snap, docsMap);
                    },
                    (err) => {
                        console.warn('appointments onSnapshot error:', err);
                        // if error, still set loading to false but don't blow up
                        setLoading(false);
                    }
                );
                unsubscribers.push(unsub);
            });
        });

        // make sure we unsubscribe auth listener on cleanup
        return () => {
            try { authUnsub(); } catch (e) { /* ignore */ }
            cleanup();
        };
    }, []);

    // Filter bookings based on selected tab
    const filteredBookings = bookings.filter((booking) => {
        if (selectedTab === 'All') return true;
        return booking.status.toLowerCase() === selectedTab.toLowerCase();
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/home')}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.tabs}>
                {['All', 'Pending', 'Ongoing'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, (selectedTab === tab) && styles.tabActive]}
                        onPress={() => setSelectedTab(tab as any)}
                    >
                        <Text style={[styles.tabText, (selectedTab === tab) && styles.tabTextActive]}>
                            {tab}
                        </Text>
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
                        <View key={b.id} style={styles.card}>
                            <View style={styles.leftSection}>
                                <Ionicons name="person-circle-outline" size={50} color="#b58dde" />
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
                                            b.status === 'Ongoing' && styles.statusOngoing,
                                            b.status === 'Completed' && styles.statusCompleted,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusText,
                                                b.status === 'Pending' && styles.statusTextPending,
                                                b.status === 'Ongoing' && styles.statusTextOngoing,
                                                b.status === 'Completed' && styles.statusTextCompleted,
                                            ]}
                                        >
                                            {b.status}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.messageBtn}
                                        onPress={() => {
                                            if (b.providerId) {
                                                router.push({ pathname: '/message', params: { providerId: b.providerId } });
                                            } else {
                                                router.push('/message');
                                            }
                                        }}
                                    >
                                        <Ionicons name="chatbubble-outline" size={14} color="#fff" />
                                        <Text style={styles.messageText}>Message now</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.rightSection}>
                                <Ionicons
                                    name={b.favorite ? 'heart' : 'heart-outline'}
                                    size={20}
                                    color={b.favorite ? 'red' : '#aaa'}
                                />
                                <Text style={styles.price}>₱{b.price}</Text>
                                <Text style={styles.perHour}>per hour</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyStateText}>No {selectedTab.toLowerCase()} bookings found</Text>
                        <Text style={styles.emptyStateSubText}>
                            {selectedTab === 'All'
                                ? "You don't have any bookings yet"
                                : `You don't have any ${selectedTab.toLowerCase()} bookings`}
                        </Text>
                    </View>
                )}
            </ScrollView>

            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => router.push('/home')}>
                    <Ionicons name="home-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/bookinglists')}>
                    <Ionicons name="calendar-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/search')}>
                    <Ionicons name="search-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/message')}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e44ad" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/account')}>
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
    statusOngoing: {
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
    statusTextOngoing: {
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

    // Empty state styles
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
