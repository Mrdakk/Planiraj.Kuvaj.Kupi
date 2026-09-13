import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { colors, typography, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/store/appStore';
import { autoSync } from '@/sync/runtime';
import { getHouseholdState } from '@/features/household/state';
import { buildJoinUrl } from '@/features/household/membership';
import { networkLabel, syncStatusLabel } from '@/lib/networkCopy';
import type { HouseholdState } from '@/types';

const screenOptions = { title: 'Podešavanja' };

export default function SettingsScreen() {
  const { syncStatus, isOnline } = useAppStore();
  const [household, setHousehold] = useState<HouseholdState | null>(null);

  useEffect(() => {
    void getHouseholdState().then(setHousehold);
  }, []);

  const statusLabel = syncStatusLabel(syncStatus, isOnline);

  const joinUrl = household ? buildJoinUrl(household.joinToken) : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={screenOptions} />
      <ScrollView contentContainerStyle={styles.content}>
        {household ? (
          <Card style={styles.card}>
            <Text style={styles.label}>Porodica</Text>
            <Text style={styles.value}>{household.displayName}</Text>
            <Text style={styles.hint}>
              Ko ima ovaj QR i unese tvoje ime, ulazi kao ti na ovu kuhinju.
            </Text>
            {joinUrl ? (
              <View style={styles.qrWrap}>
                <QRCode value={joinUrl} size={196} />
              </View>
            ) : null}
            <Text style={styles.label}>Kod</Text>
            <Text style={styles.token} selectable>
              {household.joinToken}
            </Text>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text style={styles.label}>Sinhronizacija porodice</Text>
          <Text style={styles.value}>{statusLabel}</Text>
          <Text style={styles.hint}>
            Izmene se same šalju i preuzimaju. Drugi član porodice ih vidi bez ručnog osvežavanja.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Mreža</Text>
          <Text style={styles.value}>{networkLabel(isOnline)}</Text>
        </Card>

        <Pressable onPress={() => void autoSync.runNow()}>
          <Card style={styles.card}>
            <Text style={styles.actionText}>Sinhronizuj sada</Text>
          </Card>
        </Pressable>

        <Card style={styles.card}>
          <Text style={styles.label}>Verzija</Text>
          <Text style={styles.value}>1.0.0</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  value: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  qrWrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  token: {
    ...typography.bodySmall,
    color: colors.text,
    marginTop: spacing.xs,
  },
  actionText: {
    ...typography.h3,
    color: colors.primary,
  },
});
