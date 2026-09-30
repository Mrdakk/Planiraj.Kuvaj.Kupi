import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import appConfig from '../app.json';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { colors, typography, spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { useAppStore, type AppState } from '@/store/appStore';
import { autoSync } from '@/sync/runtime';
import { getHouseholdState } from '@/features/household/state';
import { buildJoinUrl } from '@/features/household/membership';
import { networkLabel, syncStatusLabel } from '@/lib/networkCopy';
import type { HouseholdState } from '@/types';

const screenOptions = { title: 'Podešavanja' };

const SYNC_RESULT_COPY: Record<AppState['syncStatus'], { title: string; message: string }> = {
  synced: { title: 'Sinhronizovano', message: 'Sve izmene su poslate i preuzete.' },
  pending: {
    title: 'Još se šalje',
    message: 'Neke izmene čekaju red. Aplikacija nastavlja sama.',
  },
  syncing: { title: 'U toku', message: 'Sinhronizacija je već pokrenuta.' },
  error: {
    title: 'Nije sve poslato',
    message: 'Server nije prihvatio neke izmene. Ostaju na telefonu i aplikacija pokušava ponovo.',
  },
  offline: {
    title: 'Van mreže',
    message: 'Nema veze sa serverom. Izmene ostaju na telefonu dok se veza ne vrati.',
  },
};

export default function SettingsScreen() {
  const { syncStatus, isOnline } = useAppStore();
  const [household, setHousehold] = useState<HouseholdState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ title: string; message: string } | null>(null);

  const syncNow = async () => {
    if (syncing) return;
    if (!isOnline) {
      setSyncResult(SYNC_RESULT_COPY.offline);
      return;
    }
    setSyncing(true);
    try {
      await autoSync.runNow();
      setSyncResult(SYNC_RESULT_COPY[useAppStore.getState().syncStatus]);
    } finally {
      setSyncing(false);
    }
  };

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
              Pokaži ovaj QR samo ukućanima. Ko ga skenira i upiše tvoje ime, ulazi u kuhinju
              kao ti.
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

        <Button
          title="Sinhronizuj sada"
          variant="secondary"
          onPress={() => void syncNow()}
          loading={syncing}
          style={styles.card}
        />

        <Card style={styles.card}>
          <Text style={styles.label}>Verzija</Text>
          <Text style={styles.value}>{appConfig.expo.version}</Text>
        </Card>
      </ScrollView>
      <ConfirmSheet
        visible={syncResult !== null}
        title={syncResult?.title ?? ''}
        message={syncResult?.message ?? ''}
        confirmLabel="U redu"
        variant={syncResult === SYNC_RESULT_COPY.synced ? 'success' : 'warning'}
        hideCancel
        onConfirm={() => setSyncResult(null)}
        onCancel={() => setSyncResult(null)}
      />
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
});
