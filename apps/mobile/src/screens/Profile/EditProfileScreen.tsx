import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApiClient } from '../../services/api/api-client.port';
import { useApiResource } from '../../services/useApiResource';
import { Palette, fonts, radii, useTheme } from '../../theme';
import { ErrorView, LevelAvatar, LoadingView, PrimaryButton, Screen, ScreenHeader } from '../../ui';

export type EditProfileScreenProps = {
  api: ApiClient;
  onSaved?: () => void;
  onCancel?: () => void;
};

const NAME_MAX_LENGTH = 30;

export const EditProfileScreen = ({ api, onSaved, onCancel }: EditProfileScreenProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const loader = useCallback(() => api.getProfile(), [api]);
  const { data: profile, loading, error, reload } = useApiResource(loader);

  const [name, setName] = useState('');
  const [seeded, setSeeded] = useState(false);
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && !seeded) {
      setName(profile.name ?? '');
      setSeeded(true);
    }
  }, [profile, seeded]);

  const trimmed = name.trim();
  const canSave = seeded && trimmed.length > 0 && trimmed !== (profile?.name ?? '') && !saving;

  const save = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await api.updateProfileName(trimmed);
      onSaved?.();
    } catch {
      setSaveError('Não foi possível salvar. Verifique sua conexão e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Editar perfil" onBack={onCancel} />
        <LoadingView testID="edit-profile-loading" label="Carregando perfil…" />
      </Screen>
    );
  }

  if (error || !profile) {
    return (
      <Screen>
        <ScreenHeader title="Editar perfil" onBack={onCancel} />
        <ErrorView testID="edit-profile-error" onRetry={reload} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Editar perfil" onBack={onCancel} />

      <View style={styles.body}>
        <View style={styles.avatarBlock}>
          <LevelAvatar testID="edit-profile-avatar" size={96} photoUrl={profile.photoUrl} name={profile.name} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>NOME DE EXIBIÇÃO</Text>
          <View style={[styles.inputRow, focused ? styles.inputRowFocused : styles.inputRowIdle]}>
            <TextInput
              testID="edit-name-input"
              value={name}
              onChangeText={setName}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              maxLength={NAME_MAX_LENGTH}
              placeholder="Seu nome"
              placeholderTextColor={colors.textMid}
              selectionColor={colors.primary}
              style={styles.input}
              accessibilityLabel="Nome de exibição"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={save}
            />
            {name.length > 0 ? (
              <Pressable
                testID="edit-name-clear"
                onPress={() => setName('')}
                accessibilityRole="button"
                accessibilityLabel="Limpar nome"
                hitSlop={10}
              >
                <Feather name="x" size={18} color={colors.textMid} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.helperRow}>
            <Text style={styles.helperText}>Aparece nos rankings e no mapa</Text>
            <Text testID="edit-name-counter" style={styles.helperText}>
              {name.length}/{NAME_MAX_LENGTH}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {saveError ? (
          <Text testID="edit-name-save-error" style={styles.saveError}>
            {saveError}
          </Text>
        ) : null}
        <PrimaryButton
          testID="edit-name-save"
          label="Salvar alterações"
          onPress={save}
          loading={saving}
          disabled={!canSave}
        />
        <Pressable
          testID="edit-name-cancel"
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          style={styles.cancel}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    body: { flex: 1, paddingHorizontal: 18 },
    avatarBlock: { alignItems: 'center', marginTop: 12 },
    field: { marginTop: 30 },
    label: { fontFamily: fonts.manropeSemiBold, fontSize: 12, color: c.textMid, marginBottom: 8 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 52,
      paddingHorizontal: 14,
      borderRadius: radii.box,
      backgroundColor: c.surfaceCard,
      borderWidth: 1.5,
    },
    inputRowIdle: { borderColor: c.stroke },
    inputRowFocused: { borderColor: c.primary, backgroundColor: c.primarySurface },
    input: { flex: 1, fontFamily: fonts.sairaBold, fontSize: 16, color: c.textHi, padding: 0 },
    helperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingHorizontal: 2 },
    helperText: { fontFamily: fonts.manrope, fontSize: 11.5, color: c.textMid },
    footer: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20, gap: 6 },
    saveError: { fontFamily: fonts.manrope, fontSize: 12.5, color: c.danger, textAlign: 'center', marginBottom: 4 },
    cancel: { alignItems: 'center', paddingVertical: 10 },
    cancelText: { fontFamily: fonts.manropeSemiBold, fontSize: 14, color: c.textMid },
  });
