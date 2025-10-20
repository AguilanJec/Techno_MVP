import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
    return (
        <>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="message" />
                <Stack.Screen name="chat" />
                <Stack.Screen name="call" />
                <Stack.Screen name="search" />
                <Stack.Screen name="details" />
            </Stack>
            <StatusBar style="auto" />
        </>
    );
}