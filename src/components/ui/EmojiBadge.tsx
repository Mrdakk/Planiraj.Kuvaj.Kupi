import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { getSaltShakerContents } from '@/constants/emojis';
import { SaltShakerIcon } from '@/components/ui/SaltShakerIcon';

export function EmojiBadge({
  emoji,
  size = 44,
  name,
  shape = 'circle',
}: {
  emoji: string;
  size?: number;
  name?: string;
  shape?: 'circle' | 'rounded';
}) {
  const shaker = name ? getSaltShakerContents(name) : null;

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: shape === 'rounded' ? Math.max(12, size * 0.22) : size / 2,
        },
      ]}
    >
      {shaker ? (
        <SaltShakerIcon size={size} contents={shaker} />
      ) : (
        <Text style={{ fontSize: size * 0.48 }}>{emoji}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
