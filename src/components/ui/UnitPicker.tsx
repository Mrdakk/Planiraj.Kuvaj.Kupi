import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { allUnits, type Unit } from '@/constants/units';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';

export function UnitPicker({
  value,
  onChange,
  label = 'Jedinica',
}: {
  value: Unit;
  onChange: (unit: Unit) => void;
  label?: string;
}) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.field}>
        <Picker
          dropdownIconColor={colors.text}
          style={styles.picker}
          selectedValue={value}
          onValueChange={(next) => onChange(next as Unit)}
          accessibilityLabel={label}
        >
          {allUnits.map((unit) => (
            <Picker.Item color={colors.text} key={unit} label={unit} value={unit} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  field: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  picker: {
    color: colors.text,
  },
});
