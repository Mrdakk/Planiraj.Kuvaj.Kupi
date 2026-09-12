import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, shadows, spacing, typography } from '@/constants/theme';

export function FabButton({
  title,
  onPress,
  children,
}: {
  title: string;
  onPress: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {children}
      <Pressable onPress={onPress} style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
        <Text style={styles.text}>{title}</Text>
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
    borderRadius: 28,
    minHeight: 52,
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
