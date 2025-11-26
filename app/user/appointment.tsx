import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import { db } from "../../firebaseConfig";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import DateTimePicker from '@react-native-community/datetimepicker';

type Provider = {
    id: string;
    name?: string;
    rate?: string | number;
    rating?: number;
    reviews?: number;
    distance?: string;
    availability?: any; // raw availability map from provider doc
};

const WEEKDAYS = [
    { key: "mon", label: "Mon" },
    { key: "tue", label: "Tue" },
    { key: "wed", label: "Wed" },
    { key: "thu", label: "Thu" },
    { key: "fri", label: "Fri" },
    { key: "sat", label: "Sat" },
    { key: "sun", label: "Sun" },
];

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ["00", "30"]; // keep original granularity

function pad(n: number) {
    return n < 10 ? `0${n}` : `${n}`;
}

function timeLabel(hour12: number, minute: string, ampm: "AM" | "PM") {
    return `${hour12}:${minute} ${ampm}`;
}

/** convert start/end to decimal hours (e.g. 7:30 AM -> 7.5; 1:00 PM -> 13) */
function toDecimalHour(hour12: number, minute: string, ampm: "AM" | "PM") {
    let hour24 = hour12 % 12;
    if (ampm === "PM") hour24 += 12;
    return hour24 + parseInt(minute, 10) / 60;
}

/** parse provider time string (HH:mm) -> decimal 24-hr hour e.g. "08:00" -> 8, "20:30" -> 20.5 */
function parseTimeString(t: string) {
    if (!t || typeof t !== 'string') return NaN;
    const [h, m] = t.split(":");
    const hh = parseInt(h, 10);
    const mm = parseInt(m || "0", 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;
    return hh + mm / 60;
}

const DAY_FULL = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
};

/**
 * Find the provider availability entry for a day. Provider doc might use full day names ("Monday") or short keys.
 * Returns undefined when no entry found.
 */
function getAvailabilityForDay(availability: any, dayKey: string) {
    if (!availability) return undefined;
    // try full name
    const full = DAY_FULL[dayKey as keyof typeof DAY_FULL];
    if (full && availability[full]) return availability[full];
    // try upper-case first (e.g. Monday)
    if (availability[dayKey]) return availability[dayKey];
    // try lowercase full
    if (full && availability[full.toLowerCase()]) return availability[full.toLowerCase()];
    // try short key (mon,tue..)
    if (availability[dayKey.toLowerCase()]) return availability[dayKey.toLowerCase()];
    return undefined;
}

/** return true if selected [startDec, endDec] fits completely inside provider window [from,to] */
function isRangeWithinProviderWindow(providerWindow: any, startDec: number, endDec: number) {
    if (!providerWindow || providerWindow.enabled !== true) return false;
    const fromDec = parseTimeString(providerWindow.from);
    const toDec = parseTimeString(providerWindow.to);
    if (Number.isNaN(fromDec) || Number.isNaN(toDec)) return false;
    // Normal case: from <= to on same day
    if (fromDec <= toDec) {
        return startDec >= fromDec && endDec <= toDec;
    }
    // If provider window wraps midnight (rare), accept when start..end is inside that wrapped window
    // e.g. from 22 -> to 02, start 23 end 1 => start >=22 || end <=2
    return (startDec >= fromDec && startDec < 24) || (endDec <= toDec && endDec >= 0);
}

export default function AppointmentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const providerId = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined);

    const [provider, setProvider] = useState<Provider | null>(null);
    const [loadingProvider, setLoadingProvider] = useState(true);

    // appointment controls
    const [type, setType] = useState<"one_time" | "schedule">("one_time");

    // one-time
    const [selectedDate, setSelectedDate] = useState<string | null>(null); // ISO yyyy-mm-dd string
    const [showDatePicker, setShowDatePicker] = useState(false);

    // schedule (recurring)
    const [selectedDays, setSelectedDays] = useState<string[]>([]); // keys like 'mon','thu'...
    const [scheduleName, setScheduleName] = useState(""); // editable label

    // common time selection (these remain to preserve DB shape)
    const [startHour, setStartHour] = useState<number>(7);
    const [startMinute, setStartMinute] = useState<string>("30");
    const [startAmpm, setStartAmpm] = useState<"AM" | "PM">("AM");

    const [endHour, setEndHour] = useState<number>(9);
    const [endMinute, setEndMinute] = useState<string>("30");
    const [endAmpm, setEndAmpm] = useState<"AM" | "PM">("AM");

    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // NEW: native time picker state
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [timePickerTarget, setTimePickerTarget] = useState<"start" | "end">("start");

    const auth = getAuth();
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!providerId) return;
        (async () => {
            try {
                setLoadingProvider(true);
                const ref = doc(db, "providers", providerId);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const d = snap.data() as any;
                    setProvider({
                        id: snap.id,
                        name: d.name || "Provider",
                        rate: d.rate ?? d.price ?? d.hourly ?? undefined,
                        rating: typeof d.rating === "number" ? d.rating : undefined,
                        reviews: Array.isArray(d.reviews) ? d.reviews.length : typeof d.reviews === "number" ? d.reviews : undefined,
                        distance: d.distance || undefined,
                        availability: d.availability ?? d.availabilityMap ?? undefined,
                    });
                } else {
                    setProvider(null);
                }
            } catch (err) {
                console.warn("Failed to load provider:", err);
                setProvider(null);
            } finally {
                setLoadingProvider(false);
            }
        })();
    }, [providerId]);

    // default selectedDate = today
    useEffect(() => {
        if (!selectedDate) {
            const t = new Date();
            const iso = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
            setSelectedDate(iso);
        }
    }, [selectedDate]);

    // update scheduleName auto when schedule selection changes (only if user hasn't typed a custom name)
    useEffect(() => {
        const daysLabel =
            selectedDays.length === 0
                ? ""
                : selectedDays
                    .map((k) => WEEKDAYS.find((w) => w.key === k)?.label ?? k)
                    .join(", ");

        const auto = type === "schedule"
            ? (selectedDays.length > 0 ? `${daysLabel} ${timeLabel(startHour, startMinute, startAmpm)}–${timeLabel(endHour, endMinute, endAmpm)}` : `Schedule ${timeLabel(startHour, startMinute, startAmpm)}–${timeLabel(endHour, endMinute, endAmpm)}`)
            : "";

        // only set if user hasn't edited it (crudely: if scheduleName is empty or equals previous auto)
        if (!scheduleName || scheduleName.startsWith("Mon") || scheduleName.startsWith("Tue") || scheduleName.startsWith("Wed") || scheduleName.startsWith("Thu") || scheduleName.startsWith("Fri") || scheduleName.startsWith("Sat") || scheduleName.startsWith("Sun") || scheduleName.startsWith("Schedule")) {
            setScheduleName(auto);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDays, startHour, startMinute, startAmpm, endHour, endMinute, endAmpm, type]);

    const toggleDay = (key: string) => {
        setSelectedDays((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);

        if (event.type === 'set' && selectedDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check if selected date is not in the past
            if (selectedDate < today) {
                Alert.alert(
                    "Invalid Date",
                    "Please select a date that is not in the past. Appointments cannot be scheduled for previous dates.",
                    [{ text: "OK" }]
                );
                return;
            }

            const iso = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
            setSelectedDate(iso);
        }
    };

    // NEW: Helper to build Date object from hour/minute/ampm (for picker initial value)
    function buildDateFromTime(hour12: number, minute: string, ampm: "AM" | "PM") {
        const d = new Date();
        let hour24 = hour12 % 12;
        if (ampm === "PM") hour24 += 12;
        d.setHours(hour24, parseInt(minute, 10), 0, 0);
        return d;
    }

    // NEW: Round minute to 00 or 30 (keeps DB minute options unchanged)
    function roundTo30(min: number) {
        if (min < 15) return 0;
        if (min < 45) return 30;
        return 0; // will carry hour +1 in caller
    }

    // NEW: Set time from a Date object into our hour/minute/ampm state for either 'start' or 'end'
    function setTimeFromDate(target: "start" | "end", date: Date) {
        let hour24 = date.getHours();
        let minuteRaw = date.getMinutes();
        // rounding
        const rounded = roundTo30(minuteRaw);
        let carryHour = 0;
        let minuteStr = pad(rounded);
        if (rounded === 0 && minuteRaw >= 45) {
            // round up to next hour
            carryHour = 1;
        }

        let newHour24 = hour24 + carryHour;
        newHour24 = newHour24 % 24;

        const ampm = newHour24 >= 12 ? "PM" : "AM";
        let hour12 = newHour24 % 12;
        if (hour12 === 0) hour12 = 12;

        if (target === "start") {
            setStartHour(hour12);
            setStartMinute(minuteStr);
            setStartAmpm(ampm as "AM" | "PM");
            // if end <= new start, bump end by +1 hour
            const startDec = toDecimalHour(hour12, minuteStr, ampm as "AM" | "PM");
            const endDec = toDecimalHour(endHour, endMinute, endAmpm);
            if (endDec - startDec <= 0) {
                // add 1 hour to start
                let newEndDec = startDec + 1;
                if (newEndDec >= 24) newEndDec -= 24;
                // convert back to hour/min/ampm (round minutes to existing granularity)
                const newEndHour24 = Math.floor(newEndDec);
                const newEndMinute = Math.round((newEndDec - Math.floor(newEndDec)) * 60);
                const newRounded = roundTo30(newEndMinute);
                let carry = 0;
                if (newRounded === 0 && newEndMinute >= 45) carry = 1;
                let finalHour24 = newEndHour24 + carry;
                finalHour24 = finalHour24 % 24;
                const finalAmpm = finalHour24 >= 12 ? "PM" : "AM";
                let finalHour12 = finalHour24 % 12;
                if (finalHour12 === 0) finalHour12 = 12;
                setEndHour(finalHour12);
                setEndMinute(pad(newRounded));
                setEndAmpm(finalAmpm as "AM" | "PM");
            }
        } else {
            setEndHour(hour12);
            setEndMinute(minuteStr);
            setEndAmpm(ampm as "AM" | "PM");

            // If end <= start, bump end to start + 1 hour
            const startDec = toDecimalHour(startHour, startMinute, startAmpm);
            const endDec = toDecimalHour(hour12, minuteStr, ampm as "AM" | "PM");
            if (endDec - startDec <= 0) {
                // set end = start + 1
                let newEnd = startDec + 1;
                if (newEnd >= 24) newEnd -= 24;
                const newEndHour24 = Math.floor(newEnd);
                const newEndMinute = Math.round((newEnd - Math.floor(newEnd)) * 60);
                const newRounded = roundTo30(newEndMinute);
                let carry = 0;
                if (newRounded === 0 && newEndMinute >= 45) carry = 1;
                let finalHour24 = newEndHour24 + carry;
                finalHour24 = finalHour24 % 24;
                const finalAmpm = finalHour24 >= 12 ? "PM" : "AM";
                let finalHour12 = finalHour24 % 12;
                if (finalHour12 === 0) finalHour12 = 12;
                setEndHour(finalHour12);
                setEndMinute(pad(newRounded));
                setEndAmpm(finalAmpm as "AM" | "PM");
            }
        }
    }

    // NEW: open native time picker for start or end
    function openTimePicker(target: "start" | "end") {
        setTimePickerTarget(target);
        setShowTimePicker(true);
    }

    // compute duration in hours. If end <= start we assume next-day end (rare)
    const durationHours = useMemo(() => {
        const startDec = toDecimalHour(startHour, startMinute, startAmpm);
        const endDec = toDecimalHour(endHour, endMinute, endAmpm);
        let diff = endDec - startDec;
        if (diff <= 0) diff += 24;
        return diff;
    }, [startHour, startMinute, startAmpm, endHour, endMinute, endAmpm]);

    const numericRate = useMemo(() => {
        if (!provider) return 0;
        const r = provider.rate;
        if (!r) return 0;
        const n = typeof r === "number" ? r : parseFloat(String(r).replace(/[^0-9.]/g, ""));
        return Number.isNaN(n) ? 0 : n;
    }, [provider]);

    // estimate: one-time = rate * duration ; schedule = rate * duration * occurrences/week (we show weekly estimate)
    const estimate = useMemo(() => {
        if (!numericRate) return "—";
        if (type === "one_time") {
            return `₱${(numericRate * durationHours).toFixed(2)}`;
        } else {
            const occ = Math.max(1, selectedDays.length);
            return `₱${(numericRate * durationHours * occ).toFixed(2)} (per week)`;
        }
    }, [numericRate, type, durationHours, selectedDays.length]);

    const validateAndSubmit = async () => {
        if (!currentUser) {
            Alert.alert("Not signed in", "You must be signed in to book an appointment.");
            return;
        }
        if (!provider) {
            Alert.alert("No provider", "Provider not loaded. Try again.");
            return;
        }
        if (type === "one_time" && !selectedDate) {
            Alert.alert("Choose a date", "Please choose a date for the one-time appointment.");
            return;
        }

        // Validate date is not in the past for one-time appointments
        if (type === "one_time" && selectedDate) {
            const selected = new Date(selectedDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selected < today) {
                Alert.alert(
                    "Invalid Date",
                    "Please select a date that is not in the past. Appointments cannot be scheduled for previous dates.",
                    [{ text: "OK" }]
                );
                return;
            }
        }

        if (type === "schedule" && selectedDays.length === 0) {
            Alert.alert("Choose days", "Select at least one weekday for a scheduled appointment.");
            return;
        }
        // basic time sanity
        if (durationHours <= 0) {
            Alert.alert("Invalid time", "End time must be after start time.");
            return;
        }

        // ---------- AVAILABILITY VALIDATION ----------
        // Only enforce availability checks if provider.availability exists
        const availability = (provider as any).availability;
        const startDec = toDecimalHour(startHour, startMinute, startAmpm);
        const endDec = toDecimalHour(endHour, endMinute, endAmpm);

        if (availability) {
            if (type === 'one_time' && selectedDate) {
                const d = new Date(selectedDate);
                const dayIdx = d.getDay(); // 0 Sun .. 6 Sat
                const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][dayIdx];
                const dayLabel = DAY_FULL[dayKey as keyof typeof DAY_FULL] || dayKey;
                const window = getAvailabilityForDay(availability, dayKey);
                if (!window || window.enabled !== true) {
                    Alert.alert('Unavailable', `Provider is not available on ${dayLabel}. Please choose another date.`);
                    return;
                }
                if (!isRangeWithinProviderWindow(window, startDec, endDec)) {
                    const from = window.from || '—';
                    const to = window.to || '—';
                    Alert.alert('Unavailable', `Provider is available on ${dayLabel} between ${from} and ${to}. Please pick a time that fits within that window.`);
                    return;
                }
            }

            if (type === 'schedule') {
                // For each selected weekday ensure availability and window match
                for (const k of selectedDays) {
                    const window = getAvailabilityForDay(availability, k);
                    const dayLabel = DAY_FULL[k as keyof typeof DAY_FULL] || k;
                    if (!window || window.enabled !== true) {
                        Alert.alert('Unavailable', `Provider is not available on ${dayLabel}. Remove it from your schedule or pick different days.`);
                        return;
                    }
                    if (!isRangeWithinProviderWindow(window, startDec, endDec)) {
                        const from = window.from || '—';
                        const to = window.to || '—';
                        Alert.alert('Unavailable', `On ${dayLabel} the provider is available between ${from} and ${to}. Please adjust the time or days.`);
                        return;
                    }
                }
            }
        }
        // ---------- END AVAILABILITY VALIDATION ----------

        setSubmitting(true);
        try {
            const payload: any = {
                providerId: provider.id,
                providerName: provider.name,
                userId: currentUser.uid,
                userEmail: currentUser.email,
                appointmentType: type,
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
                durationHours,
                ratePerHour: numericRate,
                notes: notes || "",
                status: "pending",
                createdAt: serverTimestamp(),
            };

            if (type === "one_time") {
                payload.date = selectedDate; // yyyy-mm-dd
            } else {
                payload.schedule = {
                    name: scheduleName,
                    days: selectedDays, // ['mon','thu']
                };
            }

            // Save to Firestore (appointments collection)
            await addDoc(collection(db, "appointments"), payload);

            Alert.alert("Booked", "Your appointment request has been created.");
            router.back();
        } catch (err) {
            console.error("Failed to save appointment:", err);
            Alert.alert("Error", "Failed to create appointment. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // ---------- REPLACED TIME PICKER UI START ----------
    // Compact Start/End row + presets + native DateTimePicker modal handler
    function TimeRangePickerSection() {
        const startDisplay = timeLabel(startHour, startMinute, startAmpm);
        const endDisplay = timeLabel(endHour, endMinute, endAmpm);

        // presets: apply to make quick duration choices
        function applyPresetMinutes(minutes: number) {
            // compute end relative to current end
            const endDecCurrent = toDecimalHour(endHour, endMinute, endAmpm);
            let newEndDec = endDecCurrent + minutes / 60;
            if (newEndDec >= 24) newEndDec -= 24;

            const hour24 = Math.floor(newEndDec);
            const rawMin = Math.round((newEndDec - hour24) * 60);

            const rounded = roundTo30(rawMin);
            let carry = 0;
            if (rounded === 0 && rawMin >= 45) carry = 1;

            let finalHour24 = hour24 + carry;
            finalHour24 = finalHour24 % 24;
            const finalAmpm = finalHour24 >= 12 ? "PM" : "AM";
            let finalHour12 = finalHour24 % 12;
            if (finalHour12 === 0) finalHour12 = 12;

            setEndHour(finalHour12);
            setEndMinute(pad(rounded));
            setEndAmpm(finalAmpm as "AM" | "PM");
        }


        // native picker onChange (for both platforms)
        function onTimePicked(event: any, date?: Date | undefined) {
            // On Android, when dismiss, event.type === 'dismissed'
            setShowTimePicker(false);
            if (!date || (event && event.type === 'dismissed')) return;
            setTimeFromDate(timePickerTarget, date);
        }

        // value for DateTimePicker initial
        const initialDate = timePickerTarget === "start"
            ? buildDateFromTime(startHour, startMinute, startAmpm)
            : buildDateFromTime(endHour, endMinute, endAmpm);

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitleSmall}>Choose time</Text>

                <View style={styles.timeRowNew}>
                    <View style={styles.timeBox}>
                        <Text style={styles.smallLabel}>Start</Text>
                        <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker("start")}>
                            <Text style={styles.timeButtonText}>{startDisplay}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.timeBox}>
                        <Text style={styles.smallLabel}>End</Text>
                        <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker("end")}>
                            <Text style={styles.timeButtonText}>{endDisplay}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ flexDirection: "row", marginTop: 10 }}>
                    <TouchableOpacity style={styles.presetBtn} onPress={() => applyPresetMinutes(30)}>
                        <Text style={styles.presetText}>+30 min</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.presetBtn, { marginLeft: 8 }]} onPress={() => applyPresetMinutes(60)}>
                        <Text style={styles.presetText}>+1 hr</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.presetBtn, { marginLeft: 8 }]} onPress={() => applyPresetMinutes(120)}>
                        <Text style={styles.presetText}>+2 hr</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.smallNote}>{`${durationHours.toFixed(2)} hrs`}</Text>
                </View>

                {showTimePicker && (
                    <DateTimePicker
                        value={initialDate}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onTimePicked}
                        minuteInterval={15} // available on iOS, Android ignore
                    />
                )}
            </View>
        );
    }
    // ---------- REPLACED TIME PICKER UI END ----------

    if (loadingProvider) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color="#b58dde" />
            </View>
        );
    }

    if (!provider) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Book service</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.scrollContent}>
                    <Text style={{ textAlign: "center", marginTop: 30 }}>Provider not found.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Schedule</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* service card */}
                <View style={styles.card}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View>
                            <Text style={styles.cardName}>{provider.name}</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                                <Ionicons name="location-outline" size={14} color="#777" />
                                <Text style={styles.cardMeta}> {provider.distance ?? "—"}</Text>
                            </View>
                            <Text style={[styles.rate, { marginTop: 8 }]}>
                                {provider.rate ? `₱${provider.rate}/hour` : "—/hour"}
                            </Text>
                        </View>
                        <Ionicons name="person-circle-outline" size={60} color="#EDE4F7" />
                    </View>
                </View>

                {/* Appointment Type */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitleSmall}>Appointment type</Text>
                    <View style={{ flexDirection: "row", marginTop: 10 }}>
                        <TouchableOpacity
                            style={[styles.typeBtn, type === "one_time" && styles.typeBtnActive]}
                            onPress={() => setType("one_time")}
                        >
                            <Text style={[styles.typeBtnText, type === "one_time" && styles.typeBtnTextActive]}>One-time</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeBtn, type === "schedule" && styles.typeBtnActive, { marginLeft: 12 }]}
                            onPress={() => setType("schedule")}
                        >
                            <Text style={[styles.typeBtnText, type === "schedule" && styles.typeBtnTextActive]}>Scheduled (recurring)</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* One-time date selector */}
                {type === "one_time" && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitleSmall}>Choose date</Text>
                        <TouchableOpacity
                            style={styles.datePicker}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={styles.dateText}>
                                {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                }) : 'Select date'}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color="#b58dde" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                        <Text style={styles.smallNote}>Tap to open calendar and select a date</Text>

                        {showDatePicker && (
                            <DateTimePicker
                                value={selectedDate ? new Date(selectedDate) : new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onDateChange}
                                minimumDate={new Date()} // Prevent selecting past dates
                            />
                        )}
                    </View>
                )}

                {/* Scheduled - weekdays */}
                {type === "schedule" && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitleSmall}>Choose weekdays</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                            {WEEKDAYS.map((d) => {
                                const active = selectedDays.includes(d.key);
                                return (
                                    <TouchableOpacity
                                        key={d.key}
                                        style={[styles.dayChip, active && styles.dayChipActive]}
                                        onPress={() => toggleDay(d.key)}
                                    >
                                        <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{d.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={{ marginTop: 12 }}>
                            <Text style={styles.smallLabel}>Schedule name</Text>
                            <TextInput
                                placeholder='e.g. "TTh 7:30–9:30"'
                                style={styles.input}
                                value={scheduleName}
                                onChangeText={setScheduleName}
                            />
                        </View>
                    </View>
                )}

                {/* ---------- REPLACED CHOOSE TIME (only this section changed) ---------- */}
                <TimeRangePickerSection />
                {/* ---------- END replaced choose time ---------- */}

                {/* Notes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitleSmall}>Notes / Instructions (optional)</Text>
                    <TextInput
                        placeholder="Allergies, house rules, contact notes..."
                        style={[styles.input, { height: 100, textAlignVertical: "top" }]}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />
                </View>

                {/* Price estimate & CTA */}
                <View style={styles.estimateCard}>
                    <View>
                        <Text style={styles.smallLabel}>Estimate</Text>
                        <Text style={styles.estimateText}>{estimate}</Text>
                        <Text style={styles.smallNote}>{`${durationHours.toFixed(2)} hours per session`}</Text>
                    </View>

                    <TouchableOpacity
                        disabled={submitting}
                        style={styles.bookButton}
                        onPress={validateAndSubmit}
                    >
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookText}>Book now</Text>}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 60 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5F5F5" },
    header: {
        backgroundColor: "#b58dde",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === "ios" ? 48 : 20,
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
    scrollContent: { padding: 20, paddingBottom: 80 },

    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    cardName: { fontSize: 18, fontWeight: "700", color: "#333" },
    cardMeta: { fontSize: 13, color: "#666", marginLeft: 6 },
    rate: { fontSize: 16, fontWeight: "700", color: "#b58dde" },

    section: { marginBottom: 16 },
    sectionTitleSmall: { fontSize: 14, fontWeight: "700", color: "#333" },
    smallLabel: { fontSize: 12, color: "#666", marginBottom: 6 },
    smallNote: { fontSize: 12, color: "#999", marginTop: 6 },

    typeBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#F0E7FB",
    },
    typeBtnActive: {
        backgroundColor: "#EDE4F7",
        borderColor: "#b58dde",
    },
    typeBtnText: { color: "#666", fontWeight: "600" },
    typeBtnTextActive: { color: "#7B52AB" },

    datePicker: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#F0E7FB",
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: { fontSize: 16, color: "#333" },

    dayChip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#F0E7FB",
        marginRight: 8,
        marginBottom: 8,
    },
    dayChipActive: {
        backgroundColor: "#EDE4F7",
        borderColor: "#b58dde",
    },
    dayChipText: { color: "#666", fontWeight: "600" },
    dayChipTextActive: { color: "#7B52AB" },

    input: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: "#F0E7FB",
        marginTop: 8,
    },

    // ---------- new time UI styles ----------
    timeRowNew: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    timeBox: {
        flex: 1,
        marginRight: 10,
    },
    timeButton: {
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#F0E7FB",
        alignItems: "center",
    },
    timeButtonText: {
        fontSize: 16,
        color: "#333",
        fontWeight: "700",
    },
    presetBtn: {
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#F0E7FB",
    },
    presetText: {
        color: "#666",
        fontWeight: "700",
    },

    // previous (unused but kept for compatibility)
    timeRow: { marginTop: 8 },
    timeSelectors: { flexDirection: "row", alignItems: "center" },
    pickerGroup: { flex: 1 },
    pickerGroupSmall: { marginLeft: 8 },
    pickerChip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: "#fff",
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#F0E7FB",
    },
    pickerChipActive: {
        backgroundColor: "#b58dde",
        borderColor: "#b58dde",
    },
    pickerChipText: { color: "#666", fontWeight: "600" },
    pickerChipTextActive: { color: "#fff" },

    pickerChipSmall: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: "#fff",
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#F0E7FB",
    },
    pickerChipActiveSmall: {
        backgroundColor: "#b58dde",
        borderColor: "#b58dde",
    },
    pickerChipTextSmall: { color: "#666", fontWeight: "600" },
    pickerChipTextActiveSmall: { color: "#fff", fontWeight: "700" },

    ampmBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#F0E7FB",
        marginLeft: 6,
    },
    ampmBtnActive: { backgroundColor: "#b58dde", borderColor: "#b58dde" },
    ampmText: { color: "#666", fontWeight: "700" },
    ampmTextActive: { color: "#fff" },

    estimateCard: {
        marginTop: 14,
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#F0E7FB",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    estimateText: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 6 },
    bookButton: {
        backgroundColor: "#b58dde",
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 14,
        minWidth: 120,
        alignItems: "center",
    },
    bookText: { color: "#fff", fontWeight: "700" },
});
