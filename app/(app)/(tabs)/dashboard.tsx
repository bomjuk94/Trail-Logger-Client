import { Pressable, StyleSheet, ScrollView } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { Text, View } from '@/components/Theme';
import { fontSizes, fontWeight, spacing, gap, border, padding, radii, colors, devices } from '@/constants/theme';
import { dashboardTabOptions } from '@/constants/variables';
import type { HikeRow } from '@/types';
import { useAuth } from '@/components/auth';
import { useAuthToken } from '@/app/lib/userAuthToken';
import { decodeUserId } from '@/app/lib/useCurrentUser';
import { showToast } from '@/app/lib/showToast';
import { useRefreshOnDashboardFocus } from '@/app/hooks/useRefreshOnDashboardFocus';
import { useGetUserWeight } from '@/app/hooks/useGetUserWeight';
import { useHikePoints } from '@/app/hooks/useHikePoints';
import { timeConverter } from '@/app/lib/timeConverter';

export default function DashboardScreen() {
  const [hikes, setHikes] = useState<HikeRow[]>([]);
  const { token, loading: tokenLoading } = useAuthToken()
  const [userWeight, setUserWeight] = useState<number | null>(null)
  const userId = useMemo(() => decodeUserId(token), [token]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'achievements'>('dashboard');
  const { signOut } = useAuth()

  useEffect(() => {
    if (!tokenLoading && !userId) {
      showToast({ type: 'error', msg: 'Please log in again.' });
    }
  }, [tokenLoading, userId]);


  useRefreshOnDashboardFocus({ userId, setHikes, token })
  useGetUserWeight({ token, setUserWeight, signOut })

  const {
    distanceKmTotal,
    elevationGainTotal,
    mostElevationGain,
    highestPoint,
    paceStr,
    speedStr,
    caloriesBurnedTotal,
    longestHikeKm,
    fastestHikeS,
    longestHikeTimeS,
  } = useHikePoints({
    hikes,
    userWeight,
  })
  const { formatSecondsToHHMMSS } = timeConverter()

  if (!userId) {
    return <Text>Not signed in.</Text>;
  }

  return (
    <View style={styles.container}>

      <Text style={styles.pageHeading}>
        Statistics
      </Text>

      <View style={styles.tabOptionsContainer}>
        {dashboardTabOptions.map(option => (
          <Pressable
            key={option}
            onPress={() => setActiveTab(option as typeof activeTab)}
            hitSlop={8}
            android_ripple={{ borderless: false }}
            style={({ pressed }) => ([
              styles.tabOption,
              option === activeTab && styles.activeTab,
              pressed && styles.pressedTab,
            ])}
          >
            <Text style={[styles.optionText, option === activeTab && styles.activeText]}>
              {option.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        {activeTab === 'dashboard' ? (
          <View style={styles.pageContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputHeading}>Total Hikes:</Text>
              <Text>{hikes.length}</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputHeading}>Distance Hiked:</Text>
              <Text>{distanceKmTotal.toFixed(2)} KM</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputHeading}>Elevation Gained:</Text>
              <Text>{elevationGainTotal} M</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputHeading}>Average Pace/Speed:</Text>
              <Text>{paceStr} ({speedStr})</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputHeading}>Total Calories Burned:</Text>
              <Text>{caloriesBurnedTotal} Calories</Text>
            </View>
          </View>
        ) : (
          <View style={styles.pageContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputHeading}>Longest Hike:</Text>
              <Text>{longestHikeKm.toFixed(2)} KM</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputHeading}>Highest Point:</Text>
              <Text>{highestPoint} M</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputHeading}>Most Elevation Gain:</Text>
              <Text>{mostElevationGain} M</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputHeading}>Fastest Completion Time:</Text>
              <Text>{formatSecondsToHHMMSS(fastestHikeS)}</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputHeading}>Longest Completion Time:</Text>
              <Text>{formatSecondsToHHMMSS(longestHikeTimeS)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 16,
    maxWidth: devices.tablet,
  },
  pageHeading: {
    fontSize: fontSizes.subTitle,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.subTitle,
    fontWeight: fontWeight.bold,
  },
  separator: {
    marginVertical: spacing.lg,
    height: 1,
    width: '80%',
  },
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: gap.sm,
    width: '100%',
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: gap.xs,
  },
  inputHeading: {
    fontSize: fontSizes.inputHeading,
  },
  input: {
    borderWidth: border.sm,
    padding: padding.sm,
    borderRadius: radii.md,
    width: '100%',
  },
  tabOptionsContainer: {
    flexDirection: 'row',
    gap: gap.xs,
    marginBottom: spacing.lg,
    backgroundColor: colors.lightGray,
    padding: 4,
    borderRadius: radii.md,
  },
  tabOption: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: padding.md,
    paddingVertical: padding.sm,
    borderRadius: radii.md,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  pressedTab: {
    opacity: 0.85,
  },
  optionText: {
    color: colors.black,
    fontWeight: fontWeight.semiBold,
  },
  activeText: {
    color: colors.white,
  },
  contentMax: {
    width: '100%',
    maxWidth: 640,
  },
});
