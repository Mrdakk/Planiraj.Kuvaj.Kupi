import { StyleSheet, Pressable, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, hit, iconSize, typography, spacing } from '@/constants/theme';
import { useRecipes } from '@/hooks/useRecipes';
import { FabButton } from '@/components/ui/FabButton';
import { RecipeBrowseList } from '@/features/recipes/RecipeBrowseList';
import { emptyCta } from '@/components/ui/emptyCta';

export default function RecipesScreen() {
  const router = useRouter();
  const { data: recipes, isLoading } = useRecipes();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Recepti',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/recipes/import')}
              hitSlop={hit.slop}
              accessibilityRole="button"
              accessibilityLabel="Uvezi recept sa linka ili iz teksta"
              style={styles.headerAction}
            >
              <Ionicons name="link-outline" size={iconSize.md} color={colors.primary} />
              <Text style={styles.headerActionText}>Uvoz</Text>
            </Pressable>
          ),
        }}
      />
      {isLoading ? (
        <Text style={styles.subtitle}>Učitavanje...</Text>
      ) : (
        <RecipeBrowseList
          recipes={recipes ?? []}
          emptyTitle="Još nemaš recepata"
          emptyMessage="Dodaj prvi recept da počneš planiranje."
          emptyActionTitle={emptyCta.recipes.title}
          onEmptyAction={() => router.push(emptyCta.recipes.href)}
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
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: hit.min,
  },
  headerActionText: {
    ...typography.button,
    color: colors.primary,
  },
});
