import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { useCookedMealHistory } from '@/hooks/useHistory';
import { EmptyState } from '@/components/ui/EmptyState';
import { emptyCta } from '@/components/ui/emptyCta';
import { formatDisplayDate } from '@/lib/dates';

const screenOptions = { title: 'Istorija' };

export default function HistoryScreen() {
  const router = useRouter();
  const { data: history, isLoading } = useCookedMealHistory();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={screenOptions} />
        <Text style={styles.subtitle}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  const rows = history ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={screenOptions} />

      {rows.length === 0 ? (
        <EmptyState
          title="Još nema istorije"
          message="Označi obrok kao kuvano da pratiš šta si skuvao."
          actionTitle={emptyCta.history.title}
          onAction={() => router.push(emptyCta.history.href)}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/meals/${item.id}`)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.date}>{formatDisplayDate(item.date)}</Text>
              <Text style={styles.meal} numberOfLines={1}>
                {item.recipeName}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
  },
  list: {
    paddingBottom: spacing.xxxl,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  date: {
    ...typography.body,
    color: colors.textSecondary,
  },
  meal: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});
