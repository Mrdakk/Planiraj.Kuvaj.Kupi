import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/constants/theme';

export function IngredientEditActions({
  onRename,
  onLink,
}: {
  onRename: () => void;
  onLink: () => void;
}) {
  return (
    <View style={styles.row}>
      <Button title="Preimenuj" onPress={onRename} variant="secondary" style={styles.button} />
      <Button title="Poveži" onPress={onLink} variant="secondary" style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
  },
});
