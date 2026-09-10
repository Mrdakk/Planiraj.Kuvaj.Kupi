import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';

interface ChipRowProps {
  items: readonly string[];
  selected: string | null;
  onSelect: (item: string | null) => void;
  allLabel?: string;
  allowDeselect?: boolean;
  padded?: boolean;
  labelFor?: (item: string) => string;
  isMuted?: (item: string) => boolean;
}

export function ChipRow({
  items,
  selected,
  onSelect,
  allLabel,
  allowDeselect,
  padded = true,
  labelFor,
  isMuted,
}: ChipRowProps) {
  const canDeselect = allowDeselect ?? !allLabel;
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.content, !padded && styles.contentFlush]}
      >
        {allLabel ? (
          <Pressable
            onPress={() => onSelect(null)}
            style={[styles.chip, selected === null && styles.chipActive]}
          >
            <Text style={[styles.chipText, selected === null && styles.chipTextActive]}>
              {allLabel}
            </Text>
          </Pressable>
        ) : null}
        {items.map((item) => {
          const active = selected === item;
          const muted = isMuted?.(item) ?? false;
          return (
            <Pressable
              key={item}
              onPress={() => onSelect(active && canDeselect ? null : item)}
              style={[
                styles.chip,
                muted && styles.chipMuted,
                active && (muted ? styles.chipMutedActive : styles.chipActive),
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  muted && styles.chipTextMuted,
                  active && styles.chipTextActive,
                ]}
              >
                {labelFor ? labelFor(item) : item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 0,
    flexShrink: 0,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  contentFlush: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#F5F5F4',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  chipMuted: {
    backgroundColor: '#E7E5E4',
    borderColor: '#D6D3D1',
  },
  chipMutedActive: {
    backgroundColor: '#A8A29E',
    borderColor: '#A8A29E',
  },
  chipTextMuted: {
    color: colors.textMuted,
  },
});
