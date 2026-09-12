import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography } from '@/constants/theme';
import { createHousehold, joinHousehold } from './service';
import { parseJoinPayload } from './membership';

type Step = 'name' | 'choice' | 'scan';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const handledScan = useRef(false);

  const submitJoin = useCallback(
    async (rawToken: string) => {
      const token = parseJoinPayload(rawToken);
      if (!token) {
        setError('QR kod nije važeći. Probaj ponovo ili unesi kod.');
        handledScan.current = false;
        return;
      }

      setBusy(true);
      setError(null);
      try {
        await joinHousehold(token, name);
        onComplete();
      } catch (joinError) {
        setError(joinError instanceof Error ? joinError.message : 'Pridruživanje nije uspelo.');
        handledScan.current = false;
      } finally {
        setBusy(false);
      }
    },
    [name, onComplete]
  );

  useEffect(() => {
    if (step !== 'scan') return;

    let active = true;
    const handleUrl = (url: string | null) => {
      if (!active || !url) return;
      void submitJoin(url);
    };

    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, [step, submitJoin]);

  async function submitCreate() {
    setBusy(true);
    setError(null);
    try {
      await createHousehold(name);
      onComplete();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Kreiranje porodice nije uspelo.');
    } finally {
      setBusy(false);
    }
  }

  function goToChoice() {
    if (!name.trim()) {
      setError('Unesi ime.');
      return;
    }
    setError(null);
    setStep('choice');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {step === 'name' ? (
        <View style={styles.content}>
          <Text style={styles.title}>Ko kuva ovde?</Text>
          <Text style={styles.subtitle}>
            Unesi ime. Ako se kasnije vratiš na porodicu, isto ime te vraća na tvoj nalog.
          </Text>
          <Input
            label="Ime"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="npr. Mama"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Nastavi" onPress={goToChoice} disabled={busy} />
        </View>
      ) : null}

      {step === 'choice' ? (
        <View style={styles.content}>
          <Text style={styles.title}>Porodica</Text>
          <Text style={styles.subtitle}>Zdravo, {name.trim()}. Nova kuhinja ili se pridružuješ postojećoj?</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Nova porodica" onPress={() => void submitCreate()} loading={busy} />
          <Button
            title="Pridruži se (QR)"
            variant="secondary"
            onPress={() => {
              setError(null);
              handledScan.current = false;
              setStep('scan');
            }}
            disabled={busy}
          />
          <Button title="Nazad" variant="ghost" onPress={() => setStep('name')} disabled={busy} />
        </View>
      ) : null}

      {step === 'scan' ? (
        <View style={styles.scanWrap}>
          <Text style={styles.title}>Skeniraj QR porodice</Text>
          <Text style={styles.subtitle}>Ako kamera ne radi, unesi kod ispod.</Text>

          {!permission?.granted ? (
            <View style={styles.content}>
              <Text style={styles.subtitle}>Treba nam kamera samo za QR kod.</Text>
              <Button title="Dozvoli kameru" onPress={() => void requestPermission()} />
            </View>
          ) : (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (handledScan.current || busy) return;
                handledScan.current = true;
                void submitJoin(data);
              }}
            />
          )}

          <View style={styles.manual}>
            <Input
              label="Kod porodice"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="UUID ili planirajkuvajkupi://join/…"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="Pridruži se kodom"
              onPress={() => void submitJoin(manualCode)}
              loading={busy}
            />
            <Pressable onPress={() => setStep('choice')} disabled={busy}>
              <Text style={styles.back}>Nazad</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  scanWrap: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.bodySmall,
    color: colors.danger,
  },
  camera: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 240,
  },
  manual: {
    gap: spacing.sm,
  },
  back: {
    ...typography.button,
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
