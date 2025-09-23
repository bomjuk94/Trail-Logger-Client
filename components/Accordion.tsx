import React, { useState } from 'react'
import { BASE } from '@/app/lib/apiFetch';
import { Platform, UIManager, LayoutAnimation, View, Text, Pressable, StyleSheet, Image, FlatList } from 'react-native';
import type { AccordionProps } from '@/types/Accordion';
import { formatNumbers } from '@/app/lib/formatNumbers';
import { Ionicons } from '@expo/vector-icons';
import { unitConverter } from '@/app/lib/unitConverter';
import { getWeatherUnit } from '@/app/lib/getWeatherUnit';
import { getOwmIcon } from '@/app/lib/owmIcons'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Accordion = ({ weather }: AccordionProps) => {

    const [open, setOpen] = useState(false)
    const { roundUp } = formatNumbers()
    const currentTemperature: number = roundUp(Number(weather.temperatureCurr))
    const { mToKm } = unitConverter()

    const toggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen(!open)
    }

    const accordionContentData = [
        {
            key: '1',
            label: 'Feels Like',
            type: 'temp',
            value: roundUp(Number(weather.temperatureFeels)),
        },
        {
            key: '2',
            label: 'High',
            type: 'temp',
            value: roundUp(Number(weather.temperatureHigh)),
        },
        {
            key: '3',
            label: 'Low',
            type: 'temp',
            value: roundUp(Number(weather.temperatureLow)),
        },
        {
            key: '4',
            label: 'Humidity',
            type: 'percent',
            value: weather.humidity,
        },
        {
            key: '5',
            label: 'Visibility',
            type: 'distance',
            value: mToKm(Number(weather.visibility)),
        },
        {
            key: '6',
            label: 'Wind Speed',
            type: 'speed',
            value: weather.speedW,
        },
        {
            key: '7',
            label: 'Clouds',
            type: 'percent',
            value: weather.clouds,
        },
    ]

    return (
        <View
            style={styles.weatherContainer}
        >
            <Pressable
                onPress={toggle}
                accessibilityRole="button"
            >
                <View style={styles.accordionMainContainer}>
                    <Text style={styles.weatherText}>
                        {weather.name}
                    </Text>

                    <View style={styles.temperatureContainer}>
                        <Text style={styles.weatherText}>
                            {currentTemperature} ℃
                        </Text>

                        <Image
                            // source={{ uri: `https://openweathermap.org/img/wn/${weather.icon}.png` }}
                            // source={{ uri: `${BASE}/api/proxy/icon/${weather.icon}@2x.png` }}
                            source={getOwmIcon(weather.icon)}
                            style={styles.weatherIcon}
                            resizeMode="contain"
                        />

                        <Ionicons
                            name={open ? "chevron-up" : "chevron-down"}
                            size={20}
                            color="#fff"
                        />
                    </View>
                </View>
            </Pressable>

            {
                open &&

                <FlatList
                    data={accordionContentData}
                    keyExtractor={(item) => item.key}
                    numColumns={2}
                    scrollEnabled={false}
                    contentContainerStyle={styles.accordionContentContainer}
                    renderItem={({ item }) => (
                        <View style={styles.cell}>
                            <Text style={styles.label}>{item.label}</Text>
                            <Text style={styles.value}>
                                {item.value} {getWeatherUnit(item.type)}
                            </Text>
                        </View>
                    )}
                />
            }
        </View>
    )
}

const styles = StyleSheet.create({
    weatherContainer: {
        pointerEvents: 'auto',
        backgroundColor: '#1E293B',
        borderRadius: 10,
        padding: 12,
        width: '100%',
        alignSelf: 'stretch',
        maxWidth: 700,

        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
            },
            android: {
                elevation: 4,
            },
        }),
    },
    weatherText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    weatherIcon: {
        backgroundColor: '#cececeff',
        width: 35,
        height: 35,
        borderRadius: 100,
    },
    temperatureContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    accordionMainContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    accordionContentContainer: {
        marginTop: 16,
        paddingHorizontal: 4,
    },
    cell: {
        flex: 1,
        padding: 8,
        minWidth: '50%',
    },
    label: {
        fontSize: 12,
        color: '#cbd5e1',
        marginBottom: 2,
    },
    value: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f8fafc',
    },
});

export default Accordion