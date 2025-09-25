import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/components/auth';
import { padding, gap, fontSizes, fontWeight, border, radii } from '@/constants/theme'
import CustomButton from '@/components/CustomButton';
import { apiFetch } from '../lib/apiFetch';
import { useAuthToken } from '../lib/userAuthToken';

export default function Login() {

    const { token } = useAuthToken()

    useEffect(() => {

        const ping = async () => {
            try {
                const res = await apiFetch('/api/ping');

                if (res.ok) {
                    console.log('pong')
                }

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

            } catch (e: any) {
                console.log('could not get api response')
                console.log('error', e)
            }
        }

        ping()
    }, [])
    const { signIn } = useAuth();
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');



    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign in</Text>
            <TextInput placeholder="Username" value={userName} onChangeText={setUserName}
                autoCapitalize="none"
                style={styles.input} />
            <TextInput placeholder="Password" value={password} onChangeText={setPassword}
                secureTextEntry style={styles.input} />
            <CustomButton
                text="Sign In"
                onPress={() => signIn({
                    userName,
                    password,
                    setUserName,
                    setPassword,
                })}
            />
            <Link href="/(auth)/register">Create an account</Link>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: padding.md,
        gap: gap.sm,
    },
    title: {
        fontSize: fontSizes.subHeading,
        fontWeight: fontWeight.semiBold,
    },
    input: {
        borderWidth: border.sm,
        padding: padding.sm,
        borderRadius: radii.md,
    },
})