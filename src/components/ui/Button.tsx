import { Pressable, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const backgroundColor = {
    primary: colors.primary,
    secondary: '#F5F5F4',
    danger: colors.danger,
    ghost: 'transparent',
  }[variant];

  const textColor = {
    primary: '#fff',
    secondary: colors.text,
    danger: '#fff',
    ghost: colors.primary,
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: pressed || disabled ? 0.7 : 1 },
        style,
      ]}
    >
      <Text style={[styles.text, { color: textColor }, textStyle]}>
        {loading ? 'Učitavanje...' : title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    flexDirection: 'row',
  },
  text: {
    ...typography.button,
  },
});
