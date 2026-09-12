import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, spacing, shadows } from '@/constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  tone?: 'dark' | 'bone';
}

export function Card({ children, style, tone = 'dark', ...rest }: CardProps) {
  return (
    <View style={[styles.card, tone === 'bone' && styles.bone, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    ...shadows.md,
  },
  bone: {
    backgroundColor: colors.surfaceAlt,
  },
});
