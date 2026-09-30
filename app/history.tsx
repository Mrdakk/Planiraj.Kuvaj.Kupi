import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { useCookedMealHistory } from '@/hooks/useHistory';
import { EmptyState } from '@/components/ui/EmptyState';
import { NavRow } from '@/components/ui/NavRow';
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
            <NavRow
              title={item.recipeName}
              subtitle={`${formatDisplayDate(item.date)} · ${item.mealType}`}
              onPress={() => router.push(`/meals/${item.id}`)}
            />
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
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
});