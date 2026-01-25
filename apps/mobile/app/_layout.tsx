import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@/features/theme/ThemeProvider';
import { useThemeStore } from '@/features/theme/theme.store';
import { useEffect } from 'react';
import "./global.css";

function StatusBarWrapper() {
    const { isDark } = useThemeStore();
    
    return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
    return (
        <ThemeProvider>
            <StatusBarWrapper />
            <Stack
                screenOptions={{
                    headerShown: false,
                }}
            />
        </ThemeProvider>
    );
}
