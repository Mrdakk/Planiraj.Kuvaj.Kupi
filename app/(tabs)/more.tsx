import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAppStore } from '@/store/appStore';
import { syncStatusLabel } from '@/lib/networkCopy';

const menuItems = [
  { title: 'Recepti', route: '/recipes', icon: 'book-outline' as const },
  { title: 'Omiljeni', route: '/favorites', icon: 'heart-outline' as const },
  { title: 'Istorija', route: '/history', icon: 'time-outline' as const },
  { title: 'Podešavanja', route: '/settings', icon: 'settings-outline' as const },
];

export default function MoreScreen() {
  const { syncStatus, isOnline } = useAppStore();
  const router = useRouter();

  const statusLabel = syncStatusLabel(syncStatus, isOnline);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Više" />

      <View style={styles.content}>
        {menuItems.map((item) => (
          <Pressable key={item.route} onPress={() => router.push(item.route)}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconCircle}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </Card>
          </Pressable>
        ))}

        <Card style={styles.card}>
          <Text style={styles.statusLabel}>Sinhronizacija porodice</Text>
          <Text style={styles.statusValue}>{statusLabel}</Text>
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
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
  },
  statusLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  statusValue: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xs,
  },
});
