import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { borderRadius, colors, layout, shadows, spacing, typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export function AppSheet({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  iconColor = colors.primary,
  children,
  footer,
  scrollable = true,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  children?: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.root}>
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Zatvori"
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              {icon ? <Ionicons name={icon} size={22} color={iconColor} /> : null}
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
            </View>
            {children ? (
              scrollable ? (
                <ScrollView
                  style={styles.body}
                  contentContainerStyle={styles.bodyContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={styles.bodyContent}>{children}</View>
              )
            ) : null}
            {footer ? <View style={styles.footerWrap}>{footer}</View> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetFooter({
  cancelLabel = 'Otkaži',
  confirmLabel,
  onCancel,
  onConfirm,
  confirmVariant = 'primary',
  loading = false,
  confirmDisabled = false,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  onCancel?: () => void;
  onConfirm: () => void;
  confirmVariant?: 'primary' | 'danger' | 'secondary' | 'ghost';
  loading?: boolean;
  confirmDisabled?: boolean;
}) {
  return (
    <View style={styles.footer}>
      {onCancel ? (
        <Button title={cancelLabel} onPress={onCancel} variant="ghost" style={styles.footerButton} />
      ) : null}
      <Button
        title={confirmLabel}
        onPress={onConfirm}
        variant={confirmVariant}
        loading={loading}
        disabled={confirmDisabled}
        style={styles.footerButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    ...shadows.lg,
  },
  handle: {
    alignSelf: 'center',
    width: layout.sheetHandle.width,
    height: layout.sheetHandle.height,
    borderRadius: borderRadius.full,
    backgroundColor: colors.sheetHandle,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  body: {
    maxHeight: 420,
  },
  bodyContent: {
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  footerWrap: {
    paddingTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
