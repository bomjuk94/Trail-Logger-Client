import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View } from '@/components/Theme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/components/auth';
export { ErrorBoundary } from 'expo-router';
export const unstable_settings = { initialRouteName: '(auth)' };
import Toast from 'react-native-toast-message';

SplashScreen.preventAutoHideAsync();

function AuthGate() {
    const { status } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (status === 'loading') return;
        const inAuth = segments[0] === '(auth)';
        if (status === 'signedOut' && !inAuth) router.replace('/(auth)/login');
        if (status === 'signedIn' && inAuth) router.replace('/(app)/(tabs)');
    }, [status, segments]);

    if (status === 'loading') return null;
    return <Slot />;
}

const toastConfig = {
    list: ({ props }) => (
        <View style={{ padding: 12, backgroundColor: "#e74c3c", borderRadius: 8 }}>
            {props.items.map((line: string, i: number) => (
                <Text key={i} style={{ color: "white", marginBottom: 2 }}>
                    • {line}
                </Text>
            ))}
        </View>
    ),
};

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [loaded, error] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
        ...FontAwesome.font,
    });

    useEffect(() => { if (error) throw error; }, [error]);
    useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);

    return (
        <AuthProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                {loaded ? <AuthGate /> : null}
            </ThemeProvider>
            <Toast config={toastConfig} />
        </AuthProvider>
    );
}
