import { useEffect, useState } from 'react';
import { AppSheet, SheetFooter } from '@/components/ui/AppSheet';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/theme';
import { canonicalIngredientName } from '@/lib/ingredientNames';

export function IngredientRenameSheet({
  visible,
  onClose,
  initialName,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) setName(initialName);
  }, [initialName, visible]);

  const trimmed = canonicalIngredientName(name);
  const canSave = trimmed.length > 0;

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title="Preimenuj namirnicu"
      subtitle="Novo ime ide u kuhinju ako ga još nema."
      icon="create-outline"
      footer={
        <SheetFooter
          confirmLabel="Sačuvaj"
          confirmDisabled={!canSave}
          onCancel={onClose}
          onConfirm={() => {
            if (!canSave) return;
            onSave(trimmed);
            onClose();
          }}
        />
      }
    >
      <Input
        label="Naziv"
        value={name}
        onChangeText={setName}
        placeholder="npr. So"
        autoCapitalize="sentences"
        autoCorrect
        style={{ backgroundColor: colors.sheetField }}
      />
    </AppSheet>
  );
}
