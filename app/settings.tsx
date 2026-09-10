import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/store/appStore';
import { syncEngine } from '@/sync/engine';

const screenOptions = { title: 'Podešavanja' };

export default function SettingsScreen() {
  const { syncStatus, isOnline } = useAppStore();

  const statusLabel =
    syncStatus === 'synced'
      ? 'Sinhronizovano'
      : syncStatus === 'syncing'
      ? 'Sinhronizacija u toku...'
      : syncStatus === 'pending'
      ? 'Čeka sinhronizaciju'
      : syncStatus === 'offline' || !isOnline
      ? 'Offline'
      : 'Greška pri sinhronizaciji';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={screenOptions} />
      <Text style={styles.title}>Podešavanja</Text>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.label}>Status sinhronizacije</Text>
          <Text style={styles.value}>{statusLabel}</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Mreža</Text>
          <Text style={styles.value}>{isOnline ? 'Online' : 'Offline'}</Text>
        </Card>

        <Pressable onPress={() => syncEngine.sync()}>
          <Card style={styles.card}>
            <Text style={styles.actionText}>Sinhronizuj sada</Text>
          </Card>
        </Pressable>

        <Card style={styles.card}>
          <Text style={styles.label}>Verzija</Text>
          <Text style={styles.value}>1.0.0</Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
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
  actionText: {
    ...typography.h3,
    color: colors.primary,
  },
});
