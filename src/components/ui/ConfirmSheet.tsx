import { StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';
import { AppSheet, SheetFooter } from '@/components/ui/AppSheet';

type ConfirmVariant = 'danger' | 'success' | 'warning';

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Potvrdi',
  cancelLabel = 'Otkaži',
  variant = 'warning',
  hideCancel = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  hideCancel?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AppSheet
      visible={visible}
      onClose={onCancel}
      title={title}
      footer={
        <SheetFooter
          cancelLabel={cancelLabel}
          confirmLabel={confirmLabel}
          onCancel={hideCancel ? undefined : onCancel}
          onConfirm={onConfirm}
          confirmVariant={variant === 'danger' ? 'danger' : 'primary'}
          loading={loading}
        />
      }
    >
      <Text style={styles.message}>{message}</Text>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  message: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    paddingBottom: spacing.sm,
  },
});
