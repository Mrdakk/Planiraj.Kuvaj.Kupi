import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { useRecipes } from '@/hooks/useRecipes';
import { EmptyState } from '@/components/ui/EmptyState';
import { FabButton } from '@/components/ui/FabButton';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getRecipeEmoji } from '@/constants/emojis';
import { isCreatedToday } from '@/lib/dates';

const screenOptions = { title: 'Recepti' };

export default function RecipesScreen() {
  const router = useRouter();
  const { data: recipes, isLoading } = useRecipes();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={screenOptions} />
        <ScreenHeader
          title="Recepti"
          rightIcon="link-outline"
          onRightPress={() => router.push('/recipes/import')}
        />
        <Text style={styles.subtitle}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={screenOptions} />
      <ScreenHeader
        title="Recepti"
        rightIcon="link-outline"
        onRightPress={() => router.push('/recipes/import')}
      />

      {recipes && recipes.length > 0 ? (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <ListRow
              emoji={getRecipeEmoji(item.name, item.emoji)}
              title={item.name}
              subtitle={
                item.category
                  ? `${item.category} · ${item.baseServings} porc.`
                  : `${item.baseServings} porcije`
              }
              trailing={item.isFavorite ? '❤️' : undefined}
              showNew={isCreatedToday(item.createdAt)}
              onPress={() => router.push(`/recipes/${item.id}`)}
            />
          )}
        />
      ) : (
        <EmptyState
          title="Još nemaš recepata"
          message="Dodaj prvi recept da počneš planiranje."
        />
      )}

      <FabButton title="+ Novi recept" onPress={() => router.push('/recipes/create')} />
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
    paddingBottom: 96,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 72,
  },
});
