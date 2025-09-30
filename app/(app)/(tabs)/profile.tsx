import { useState } from 'react';
import { Button, StyleSheet, TextInput, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Theme';
import { useAuth } from '@/components/auth';
import { fontSizes, fontWeight, colors, spacing, gap, border, padding, radii } from '@/constants/theme';
import CustomButton from '@/components/CustomButton';
import { useAuthToken } from '@/app/lib/userAuthToken';
import { capitalizeName } from '@/app/lib/capitalizeName';
import { useFetchProfile } from '@/app/hooks/useFetchProfile';
import { profileActions } from '@/app/lib/profileOperations';
import { toggleUnit } from '@/app/lib/toggleUnit';

export default function ProfileScreen() {

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [userName, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weight, setWeight] = useState('');
  const [isMetric, setIsMetric] = useState(true);
  const [isPace, setIsPace] = useState(true);

  const { signOut } = useAuth();
  const { token, loading: tokenLoading } = useAuthToken();
  const { saveProfile } = profileActions({
    setPassword,
    setHeightFeet,
    setHeightInches,
    setWeight,
  })

  const heightFeetNum = heightFeet === "" ? null : parseInt(heightFeet, 10);
  const heightInchesNum = heightInches === "" ? null : parseInt(heightInches, 10);
  const weightNum = weight === "" ? null : parseFloat(weight);

  useFetchProfile({
    tokenLoading,
    token,
    setLoading,
    setErr,
    setUsername,
    setHeightFeet,
    setHeightInches,
    setWeight,
    setIsMetric,
    setIsPace,
  })

  return (
    <ScrollView>
      <View style={styles.container}>
        <View style={styles.pageContainer}>
          <Text style={styles.title}>
            Hello, <Text style={styles.textHighlight}>{capitalizeName(userName)}</Text>
          </Text>

          {loading && <ActivityIndicator />}
          {err && <Text style={{ color: 'red' }}>{err}</Text>}

          {!loading && (
            <View style={styles.inputsContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputHeading}>Password</Text>
                <TextInput
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry           
                  style={styles.input}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputHeading}>Height (Feet and Inches)</Text>
                <View style={styles.twoColumnContainer}>
                  <TextInput
                    placeholder="Feet"
                    value={heightFeet}
                    onChangeText={(t) => setHeightFeet(t.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    style={
                      [
                        styles.input,
                        styles.inputFifty
                      ]}
                  />
                  <TextInput
                    placeholder="Inches"
                    value={heightInches}
                    onChangeText={(t) => setHeightInches(t.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    style={
                      [
                        styles.input,
                        styles.inputFifty
                      ]}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputHeading}>Weight {isMetric ? "(KG)" : "(LBS)"}</Text>
                <TextInput
                  placeholder={isMetric ? "Weight in kg" : "Weight in lb"}
                  value={weight}
                  onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ""))}  // allow one dot
                  keyboardType="decimal-pad"                                   // allow decimals
                  style={styles.input}
                />

              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputHeading}>Units</Text>
                <Text style={styles.inputHeading}>{isMetric ? 'Metric' : 'Imperial'}</Text>
                <Switch value={isMetric} onValueChange={() => toggleUnit({
                  weight,
                  isMetric,
                  setWeight,
                  setIsMetric
                })} />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputHeading}>Activity Time Preference</Text>
                <Text style={styles.inputHeading}>{isPace ? 'Pace' : 'Speed'}</Text>
                <Switch value={isPace} onValueChange={setIsPace} />
              </View>

              <CustomButton text="Save" onPress={() => saveProfile({
                password,
                heightFeetNum,
                heightInchesNum,
                weightNum,
                token,
                isMetric,
                isPace,
              })} />

              <CustomButton text="Sign Out" onPress={signOut} />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'flex-start', justifyContent: 'flex-start', padding: 16 },
  title: { fontSize: fontSizes.subTitle, fontWeight: fontWeight.bold },
  textHighlight: { color: colors.primary },
  separator: { marginVertical: spacing.lg, height: 1, width: '80%' },
  pageContainer: { display: 'flex', flexDirection: 'column', gap: gap.xl, width: '100%' },
  inputsContainer: { display: 'flex', flexDirection: 'column', gap: gap.md },
  inputContainer: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: gap.xs },
  input: { borderWidth: border.sm, padding: padding.sm, borderRadius: radii.md, width: '100%' },
  inputHeading: { fontSize: fontSizes.inputHeading },
  twoColumnContainer: { display: 'flex', flexDirection: 'row', gap: gap.sm },
  inputFifty: { flexBasis: '48%', },
});
