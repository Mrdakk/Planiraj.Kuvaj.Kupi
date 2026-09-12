import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, typography } from '@/constants/theme';
import { EmojiBadge } from '@/components/ui/EmojiBadge';
import { NewBadge } from '@/components/ui/NewBadge';
import type { ReactNode } from 'react';

interface ListRowProps {
  emoji: string;
  title: string;
  subtitle?: string;
  trailing?: string;
  trailingColor?: string;
  trailingNode?: ReactNode;
  dayLabel?: string;
  dateLabel?: string | number;
  checked?: boolean;
  showCheck?: boolean;
  onPress?: () => void;
  onToggleCheck?: () => void;
  showNew?: boolean;
  highlighted?: boolean;
  emptyStock?: boolean;
}

export function ListRow({
  emoji,
  title,
  subtitle,
  trailing,
  trailingColor = colors.textSecondary,
  trailingNode,
  dayLabel,
  dateLabel,
  checked,
  showCheck,
  onPress,
  onToggleCheck,
  showNew = false,
  highlighted = false,
  emptyStock = false,
}: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        highlighted ? styles.highlighted : null,
        emptyStock ? styles.emptyStock : null,
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      {dayLabel != null ? (
        <View style={styles.dayCol}>
          <Text style={styles.dayText}>{dayLabel}</Text>
          {dateLabel != null ? <Text style={styles.dateText}>{dateLabel}</Text> : null}
        </View>
      ) : null}

      {showCheck ? (
        <Pressable
          onPress={(event: GestureResponderEvent) => {
            event.stopPropagation();
            onToggleCheck?.();
          }}
          style={styles.check}
          hitSlop={8}
        >
          <Ionicons
            name={checked ? 'checkbox' : 'square-outline'}
            size={22}
            color={checked ? colors.primary : colors.textMuted}
          />
        </Pressable>
      ) : null}

      <EmojiBadge emoji={emoji} size={44} name={title} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, checked && styles.checked]} numberOfLines={1}>
            {title}
          </Text>
          {showNew ? <NewBadge /> : null}
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailingNode ? (
        <Pressable onPress={(event: GestureResponderEvent) => event.stopPropagation()}>
          {trailingNode}
        </Pressable>
      ) : trailing ? (
        <Text style={[styles.trailing, { color: trailingColor }]}>{trailing}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  highlighted: {
    backgroundColor: colors.surfaceAlt,
  },
  emptyStock: {
    backgroundColor: '#FEF2F2',
  },
  dayCol: {
    width: 86,
    alignItems: 'flex-start',
  },
  dayText: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  dateText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
    marginTop: 1,
  },
  check: {
    marginRight: -spacing.xs,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  checked: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
    fontWeight: '400',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  trailing: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
