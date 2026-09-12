import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { AppSheet, SheetFooter } from '@/components/ui/AppSheet';

type ConfirmVariant = 'danger' | 'success' | 'warning';

const VARIANT_STYLE: Record<
  ConfirmVariant,
  {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBackground: string;
    confirmVariant: 'primary' | 'danger';
  }
> = {
  danger: {
    icon: 'trash-outline',
    iconColor: colors.danger,
    iconBackground: colors.dangerSoft,
    confirmVariant: 'danger',
  },
  success: {
    icon: 'checkmark-circle-outline',
    iconColor: colors.success,
    iconBackground: colors.successSoft,
    confirmVariant: 'primary',
  },
  warning: {
    icon: 'alert-circle-outline',
    iconColor: colors.primary,
    iconBackground: colors.surfaceAlt,
    confirmVariant: 'primary',
  },
};

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
  const look = VARIANT_STYLE[variant];

  return (
    <AppSheet
      visible={visible}
      onClose={onCancel}
      title={title}
      subtitle={message}
      icon={look.icon}
      iconColor={look.iconColor}
      iconBackground={look.iconBackground}
      footer={
        <SheetFooter
          cancelLabel={cancelLabel}
          confirmLabel={confirmLabel}
          onCancel={hideCancel ? undefined : onCancel}
          onConfirm={onConfirm}
          confirmVariant={look.confirmVariant}
          loading={loading}
        />
      }
    />
  );
}
