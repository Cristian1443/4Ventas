/**
 * Numeradores de documentos — pantalla de administración dedicada.
 * Desarrollo opcional de la adenda de alcance (punto 4): si el ERP ya provee el
 * numerador de forma nativa esta pantalla no es imprescindible, pero permite
 * configurar manualmente el siguiente correlativo por tipo de documento.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import { storageService } from '../../services/storage.service';
import { colors } from '../../constants/colors';

const TABLET_KEY = 'tabletConfig';

interface ContadorDef {
  campo: 'contadorAlbaranes' | 'contadorAdicional' | 'contadorPedidos' | 'contadorOtros';
  titulo: string;
  descripcion: string;
}

const CONTADORES: ContadorDef[] = [
  { campo: 'contadorAlbaranes', titulo: 'Albaranes', descripcion: 'Serie P — ventas cerradas/albarán' },
  { campo: 'contadorAdicional', titulo: 'Adicional', descripcion: 'Serie X — documentos adicionales' },
  { campo: 'contadorPedidos', titulo: 'Pedidos', descripcion: 'Pedidos a fabricación/almacén' },
  { campo: 'contadorOtros', titulo: 'Presupuesto / Otros', descripcion: 'Presupuestos y demás tipos de documento' },
];

export default function NumeradoresScreen() {
  const navigation = useNavigation<any>();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [valoresGuardados, setValoresGuardados] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const cfg = (await storageService.getItem<Record<string, unknown>>(TABLET_KEY)) || {};
      const nextValores: Record<string, string> = {};
      const nextGuardados: Record<string, number> = {};
      CONTADORES.forEach(c => {
        const actual = Number(cfg[c.campo]) || 1;
        nextValores[c.campo] = String(actual);
        nextGuardados[c.campo] = actual;
      });
      setValores(nextValores);
      setValoresGuardados(nextGuardados);
      setLoading(false);
    })();
  }, []);

  const handleGuardar = async () => {
    const bajadas = CONTADORES.filter(c => {
      const nuevo = Number(valores[c.campo]);
      return Number.isFinite(nuevo) && nuevo < valoresGuardados[c.campo];
    });

    const aplicarCambios = async () => {
      try {
        setSaving(true);
        const cfg = (await storageService.getItem<Record<string, unknown>>(TABLET_KEY)) || {};
        const next = { ...cfg } as Record<string, unknown>;
        CONTADORES.forEach(c => {
          const nuevo = Number(valores[c.campo]);
          next[c.campo] = Number.isFinite(nuevo) && nuevo > 0 ? nuevo : valoresGuardados[c.campo];
        });
        await storageService.setItem(TABLET_KEY, next);
        setValoresGuardados(CONTADORES.reduce((acc, c) => ({ ...acc, [c.campo]: Number(next[c.campo]) }), {} as Record<string, number>));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } finally {
        setSaving(false);
      }
    };

    if (bajadas.length > 0) {
      Alert.alert(
        'Bajar un contador',
        `Vas a bajar el contador de: ${bajadas.map(b => b.titulo).join(', ')}. Esto puede provocar números de documento duplicados si ya se usaron correlativos mayores. ¿Continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', style: 'destructive', onPress: aplicarCambios },
        ]
      );
      return;
    }

    await aplicarCambios();
  };

  return (
    <ScreenWithSidebar currentScreen="Numeradores" scrollable={false}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Numeradores de documentos</Text>
          </View>

          <Text style={styles.subtitle}>
            Siguiente número que se usará por tipo de documento en esta tablet. Si el ERP ya asigna el numerador automáticamente no es necesario tocar esta pantalla.
          </Text>

          {loading ? (
            <Text style={styles.loadingText}>Cargando...</Text>
          ) : (
            <View style={styles.grid}>
              {CONTADORES.map(c => (
                <View key={c.campo} style={styles.card}>
                  <Text style={styles.cardTitle}>{c.titulo}</Text>
                  <Text style={styles.cardDescripcion}>{c.descripcion}</Text>
                  <TextInput
                    value={valores[c.campo] ?? ''}
                    onChangeText={(v) => setValores(prev => ({ ...prev, [c.campo]: v }))}
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={colors.textLight}
                  />
                  <Text style={styles.cardHint}>Actualmente guardado: {valoresGuardados[c.campo] ?? '-'}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleGuardar}
            disabled={saving || loading}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar numeradores'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  scrollContent: { padding: 40, paddingHorizontal: 60, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  backButton: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: colors.textSecondary },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 24 },
  loadingText: { fontSize: 16, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  card: { flex: 1, minWidth: 220, backgroundColor: colors.surface, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardDescripcion: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text },
  cardHint: { fontSize: 12, color: colors.textLight, marginTop: 8 },
  saveButton: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: colors.textInverse, fontSize: 16, fontWeight: '700' },
});
