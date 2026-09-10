import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { useConsumptionHistory } from '@/hooks/useHistory';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatAmount } from '@/lib/formatQuantity';
import { formatDisplayDate } from '@/lib/dates';

const screenOptions = { title: 'Istorija' };

export default function HistoryScreen() {
  const { data: history, isLoading } = useConsumptionHistory();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={screenOptions} />
        <Text style={styles.title}>Istorija</Text>
        <Text style={styles.subtitle}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  const groupedByDate = (history ?? []).reduce((acc, item) => {
    const date = item.consumedAt.split('T')[0];
    const list = acc.get(date) ?? [];
    list.push(item);
    acc.set(date, list);
    return acc;
  }, new Map<string, typeof history>());

  const sections = Array.from(groupedByDate.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={screenOptions} />
      <Text style={styles.title}>Istorija</Text>

      {sections.length === 0 ? (
        <EmptyState title="Još nema istorije" message="Označi obrok kao kuvano da pratiš potrošnju." />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={([date]) => date}
          contentContainerStyle={styles.list}
          renderItem={({ item: [date, items] }) => (
            <Card style={styles.card}>
              <Text style={styles.date}>{formatDisplayDate(date)}</Text>
              {items?.map((item) => (
                <View key={item.id} style={styles.row}>
                  <Text style={styles.recipe}>{item.recipe?.name ?? 'Obrok'}</Text>
                  <Text style={styles.detail}>
                    {formatAmount(item.quantity, item.unit)}
                  </Text>
                </View>
              ))}
            </Card>
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
  title: {
    ...typography.h1,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  date: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  recipe: {
    ...typography.body,
    color: colors.text,
  },
  detail: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
