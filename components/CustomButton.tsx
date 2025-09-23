import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, padding, radii, opacity, fontSizes, fontWeight } from '@/constants/theme'
import type { BtnProps } from '@/types/Button';

export default function CustomButton({ text, onPress }: BtnProps) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed
            ]}
            onPress={onPress}
        >
            <Text style={styles.buttonText}>{text}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.primary,
        paddingVertical: padding.sm,
        paddingHorizontal: padding.md,
        borderRadius: radii.md,
        alignItems: 'center',
    },
    buttonPressed: {
        opacity: opacity.sm,
    },
    buttonText: {
        color: colors.white,
        fontSize: fontSizes.btn,
        fontWeight: fontWeight.bold,
    },
});
