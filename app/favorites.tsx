import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { useRecipes } from '@/hooks/useRecipes';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getRecipeEmoji } from '@/constants/emojis';
import { isCreatedToday } from '@/lib/dates';

const screenOptions = { title: 'Omiljeni recepti' };

export default function FavoritesScreen() {
  const router = useRouter();
  const { data: recipes, isLoading } = useRecipes();
  const favorites = (recipes ?? []).filter((r) => r.isFavorite);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={screenOptions} />
        <ScreenHeader title="Omiljeni" />
        <Text style={styles.subtitle}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={screenOptions} />
      <ScreenHeader title="Omiljeni recepti" />

      {favorites.length === 0 ? (
        <EmptyState
          title="Nema omiljenih"
          message="Označi recepte srcem da ih pronađeš ovde."
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <ListRow
              emoji={getRecipeEmoji(item.name, item.emoji)}
              title={item.name}
              subtitle={`${item.baseServings} porcije`}
              trailing="❤️"
              showNew={isCreatedToday(item.createdAt)}
              onPress={() => router.push(`/recipes/${item.id}`)}
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
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 72,
  },
});
