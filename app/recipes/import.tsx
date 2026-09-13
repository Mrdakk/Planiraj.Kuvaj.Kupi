import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { ChipRow } from '@/components/ui/ChipRow';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmojiBadge } from '@/components/ui/EmojiBadge';
import { Input } from '@/components/ui/Input';
import { IngredientEditActions } from '@/features/ingredients/IngredientEditActions';
import { IngredientPickerSheet } from '@/features/ingredients/IngredientPickerSheet';
import { IngredientRenameSheet } from '@/features/ingredients/IngredientRenameSheet';
import { createRecipeWithIngredients, type RecipeIngredientInput } from '@/features/recipes/service';
import { importRecipeFromText, importRecipeFromUrl, type ImportedRecipe } from '@/features/recipes/importFromUrl';
import { useIngredients } from '@/hooks/useIngredients';
import { queryKeys } from '@/hooks/queryKeys';
import { formatAmount } from '@/lib/formatQuantity';
import { formatServings } from '@/lib/formatServings';
import { displayIngredientName } from '@/lib/ingredientNames';
import { getIngredientEmoji, getRecipeEmoji } from '@/constants/emojis';
import type { Ingredient } from '@/types';

export default function ImportRecipeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: ingredients } = useIngredients();
  const [mode, setMode] = useState<'Link' | 'Tekst'>('Link');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ImportedRecipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  const selected = preview && selectedIndex !== null ? preview.ingredients[selectedIndex] : null;

  const handleRead = async () => {
    setLoading(true);
    setPreview(null);
    setEditing(false);
    setSelectedIndex(null);
    try {
      const imported =
        mode === 'Tekst' ? await importRecipeFromText(text) : await importRecipeFromUrl(url);
      setPreview({
        ...imported,
        ingredients: imported.ingredients.map((item) => ({
          ...item,
          sourceName: item.sourceName ?? item.rawName,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proveri link i internet, pa pokušaj ponovo.');
    } finally {
      setLoading(false);
    }
  };

  const updateIngredient = (index: number, patch: Partial<RecipeIngredientInput>) => {
    setPreview((current) => {
      if (!current) return current;
      return {
        ...current,
        ingredients: current.ingredients.map((item, i) => (i === index ? { ...item, ...patch } : item)),
      };
    });
  };

  const handleLink = (keep: Ingredient) => {
    if (selectedIndex === null) return;
    const current = preview?.ingredients[selectedIndex];
    updateIngredient(selectedIndex, {
      rawName: keep.name,
      linkToIngredientId: keep.id,
      sourceName: current?.sourceName ?? current?.rawName,
    });
    setSelectedIndex(null);
  };

  const handleRename = (name: string) => {
    if (selectedIndex === null) return;
    const current = preview?.ingredients[selectedIndex];
    updateIngredient(selectedIndex, {
      rawName: name,
      linkToIngredientId: undefined,
      sourceName: current?.sourceName ?? current?.rawName,
    });
    setSelectedIndex(null);
  };

  const handleSave = async () => {
    if (!preview || saving) return;
    setSaving(true);
    try {
      const recipe = await createRecipeWithIngredients(preview);
      await queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
      router.replace(`/recipes/${recipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recept nije sačuvan. Pokušaj ponovo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Uvoz recepta',
          headerRight: preview
            ? () => (
                <Pressable
                  onPress={() => {
                    setEditing((value) => !value);
                    setSelectedIndex(null);
                  }}
                  style={{ marginRight: spacing.md }}
                >
                  <Text style={styles.editText}>{editing ? 'Pregled' : 'Uredi'}</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      {preview ? (
        <ScrollView contentContainerStyle={styles.preview} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <EmojiBadge emoji={getRecipeEmoji(preview.name, preview.emoji)} size={56} />
            <Text style={styles.title}>{preview.name}</Text>
          </View>
          {preview.dishType ? <Text style={styles.meta}>{preview.dishType}</Text> : null}
          {preview.mealTypes?.length ? (
            <Text style={styles.meta}>{preview.mealTypes.join(' · ')}</Text>
          ) : null}
          <Text style={styles.meta}>{formatServings(preview.baseServings)}</Text>
          {preview.prepTimeMinutes ? (
            <Text style={styles.meta}>Vreme pripreme: {preview.prepTimeMinutes} min</Text>
          ) : null}
          {preview.description ? <Text style={styles.body}>{preview.description}</Text> : null}

          <Text style={styles.sectionTitle}>Sastojci</Text>
          {preview.ingredients.map((item, index) => {
            const linked = ingredients?.find((row) => row.id === item.linkToIngredientId);
            const name = displayIngredientName(item.rawName || linked?.name);
            const card = (
              <Card tone="bone" style={styles.ingredientCard}>
                <View style={styles.ingredientRow}>
                  <EmojiBadge
                    emoji={getIngredientEmoji(name, linked?.category, linked?.emoji)}
                    size={36}
                    name={name}
                  />
                  <View style={styles.ingredientBody}>
                    <Text style={styles.ingredientName}>{name}</Text>
                    <Text style={styles.ingredientQuantity}>
                      {formatAmount(item.quantity, item.unit)}
                    </Text>
                    {item.notes ? <Text style={styles.note}>{item.notes}</Text> : null}
                  </View>
                </View>
                {editing && selectedIndex === index ? (
                  <IngredientEditActions
                    onRename={() => setRenameOpen(true)}
                    onLink={() => setPickerOpen(true)}
                  />
                ) : null}
              </Card>
            );
            if (!editing) {
              return <View key={`${item.sourceName ?? item.rawName}-${index}`}>{card}</View>;
            }
            return (
              <Pressable
                key={`${item.sourceName ?? item.rawName}-${index}`}
                onPress={() => setSelectedIndex((current) => (current === index ? null : index))}
              >
                {card}
              </Pressable>
            );
          })}

          {preview.steps.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Koraci pripreme</Text>
            <Card tone="bone">
              {preview.steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <Text style={styles.stepNumber}>{index + 1}.</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </Card>
            </>
          ) : null}

          <View style={styles.actions}>
            <Button title="Sačuvaj recept" onPress={handleSave} loading={saving} disabled={saving} />
            <Button
              title="Otkaži"
              onPress={() => {
                setPreview(null);
                setEditing(false);
                setSelectedIndex(null);
              }}
              variant="secondary"
              disabled={saving}
            />
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ChipRow
            items={['Link', 'Tekst']}
            selected={mode}
            onSelect={(item) => {
              if (item === 'Link' || item === 'Tekst') setMode(item);
            }}
            allowDeselect={false}
            padded={false}
          />
          {mode === 'Link' ? (
            <>
              <Text style={styles.help}>
                Nalepi link recepta, javni TikTok, Reels ili Shorts. Radi kad su sastojci na stranici, u
                opisu ili u titlovima. Prvo ćeš videti pregled, pa tek onda biraš da sačuvaš. Kuhinja se
                ne menja.
              </Text>
              <Input
                label="Link"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://www.tiktok.com/@…/video/…"
              />
            </>
          ) : (
            <>
              <Text style={styles.help}>
                Nalepi sirovi recept — sastojci i koraci kako god stoje. Prvo ćeš videti pregled, pa tek
                onda biraš da sačuvaš. Kuhinja se ne menja.
              </Text>
              <Input
                label="Tekst recepta"
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="top"
                placeholder={'Musaka\n500 g mesa\n4 krompira\nIsprži meso, pa složi sa krompirom.'}
                style={styles.textPaste}
              />
            </>
          )}
          <Button
            title="Učitaj recept"
            onPress={handleRead}
            loading={loading}
            disabled={(mode === 'Link' ? !url.trim() : text.trim().length < 40) || loading}
          />
        </ScrollView>
      )}
      <IngredientPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        ingredients={ingredients ?? []}
        excludeIds={selected?.linkToIngredientId ? [selected.linkToIngredientId] : []}
        absorbName={selected?.rawName ?? selected?.sourceName ?? ''}
        onConfirm={handleLink}
      />
      <IngredientRenameSheet
        visible={renameOpen}
        onClose={() => setRenameOpen(false)}
        initialName={selected?.rawName ?? ''}
        onSave={handleRename}
      />
      <ConfirmSheet
        visible={error !== null}
        title="Uvoz nije uspeo"
        message={error ?? ''}
        confirmLabel="U redu"
        variant="warning"
        hideCancel
        onConfirm={() => setError(null)}
        onCancel={() => setError(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  help: {
    ...typography.body,
    color: colors.textSecondary,
  },
  textPaste: {
    minHeight: 160,
  },
  preview: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    flex: 1,
  },
  editText: {
    ...typography.body,
    color: colors.primary,
  },
  meta: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  ingredientCard: {
    marginBottom: spacing.md,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ingredientBody: {
    flex: 1,
  },
  ingredientName: {
    ...typography.h3,
    color: colors.textOnLight,
  },
  ingredientQuantity: {
    ...typography.body,
    color: colors.textOnLightMuted,
    marginTop: spacing.xs,
  },
  note: {
    ...typography.bodySmall,
    color: colors.textOnLightMuted,
    marginTop: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  stepNumber: {
    ...typography.body,
    color: colors.primary,
    width: 28,
  },
  stepText: {
    ...typography.body,
    color: colors.textOnLight,
    flex: 1,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
});
