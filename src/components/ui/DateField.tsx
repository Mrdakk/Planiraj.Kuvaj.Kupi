import { createElement, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { formatDisplayDate, parseISODate, toISODate } from '@/lib/dates';
import { AppSheet, SheetFooter } from '@/components/ui/AppSheet';

interface DateFieldProps {
  label: string;
  value: string | null;
  onChange: (isoDate: string | null) => void;
  optional?: boolean;
  placeholder?: string;
  minimumDate?: string;
}

type WebDateInput = {
  click: () => void;
  showPicker?: () => void;
};

export function DateField({
  label,
  value,
  onChange,
  optional = false,
  placeholder = 'Izaberi datum',
  minimumDate,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const webInputRef = useRef<WebDateInput | null>(null);
  const minDate = parseISODate(minimumDate ?? '') ?? undefined;
  const selected = parseISODate(value) ?? minDate ?? new Date();

  const display = value ? formatDisplayDate(value) : '';

  const applyDate = (date: Date) => {
    if (minimumDate && toISODate(date) < minimumDate) {
      onChange(minimumDate);
      return;
    }
    onChange(toISODate(date));
  };

  const handleValueChange = (_event: DateTimePickerChangeEvent, date: Date) => {
    if (Platform.OS !== 'ios') {
      setOpen(false);
    }
    applyDate(date);
  };

  const openPicker = () => {
    if (Platform.OS === 'web') {
      const input = webInputRef.current;
      if (input) {
        if (typeof input.showPicker === 'function') {
          input.showPicker();
        } else {
          input.click();
        }
      }
      return;
    }
    setOpen(true);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.row}>
        <Pressable onPress={openPicker} style={styles.field}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={[styles.value, !display && styles.placeholder]} numberOfLines={1}>
            {display || placeholder}
          </Text>
        </Pressable>
        {optional && value ? (
          <Pressable onPress={() => onChange(null)} style={styles.clear} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {Platform.OS === 'web'
        ? createElement('input', {
            ref: (node: WebDateInput | null) => {
              webInputRef.current = node;
            },
            type: 'date',
            value: value ?? '',
            min: minimumDate,
            onChange: (event: { target: { value: string } }) => {
              const next = event.target.value || null;
              if (next && minimumDate && next < minimumDate) {
                onChange(minimumDate);
                return;
              }
              onChange(next);
            },
            style: {
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              width: 0,
              height: 0,
              border: 0,
            },
          })
        : null}

      {open && Platform.OS !== 'ios' && Platform.OS !== 'web' ? (
        <DateTimePicker
          value={selected}
          mode="date"
          display={Platform.OS === 'android' ? 'calendar' : 'default'}
          minimumDate={minDate}
          themeVariant="light"
          onValueChange={handleValueChange}
          onDismiss={() => setOpen(false)}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <AppSheet
          visible={open}
          onClose={() => setOpen(false)}
          title={label || 'Datum'}
          icon="calendar-outline"
          scrollable={false}
          footer={
            <SheetFooter confirmLabel="Gotovo" onConfirm={() => setOpen(false)} />
          }
        >
          <DateTimePicker
            value={selected}
            mode="date"
            display="inline"
            minimumDate={minDate}
            onValueChange={handleValueChange}
            locale="sr-RS"
            themeVariant="light"
            style={styles.iosPicker}
          />
        </AppSheet>
      ) : null}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  value: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    color: colors.textMuted,
  },
  clear: {
    padding: spacing.xs,
  },
  iosPicker: {
    alignSelf: 'center',
  },
});
