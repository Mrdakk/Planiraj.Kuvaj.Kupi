import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type Ionicons from '@expo/vector-icons/Ionicons';
import { colors, hit, radii, spacing, shadows, typography } from '@/constants/theme';
import { NavRow } from '@/components/ui/NavRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAppStore } from '@/store/appStore';
import { syncStatusLabel } from '@/lib/networkCopy';

const menuItems: {
  title: string;
  subtitle: string;
  route: Href;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { title: 'Recepti', subtitle: 'Svi recepti, novi i uvoz sa linka', route: '/recipes', icon: 'book-outline' },
  { title: 'Omiljeni', subtitle: 'Recepti označeni srcem', route: '/favorites', icon: 'heart-outline' },
  { title: 'Istorija', subtitle: 'Šta je skuvano i kada', route: '/history', icon: 'time-outline' },
  { title: 'Podešavanja', subtitle: 'Porodica, QR kod i sinhronizacija', route: '/settings', icon: 'settings-outline' },
];

export default function MoreScreen() {
  const { syncStatus, isOnline } = useAppStore();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Više" subtitle={syncStatusLabel(syncStatus, isOnline)} />

      <View style={styles.group}>
        {menuItems.map((item, index) => (
          <View key={item.title}>
            {index > 0 ? <View style={styles.separator} /> : null}
            <NavRow
              title={item.title}
              subtitle={item.subtitle}
              icon={item.icon}
              onPress={() => router.push(item.route)}
            />
          </View>
        ))}
      </View>

      <Text style={styles.footnote}>
        Izmene se same šalju ukućanima kad ima interneta.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  group: {
    marginHorizontal: spacing.lg,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + hit.min - spacing.xs + spacing.md,
  },
  footnote: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
