import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';

interface ChipRowProps {
  items: readonly string[];
  selected: string | null;
  onSelect: (item: string | null) => void;
  allLabel?: string;
  allowDeselect?: boolean;
  padded?: boolean;
  compact?: boolean;
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
  compact = false,
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
            accessibilityRole="button"
            accessibilityState={{ selected: selected === null }}
            style={[styles.chip, compact && styles.chipCompact, selected === null && styles.chipActive]}
          >
            <Text style={[styles.chipText, compact && styles.chipTextCompact, selected === null && styles.chipTextActive]}>
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
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              hitSlop={{ top: spacing.xs, bottom: spacing.xs }}
              style={[
                styles.chip,
                compact && styles.chipCompact,
                muted && styles.chipMuted,
                active && (muted ? styles.chipMutedActive : styles.chipActive),
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  compact && styles.chipTextCompact,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'center',
  },
  chipCompact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 0,
    backgroundColor: colors.surfaceRaised,
  },
  chipTextCompact: {
    ...typography.label,
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
    color: colors.onPrimary,
  },
  chipMuted: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
  chipMutedActive: {
    backgroundColor: colors.textMuted,
    borderColor: colors.textMuted,
  },
  chipTextMuted: {
    color: colors.textMuted,
  },
  toggleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});

export function ChipToggleRow({
  items,
  selected,
  onToggle,
}: {
  items: readonly string[];
  selected: readonly string[];
  onToggle: (item: string) => void;
}) {
  return (
    <View style={styles.toggleWrap}>
      {items.map((item) => {
        const active = selected.includes(item);
        return (
          <Pressable
            key={item}
            onPress={() => onToggle(item)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
