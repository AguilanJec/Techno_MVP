// app/booking_details.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebaseConfig';
import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    arrayUnion,
} from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

type Appointment = {
    id: string;
    appointmentType?: string;
    date?: string;
    startTime?: any;
    endTime?: any;
    notes?: string;
    status?: string;
    providerName?: string;
    providerId?: string;
    ratePerHour?: number;
    durationHours?: number;
    userId?: string;
    userEmail?: string;
    schedule?: {
        days?: string[];
        name?: string;
    };
    createdAt?: any;
    updatedAt?: any;
};

function pad(n: number) {
    return n < 10 ? `0${n}` : `${n}`;
}

function toDecimalHour(hour12: number, minute: string, ampm: 'AM' | 'PM') {
    let hour24 = hour12 % 12;
    if (ampm === 'PM') hour24 += 12;
    return hour24 + parseInt(minute, 10) / 60;
}

function timeLabel(hour12: number, minute: string, ampm: 'AM' | 'PM') {
    return `${hour12}:${minute} ${ampm}`;
}

function formatAppointmentType(type?: string): string {
    switch (type) {
        case 'one_time':
            return 'One-time Appointment';
        case 'schedule':
            return 'Scheduled (Recurring)';
        default:
            return type ?? '—';
    }
}

function formatDays(days?: string[]): string {
    if (!days || days.length === 0) return '—';

    const dayMap: { [key: string]: string } = {
        'mon': 'Monday',
        'tue': 'Tuesday',
        'wed': 'Wednesday',
        'thu': 'Thursday',
        'fri': 'Friday',
        'sat': 'Saturday',
        'sun': 'Sunday'
    };

    return days.map(day => dayMap[day] || day).join(', ');
}

function formatTimestamp(timestamp: any): string {
    if (!timestamp) return '—';
    try {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return '—';
    }
}

function calculateTotalCost(ratePerHour?: number, durationHours?: number): string {
    if (!ratePerHour || !durationHours) return '—';
    return `₱${(ratePerHour * durationHours).toFixed(2)}`;
}

export default function BookingDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const appointmentId = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined);

    const [loading, setLoading] = useState(true);
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // editable fields (mirrors DB shape)
    const [date, setDate] = useState<string | null>(null); // yyyy-mm-dd
    const [startHour, setStartHour] = useState<number>(7);
    const [startMinute, setStartMinute] = useState<string>('30');
    const [startAmpm, setStartAmpm] = useState<'AM' | 'PM'>('AM');

    const [endHour, setEndHour] = useState<number>(9);
    const [endMinute, setEndMinute] = useState<string>('30');
    const [endAmpm, setEndAmpm] = useState<'AM' | 'PM'>('AM');

    const [notes, setNotes] = useState('');

    // native pickers
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end'>('start');

    // review states
    const [reviewRating, setReviewRating] = useState<number>(5);
    const [reviewComment, setReviewComment] = useState<string>('');
    const [postingReview, setPostingReview] = useState<boolean>(false);
    const [hasReviewed, setHasReviewed] = useState<boolean>(false);

    const auth = getAuth();
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!appointmentId) return;
        (async () => {
            setLoading(true);
            try {
                // load appointment
                const ref = doc(db, 'appointments', appointmentId);
                const snap = await getDoc(ref);
                if (!snap.exists()) {
                    Alert.alert('Not found', 'Appointment not found');
                    setAppointment(null);
                    setLoading(false);
                    return;
                }
                const d = snap.data() as any;
                const appt: Appointment = {
                    id: snap.id,
                    appointmentType: d.appointmentType,
                    date: d.date,
                    startTime: d.startTime,
                    endTime: d.endTime,
                    notes: d.notes,
                    status: d.status,
                    providerName: d.providerName,
                    providerId: d.providerId,
                    ratePerHour: d.ratePerHour,
                    durationHours: d.durationHours,
                    userId: d.userId,
                    userEmail: d.userEmail,
                    schedule: d.schedule,
                    createdAt: d.createdAt,
                    updatedAt: d.updatedAt,
                };
                setAppointment(appt);

                // populate editable state
                setDate(d.date ?? null);

                if (d.startTime) {
                    setStartHour(typeof d.startTime.hour12 === 'number' ? d.startTime.hour12 : Number(d.startTime.hour12) || 7);
                    setStartMinute(d.startTime.minute ?? '00');
                    setStartAmpm((d.startTime.ampm ?? 'AM') as 'AM' | 'PM');
                }

                if (d.endTime) {
                    setEndHour(typeof d.endTime.hour12 === 'number' ? d.endTime.hour12 : Number(d.endTime.hour12) || 8);
                    setEndMinute(d.endTime.minute ?? '00');
                    setEndAmpm((d.endTime.ampm ?? 'AM') as 'AM' | 'PM');
                }

                setNotes(d.notes ?? '');

                // If appointment is completed, check if user already reviewed provider
                if ((d.status ?? '').toString().toLowerCase() === 'completed' && d.providerId && currentUser) {
                    try {
                        const pref = doc(db, 'providers', d.providerId);
                        const psnap = await getDoc(pref);
                        if (psnap.exists()) {
                            const p = psnap.data() as any;
                            const reviews: any[] = Array.isArray(p.reviews) ? p.reviews : [];
                            // check any review with reviewer === currentUser.uid and appointmentId === appointmentId
                            const already = reviews.some((r) => r && r.reviewer === currentUser.uid && r.appointmentId === appointmentId);
                            setHasReviewed(Boolean(already));
                        } else {
                            setHasReviewed(false);
                        }
                    } catch (err) {
                        console.warn('Failed to check provider reviews:', err);
                        setHasReviewed(false);
                    }
                } else {
                    setHasReviewed(false);
                }
            } catch (err) {
                console.error('Failed to load appointment:', err);
                Alert.alert('Error', 'Failed to load appointment');
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appointmentId, currentUser?.uid]);

    const canEdit = useMemo(() => {
        if (!appointment) return false;
        return (appointment.status ?? '').toLowerCase() === 'pending';
    }, [appointment]);

    const durationHours = useMemo(() => {
        const s = toDecimalHour(startHour, startMinute, startAmpm);
        const e = toDecimalHour(endHour, endMinute, endAmpm);
        let diff = e - s;
        if (diff <= 0) diff += 24;
        return diff;
    }, [startHour, startMinute, startAmpm, endHour, endMinute, endAmpm]);

    const totalCost = useMemo(() => {
        return calculateTotalCost(appointment?.ratePerHour, durationHours);
    }, [appointment?.ratePerHour, durationHours]);

    // helpers for date/time pickers
    function openTimePicker(target: 'start' | 'end') {
        setTimePickerTarget(target);
        setShowTimePicker(true);
    }

    function onDateSelected(event: any, d?: Date) {
        setShowDatePicker(false);
        if (event?.type === 'dismissed') return;
        if (!d) return;
        const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        setDate(iso);
    }

    function onTimeSelected(event: any, d?: Date) {
        setShowTimePicker(false);
        if (!d || (event && event.type === 'dismissed')) return;
        const h24 = d.getHours();
        const m = d.getMinutes();
        const ampm = h24 >= 12 ? 'PM' : 'AM';
        let h12 = h24 % 12;
        if (h12 === 0) h12 = 12;
        const roundedMin = m < 15 ? 0 : m < 45 ? 30 : 0;
        let carry = 0;
        if (roundedMin === 0 && m >= 45) carry = 1;
        let finalHour24 = h24 + carry;
        finalHour24 = finalHour24 % 24;
        const finalAmpm = finalHour24 >= 12 ? 'PM' : 'AM';
        let finalHour12 = finalHour24 % 12;
        if (finalHour12 === 0) finalHour12 = 12;

        const minuteStr = pad(roundedMin);

        if (timePickerTarget === 'start') {
            setStartHour(finalHour12);
            setStartMinute(minuteStr);
            setStartAmpm(finalAmpm as 'AM' | 'PM');

            // ensure end is after start; if not bump end by 1 hour
            const startDec = toDecimalHour(finalHour12, minuteStr, finalAmpm as 'AM' | 'PM');
            const endDec = toDecimalHour(endHour, endMinute, endAmpm);
            if (endDec - startDec <= 0) {
                let newEnd = startDec + 1;
                if (newEnd >= 24) newEnd -= 24;
                const newHour24 = Math.floor(newEnd);
                const newMin = Math.round((newEnd - Math.floor(newEnd)) * 60);
                const r = newMin < 15 ? 0 : newMin < 45 ? 30 : 0;
                let c = 0;
                if (r === 0 && newMin >= 45) c = 1;
                let fHour24 = newHour24 + c;
                fHour24 = fHour24 % 24;
                const fAmpm = fHour24 >= 12 ? 'PM' : 'AM';
                let fHour12 = fHour24 % 12;
                if (fHour12 === 0) fHour12 = 12;
                setEndHour(fHour12);
                setEndMinute(pad(r));
                setEndAmpm(fAmpm as 'AM' | 'PM');
            }
        } else {
            setEndHour(finalHour12);
            setEndMinute(minuteStr);
            setEndAmpm(finalAmpm as 'AM' | 'PM');

            // ensure end > start; if not, set end = start + 1
            const startDec = toDecimalHour(startHour, startMinute, startAmpm);
            const endDecNew = toDecimalHour(finalHour12, minuteStr, finalAmpm as 'AM' | 'PM');
            if (endDecNew - startDec <= 0) {
                let newEnd = startDec + 1;
                if (newEnd >= 24) newEnd -= 24;
                const newHour24 = Math.floor(newEnd);
                const newMin = Math.round((newEnd - Math.floor(newEnd)) * 60);
                const r = newMin < 15 ? 0 : newMin < 45 ? 30 : 0;
                let c = 0;
                if (r === 0 && newMin >= 45) c = 1;
                let fHour24 = newHour24 + c;
                fHour24 = fHour24 % 24;
                const fAmpm = fHour24 >= 12 ? 'PM' : 'AM';
                let fHour12 = fHour24 % 12;
                if (fHour12 === 0) fHour12 = 12;
                setEndHour(fHour12);
                setEndMinute(pad(r));
                setEndAmpm(fAmpm as 'AM' | 'PM');
            }
        }
    }

    async function saveChanges() {
        if (!appointment) return;
        if (!currentUser) {
            Alert.alert('Not signed in', 'You must be signed in to edit this booking.');
            return;
        }
        if (appointment.userId && currentUser.uid !== appointment.userId) {
            Alert.alert('Forbidden', 'You can only edit your own bookings.');
            return;
        }
        // basic validation
        if (appointment.appointmentType === 'one_time' && !date) {
            Alert.alert('Invalid', 'Please choose a date.');
            return;
        }
        if (durationHours <= 0) {
            Alert.alert('Invalid time', 'End time must be after start time.');
            return;
        }

        setSaving(true);
        try {
            const ref = doc(db, 'appointments', appointment.id);
            const payload: any = {
                startTime: {
                    hour12: startHour,
                    minute: startMinute,
                    ampm: startAmpm,
                },
                endTime: {
                    hour12: endHour,
                    minute: endMinute,
                    ampm: endAmpm,
                },
                durationHours: durationHours,
                notes: notes || '',
                updatedAt: serverTimestamp(),
            };

            if (appointment.appointmentType === 'one_time') {
                payload.date = date;
            }

            await updateDoc(ref, payload);
            Alert.alert('Saved', 'Your booking has been updated.');
            setEditing(false);

            // reload appointment (simple approach: update local state too)
            setAppointment((prev) => prev ? {
                ...prev,
                date: payload.date ?? prev.date,
                startTime: payload.startTime,
                endTime: payload.endTime,
                notes: payload.notes,
                durationHours: payload.durationHours,
                updatedAt: serverTimestamp(),
            } : prev);
        } catch (err) {
            console.error('Failed to save:', err);
            Alert.alert('Error', 'Failed to update booking. Try again.');
        } finally {
            setSaving(false);
        }
    }

    async function cancelBooking() {
        if (!appointment) return;
        Alert.alert(
            'Cancel booking',
            'Are you sure you want to cancel this booking?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            const ref = doc(db, 'appointments', appointment.id);
                            await updateDoc(ref, {
                                status: 'cancelled',
                                cancelledAt: serverTimestamp(),
                                updatedAt: serverTimestamp(),
                            });
                            Alert.alert('Cancelled', 'Your booking was cancelled.');
                            // update local
                            setAppointment((p) => p ? { ...p, status: 'cancelled' } : p);
                            setEditing(false);
                        } catch (err) {
                            console.error('Cancel failed:', err);
                            Alert.alert('Error', 'Failed to cancel booking. Try again.');
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    }

    async function submitReview() {
        if (!appointment) return;
        if (!currentUser) {
            Alert.alert('Not signed in', 'You must be signed in to submit a review.');
            return;
        }
        if (appointment.userId && currentUser.uid !== appointment.userId) {
            Alert.alert('Forbidden', 'You can only review your own completed bookings.');
            return;
        }
        if (!appointment.providerId) {
            Alert.alert('Missing provider', 'Provider id not available for this booking.');
            return;
        }
        if (hasReviewed) {
            Alert.alert('Already reviewed', 'You already submitted a review for this booking.');
            return;
        }

        // basic validation
        if (reviewRating < 1 || reviewRating > 5) {
            Alert.alert('Invalid rating', 'Please select a rating between 1 and 5.');
            return;
        }

        setPostingReview(true);
        try {
            const providerRef = doc(db, 'providers', appointment.providerId);
            // review object — include appointmentId for reference
            const newReview = {
                comment: reviewComment || '',
                date: new Date(),
                rating: reviewRating,
                reviewer: currentUser.uid,
                appointmentId: appointment.id,
            };

            // append to providers.reviews array (creates field if missing)
            await updateDoc(providerRef, {
                reviews: arrayUnion(newReview),
                updatedAt: serverTimestamp(),
            });

            Alert.alert('Thanks!', 'Your review has been posted.');
            setHasReviewed(true);
            // optionally clear fields
            setReviewComment('');
        } catch (err) {
            console.error('Failed to post review:', err);
            Alert.alert('Error', 'Failed to submit review. Try again.');
        } finally {
            setPostingReview(false);
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#b58dde" />
            </View>
        );
    }

    if (!appointment) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Booking details</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.scroll}>
                    <Text style={{ marginTop: 40, textAlign: 'center' }}>Booking not found.</Text>
                </View>
            </View>
        );
    }

    const statusLower = (appointment.status ?? 'pending').toLowerCase();
    const isOwner = currentUser && appointment.userId === currentUser.uid;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Main Booking Card */}
                <View style={styles.card}>
                    <Text style={styles.title}>{appointment.providerName ?? 'Provider'}</Text>

                    {/* Status Badge */}
                    <View style={{ marginTop: 8 }}>
                        <Text style={styles.smallLabel}>Status</Text>
                        <View style={[styles.statusBox, statusLower === 'pending' && styles.statusPending, statusLower === 'ongoing' && styles.statusOngoing, statusLower === 'completed' && styles.statusCompleted, statusLower === 'cancelled' && styles.statusCancelled]}>
                            <Text style={[styles.statusText, statusLower === 'pending' && styles.statusTextPending, statusLower === 'ongoing' && styles.statusTextOngoing, statusLower === 'completed' && styles.statusTextCompleted, statusLower === 'cancelled' && styles.statusTextCancelled]}>
                                {appointment.status?.toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    {/* Appointment Type */}
                    <View style={{ marginTop: 12 }}>
                        <Text style={styles.smallLabel}>Appointment Type</Text>
                        <Text style={styles.valueText}>{formatAppointmentType(appointment.appointmentType)}</Text>
                    </View>

                    {/* Schedule Details for Recurring Appointments */}
                    {appointment.appointmentType === 'schedule' && appointment.schedule && (
                        <>
                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.smallLabel}>Schedule Days</Text>
                                <Text style={styles.valueText}>{formatDays(appointment.schedule.days)}</Text>
                            </View>
                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.smallLabel}>Schedule Name</Text>
                                <Text style={styles.valueText}>{appointment.schedule.name ?? '—'}</Text>
                            </View>
                        </>
                    )}

                    {/* Date (one_time) */}
                    {appointment.appointmentType === 'one_time' && (
                        <View style={{ marginTop: 12 }}>
                            <Text style={styles.smallLabel}>Date</Text>
                            {!editing ? (
                                <Text style={styles.valueText}>
                                    {appointment.date ? new Date(appointment.date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : '—'}
                                </Text>
                            ) : (
                                <>
                                    <TouchableOpacity style={styles.inputBtn} onPress={() => setShowDatePicker(true)}>
                                        <Text style={styles.inputBtnText}>
                                            {date ? new Date(date).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric'
                                            }) : 'Pick date'}
                                        </Text>
                                        <Ionicons name="calendar-outline" size={16} color="#b58dde" style={{ marginLeft: 8 }} />
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={date ? new Date(date) : new Date()}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={onDateSelected}
                                            minimumDate={new Date()}
                                        />
                                    )}
                                </>
                            )}
                        </View>
                    )}

                    {/* Time range */}
                    <View style={{ marginTop: 12 }}>
                        <Text style={styles.smallLabel}>Time</Text>

                        {!editing ? (
                            <Text style={styles.valueText}>
                                {appointment.startTime ? timeLabel(appointment.startTime.hour12, appointment.startTime.minute, appointment.startTime.ampm) : '—'} —{' '}
                                {appointment.endTime ? timeLabel(appointment.endTime.hour12, appointment.endTime.minute, appointment.endTime.ampm) : '—'}
                            </Text>
                        ) : (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <TouchableOpacity style={styles.inputBtn} onPress={() => openTimePicker('start')}>
                                    <Text style={styles.inputBtnText}>{timeLabel(startHour, startMinute, startAmpm)}</Text>
                                    <Ionicons name="time-outline" size={16} color="#b58dde" style={{ marginLeft: 8 }} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.inputBtn} onPress={() => openTimePicker('end')}>
                                    <Text style={styles.inputBtnText}>{timeLabel(endHour, endMinute, endAmpm)}</Text>
                                    <Ionicons name="time-outline" size={16} color="#b58dde" style={{ marginLeft: 8 }} />
                                </TouchableOpacity>

                                {showTimePicker && (
                                    <DateTimePicker
                                        value={
                                            timePickerTarget === 'start'
                                                ? new Date(0, 0, 0, startAmpm === 'PM' ? (startHour % 12) + 12 : startHour % 12, Number(startMinute))
                                                : new Date(0, 0, 0, endAmpm === 'PM' ? (endHour % 12) + 12 : endHour % 12, Number(endMinute))
                                        }
                                        mode="time"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onTimeSelected}
                                    />
                                )}
                            </View>
                        )}
                    </View>

                    {/* Pricing Information */}
                    <View style={styles.pricingSection}>
                        <View style={styles.pricingRow}>
                            <Text style={styles.pricingLabel}>Duration</Text>
                            <Text style={styles.pricingValue}>{durationHours.toFixed(2)} hours</Text>
                        </View>
                        <View style={styles.pricingRow}>
                            <Text style={styles.pricingLabel}>Rate</Text>
                            <Text style={styles.pricingValue}>₱{appointment.ratePerHour?.toFixed(2)}/hour</Text>
                        </View>
                        <View style={[styles.pricingRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Total Cost</Text>
                            <Text style={styles.totalValue}>{totalCost}</Text>
                        </View>
                    </View>

                    {/* Notes */}
                    <View style={{ marginTop: 16 }}>
                        <Text style={styles.smallLabel}>Notes</Text>
                        {!editing ? (
                            <Text style={[styles.valueText, !appointment.notes && { color: '#999', fontStyle: 'italic' }]}>
                                {appointment.notes || 'No notes provided'}
                            </Text>
                        ) : (
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                style={styles.notesInput}
                                placeholder="Add any special instructions or notes..."
                                multiline
                                placeholderTextColor="#999"
                            />
                        )}
                    </View>

                    {/* Action Buttons */}
                    {/* Action Buttons */}
                    <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'center' }}>
                        {canEdit ? (
                            editing ? (
                                <>
                                    <TouchableOpacity
                                        style={[styles.btn, styles.btnSecondary]}
                                        onPress={() => {
                                            setEditing(false);
                                            setDate(appointment.date ?? null);
                                            if (appointment.startTime) {
                                                setStartHour(appointment.startTime.hour12);
                                                setStartMinute(appointment.startTime.minute);
                                                setStartAmpm(appointment.startTime.ampm);
                                            }
                                            if (appointment.endTime) {
                                                setEndHour(appointment.endTime.hour12);
                                                setEndMinute(appointment.endTime.minute);
                                                setEndAmpm(appointment.endTime.ampm);
                                            }
                                            setNotes(appointment.notes ?? '');
                                        }}
                                        disabled={saving}
                                    >
                                        <Text style={styles.btnSecondaryText}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.btn, styles.btnPrimary, { marginLeft: 12 }]}
                                        onPress={saveChanges}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.btnPrimaryText}>Save Changes</Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[styles.btn, styles.btnSecondary]}
                                        onPress={() => setEditing(true)}
                                    >
                                        <Text style={styles.btnSecondaryText}>Edit</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.btn, styles.btnDanger, { marginLeft: 12 }]}
                                        onPress={cancelBooking}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.btnDangerText}>Cancel Booking</Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )
                        ) : (
                            <TouchableOpacity
                                style={[styles.btn, styles.btnSecondary]}
                                onPress={() => router.back()}
                            >
                                <Text style={styles.btnSecondaryText}>Close</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>


                {/* REVIEW SECTION - only if appointment completed and owner */}
                {statusLower === 'completed' && isOwner && (
                    <View style={[styles.card, { marginTop: 16 }]}>
                        <Text style={styles.sectionTitle}>Leave a Review</Text>

                        {hasReviewed ? (
                            <View style={styles.reviewCompleted}>
                                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                                <Text style={styles.reviewCompletedTitle}>Review Submitted</Text>
                                <Text style={styles.reviewCompletedText}>Thank you for sharing your feedback!</Text>
                            </View>
                        ) : (
                            <View>
                                <View style={styles.ratingSection}>
                                    <Text style={styles.ratingLabel}>Your rating</Text>
                                    <View style={styles.starsContainer}>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <TouchableOpacity
                                                key={i}
                                                onPress={() => setReviewRating(i)}
                                                style={styles.starButton}
                                            >
                                                <Ionicons
                                                    name={i <= reviewRating ? 'star' : 'star-outline'}
                                                    size={32}
                                                    color="#f1c40f"
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <Text style={styles.ratingValue}>{reviewRating}.0 out of 5</Text>
                                </View>

                                <TextInput
                                    placeholder="Share your experience with this provider..."
                                    value={reviewComment}
                                    onChangeText={setReviewComment}
                                    style={[styles.notesInput, { minHeight: 100 }]}
                                    multiline
                                    placeholderTextColor="#999"
                                />

                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                                    <TouchableOpacity
                                        style={[styles.btn, styles.btnPrimary, { minWidth: 140 }]}
                                        onPress={submitReview}
                                        disabled={postingReview}
                                    >
                                        {postingReview ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.btnPrimaryText}>Post Review</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
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
    scroll: { padding: 16, paddingBottom: 60 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    title: { fontSize: 24, fontWeight: '700', color: '#333' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16 },
    smallLabel: { fontSize: 12, color: '#666', marginBottom: 6, fontWeight: '600' },
    valueText: { fontSize: 16, color: '#333', fontWeight: '600' },

    // Status Styles
    statusBox: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    statusPending: { backgroundColor: '#fff3cd' },
    statusOngoing: { backgroundColor: '#d1ecf1' },
    statusCompleted: { backgroundColor: '#d4edda' },
    statusCancelled: { backgroundColor: '#f8d7da' },
    statusText: { fontSize: 12, fontWeight: '700' },
    statusTextPending: { color: '#856404' },
    statusTextOngoing: { color: '#0c5460' },
    statusTextCompleted: { color: '#155724' },
    statusTextCancelled: { color: '#721c24' },

    // Input Styles
    inputBtn: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 2,
        borderColor: '#F0E7FB',
        alignItems: 'center',
        minWidth: 140,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    inputBtnText: { color: '#333', fontWeight: '700', fontSize: 16 },

    notesInput: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 14,
        borderWidth: 2,
        borderColor: '#F0E7FB',
        marginTop: 6,
        minHeight: 80,
        textAlignVertical: 'top',
        fontSize: 16,
        color: '#333',
    },

    // Pricing Section
    pricingSection: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F0E7FB',
    },
    pricingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    pricingLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
    pricingValue: { fontSize: 14, color: '#333', fontWeight: '600' },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#E8D8F5',
        paddingTop: 12,
        marginTop: 4,
    },
    totalLabel: { fontSize: 16, color: '#333', fontWeight: '700' },
    totalValue: { fontSize: 18, color: '#b58dde', fontWeight: '700' },

    // Button Styles
    btn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
        flex: 0,
    },
    btnPrimary: {
        backgroundColor: '#b58dde',
    },
    btnSecondary: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#b58dde',
    },
    btnDanger: {
        backgroundColor: '#dc3545',
    },
    btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    btnSecondaryText: { color: '#b58dde', fontWeight: '700', fontSize: 14 },
    btnDangerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    // Additional Information
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
    infoValue: { fontSize: 14, color: '#333', fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 },

    // Review Section
    reviewCompleted: {
        alignItems: 'center',
        padding: 20,
    },
    reviewCompletedTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginTop: 12,
        marginBottom: 4,
    },
    reviewCompletedText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    ratingSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    ratingLabel: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
        fontWeight: '600',
    },
    starsContainer: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    starButton: {
        padding: 4,
    },
    ratingValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '700',
    },
});