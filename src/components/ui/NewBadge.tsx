import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

export function NewBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>NOVO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  text: {
    ...typography.caption,
    color: colors.onPrimary,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
