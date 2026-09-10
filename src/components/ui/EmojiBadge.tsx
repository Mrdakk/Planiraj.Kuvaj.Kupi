import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { getSaltShakerContents } from '@/constants/emojis';
import { SaltShakerIcon } from '@/components/ui/SaltShakerIcon';

export function EmojiBadge({
  emoji,
  size = 44,
  name,
}: {
  emoji: string;
  size?: number;
  name?: string;
}) {
  const shaker = name ? getSaltShakerContents(name) : null;

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
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
  circle: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
