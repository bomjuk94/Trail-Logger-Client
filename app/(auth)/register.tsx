import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useAuth } from '@/components/auth';
import { padding, gap, fontSizes, fontWeight, border, radii } from '@/constants/theme'
import CustomButton from '@/components/CustomButton';

export default function Register() {
    const { register } = useAuth();
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Register</Text>
            <TextInput placeholder="Username" value={userName} onChangeText={setUserName}
                autoCapitalize="none"
                style={styles.input} />
            <TextInput placeholder="Password" value={password} onChangeText={setPassword}
                secureTextEntry style={styles.input} />
            <CustomButton
                text="Register"
                onPress={() => register(userName, password)}
            />
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