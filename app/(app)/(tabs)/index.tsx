import { useRef, useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { ensureLocationPermissionOnce } from '@/app/hooks/useAskLocationOnce';
import * as Location from 'expo-location';
import useTrailRecorder from '@/app/hooks/useTrailRecorder';
import { ensureDb } from '../../lib/db';
import { useAuthToken } from '@/app/lib/userAuthToken';
import { Text, View } from '@/components/Theme';
import CustomButton from '@/components/CustomButton';
import Accordion from '@/components/Accordion';
import { fontSizes, fontWeight, spacing } from '@/constants/theme';
import type { Weather } from '@/types';
import { timeFormatter } from '@/app/lib/timeFormatter';
import { distanceFormatter } from '@/app/lib/distanceFormatter';
import { useUserActions } from '@/app/hooks/useUserActions';
import { useGetLocationPermission } from '@/app/hooks/useGetLocationPermission';
import { useGetCachedPosition } from '@/app/hooks/useGetCachedPosition';
import { useGetLivePosition } from '@/app/hooks/useGetLivePosition';
import { useGetWeather } from '@/app/hooks/useGetWeather';
import { usePendingSync } from '@/app/hooks/usePendingSync';

/* ------------------------------ helpers ------------------------------ */
const { fmtTime } = timeFormatter();
const { fmtKm } = distanceFormatter();

export default function HomeScreen() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permStatus, setPermStatus] = useState<Location.PermissionStatus | null>(null);

  const { token, loading: tokenLoading } = useAuthToken();
  const lastFetchRef = useRef<{ t: number; lat: number; lon: number } | null>(null);

  const recorder = useTrailRecorder();
  const { status, elapsed, distance, forceIdle } = recorder;
  usePendingSync(token, forceIdle)

  // IMPORTANT: we need both handlers (you were calling onSecondary but not destructuring it)
  const { onPrimary, onSecondary } = useUserActions(recorder);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        await ensureDb();
      }
    })();
  }, []);

  useGetLocationPermission({
    token,
    tokenLoading,
    ensureLocationPermissionOnce,
    setPermStatus,
  });

  useEffect(() => {
    if (permStatus !== 'granted') {
      setWeather(null);
      setLocation(null);
    }
  }, [permStatus]);

  useGetCachedPosition({
    permStatus,
    setLocation,
  });

  useGetLivePosition({
    permStatus,
    setLocation,
  });

  useGetWeather({
    permStatus,
    location,
    lastFetchRef,
    setErrorMsg,
    setWeather,
  });

  useEffect(() => {
    if (Platform.OS === 'web' && permStatus === 'granted') {
      console.log(
        'Tip: In Chrome DevTools → More Tools → Sensors → set mock geolocation to test real coords.'
      );
    }
  }, [permStatus]);

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        {errorMsg ? (
          <Text style={{ marginBottom: 8 }}>{errorMsg}</Text>
        ) : permStatus !== 'granted' ? (
          <Text style={{ marginBottom: 8 }}>Enable location to see local weather.</Text>
        ) : !weather ? (
          <Text style={{ marginBottom: 8 }}>Getting local weather…</Text>
        ) : (
          <Accordion weather={weather} />
        )}
      </View>

      <View style={styles.centerContent}>
        {/* Optional: small hint if a session was recovered into paused state */}
        {status === 'paused' && (
          <Text style={{ marginBottom: 6, opacity: 0.7 }}>
            Recovered session — resume or stop to save.
          </Text>
        )}

        <Text style={{ marginBottom: 8 }}>
          {(status === 'recording' || status === 'paused') &&
            `Time: ${fmtTime(elapsed)} • Dist: ${fmtKm(distance)} km`}
        </Text>

        <CustomButton
          text={
            status === 'idle'
              ? 'Start Trail'
              : status === 'recording'
                ? 'Stop (Recording)'
                : 'Stop (Paused)'
          }
          onPress={onPrimary}
        />

        {status !== 'idle' && (
          <View style={{ marginTop: 12 }}>
            <CustomButton
              text={status === 'recording' ? 'Pause' : 'Resume'}
              onPress={onSecondary}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    zIndex: 1000,
    elevation: 1000,
    pointerEvents: 'box-none',
  },
  weatherContainer: {
    alignSelf: 'flex-start',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSizes.title,
    fontWeight: fontWeight.bold,
  },
});
