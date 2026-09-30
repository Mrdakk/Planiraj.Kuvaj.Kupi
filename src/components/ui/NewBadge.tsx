import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/constants/theme';

export function NewBadge() {
  return (
    <View style={styles.badge} accessibilityLabel="Novo">
      <Text style={styles.text}>NOVO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  text: {
    ...typography.caption,
    color: colors.onPrimary,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
