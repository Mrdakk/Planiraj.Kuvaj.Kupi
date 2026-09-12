import { StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { useRecipes } from '@/hooks/useRecipes';
import { RecipeBrowseList } from '@/features/recipes/RecipeBrowseList';

const screenOptions = { title: 'Omiljeni recepti' };

export default function FavoritesScreen() {
  const { data: recipes, isLoading } = useRecipes();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={screenOptions} />
      {isLoading ? (
        <Text style={styles.subtitle}>Učitavanje...</Text>
      ) : (
        <RecipeBrowseList
          recipes={recipes ?? []}
          favoriteOnly
          emptyTitle="Nema omiljenih"
          emptyMessage="Označi recepte srcem da ih pronađeš ovde."
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
});
