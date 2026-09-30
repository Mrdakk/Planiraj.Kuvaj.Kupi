import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, layout, shadows, spacing, typography } from '@/constants/theme';

export function FabButton({
  title,
  onPress,
  loading = false,
  children,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {children}
      <Pressable
        onPress={onPress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ busy: loading }}
        style={({ pressed }) => [styles.fab, (pressed || loading) && styles.pressed]}
      >
        {loading ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: spacing.sm,
  },
  fab: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minHeight: layout.fabHeight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    ...typography.button,
    color: colors.onPrimary,
  },
});
