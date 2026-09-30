import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, hit, iconSize, radii, spacing, shadows, typography } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addLabel?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  rightLabel?: string;
  onRightPress?: () => void;
  /** Extra content under the title row, e.g. week navigation. */
  children?: ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  onAdd,
  addLabel = 'Dodaj',
  rightIcon,
  rightLabel,
  onRightPress,
  children,
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {onRightPress && rightIcon ? (
          <Pressable
            onPress={onRightPress}
            style={styles.ghostButton}
            accessibilityRole="button"
            accessibilityLabel={rightLabel ?? title}
          >
            <Ionicons name={rightIcon} size={iconSize.md} color={colors.text} />
          </Pressable>
        ) : null}
        {onAdd ? (
          <Pressable
            onPress={onAdd}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={addLabel}
          >
            <Ionicons name="add" size={iconSize.lg} color={colors.onPrimary} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titles: {
    flex: 1,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  ghostButton: {
    width: hit.min,
    height: hit.min,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: hit.min,
    height: hit.min,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});
