import { useEffect } from 'react';
import { View } from 'react-native';
import { useThemeStore } from './theme.store';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { isDark } = useThemeStore();

  useEffect(() => {
    // Apply dark class to root view for NativeWind
    // NativeWind uses class-based dark mode, so we need to conditionally apply the 'dark' class
    // This is handled through className props in components
  }, [isDark]);

  return (
    <View className={isDark ? 'dark' : ''} style={{ flex: 1 }}>
      {children}
    </View>
  );
}
