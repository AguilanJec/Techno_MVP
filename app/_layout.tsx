import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as NavigationBar from "expo-navigation-bar";

export default function RootLayout() {
    useEffect(() => {
        NavigationBar.setVisibilityAsync("hidden");     // hide navigation bar
        NavigationBar.setBehaviorAsync("overlay-swipe"); // show only when swiping
    }, []);
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
                <Stack.Screen name="terms_conditions" />
            </Stack>
            <StatusBar style="auto" />
        </>
    );
}