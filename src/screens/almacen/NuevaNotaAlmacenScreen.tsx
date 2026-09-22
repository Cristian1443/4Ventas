import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Platform, KeyboardAvoidingView, Keyboard, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { colors } from '../../constants/colors';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import SeleccionarArticuloSidebar from '../../components/ventas/SeleccionarArticuloSidebar';

type TipoNota = 'Carga Camion' | 'Descarga Camion' | 'Inventario Camion' | 'Intercambio Entrada' | 'Intercambio Salida';

interface CarritoItem {
  id: string;
  nombre: string;
  codigoCorto: string;
  cantidad: number;
  stockActual: number;
}

// ── Helpers ───────────────────────────────────────────────────
const TIPOS: TipoNota[] = ['Carga Camion', 'Descarga Camion', 'Inventario Camion', 'Intercambio Entrada', 'Intercambio Salida'];

const TIPO_CONFIG: Record<TipoNota, { icon: string; color: string; label: string; desc: string; accion: 'suma' | 'resta' | 'fija' }> = {
  'Carga Camion':        { icon: '📦', color: '#0C2ABF', label: 'Carga Camión',         desc: 'Suma stock al camión desde almacén central',        accion: 'suma' },
  'Descarga Camion':     { icon: '📥', color: '#f59e0b', label: 'Descarga Camión',       desc: 'Devuelve mercancía del camión al almacén central',   accion: 'resta' },
  'Inventario Camion':   { icon: '📋', color: '#6366f1', label: 'Inventario Camión',     desc: 'Ajusta el stock exacto del camión (recuento físico)', accion: 'fija' },
  'Intercambio Entrada': { icon: '⬇️', color: '#10b981', label: 'Intercambio Entrada',   desc: 'Recibe artículos de otro camión/almacén',            accion: 'suma' },
  'Intercambio Salida':  { icon: '⬆️', color: '#ef4444', label: 'Intercambio Salida',    desc: 'Envía artículos a otro camión/almacén',             accion: 'resta' },
};

// ──────────────────────────────────────────────────────────────

export default function NuevaNotaAlmacenScreen() {
  const navigation = useNavigation<any>();
  const { articulos, currentVendor, addNotaAlmacen, updateArticulo, notasAlmacen } = useApp();

  /** Tras guardar correctamente permite salir sin el aviso `beforeRemove`. */
  const allowNavigateAwayRef = useRef(false);

  const [tipoNota, setTipoNota] = useState<TipoNota>('Carga Camion');
  const [observaciones, setObservaciones] = useState('');
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [modalArticulo, setModalArticulo] = useState(false);
  const [codigoInput, setCodigoInput] = useState('');
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<any>(null);
  const [cantInput, setCantInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ── Stock actual del camión ────────────────────────────────
  // Calcula el stock que hay actualmente en el camión sumando
  // Cargas y restando Descargas/Ventas de las notas guardadas.
  const stockCamion = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    // Partir de cero y reconstruir desde las notas de almacén guardadas
    notasAlmacen.forEach(nota => {
      if (!nota.items) return;
      nota.items.forEach((item: any) => {
        const id = item.articuloId;
        if (!map[id]) map[id] = 0;
        if (nota.tipo === 'Carga Camion' || nota.tipo === 'Intercambio Entrada') {
          map[id] += Number(item.cantidad) || 0;
        } else if (nota.tipo === 'Descarga Camion' || nota.tipo === 'Intercambio Salida') {
          map[id] -= Number(item.cantidad) || 0;
        } else if (nota.tipo === 'Inventario Camion') {
          map[id] = Number(item.cantidad) || 0;
        }
      });
    });
    // Aseguramos que no sea negativo
    Object.keys(map).forEach(k => { if (map[k] < 0) map[k] = 0; });
    return map;
  }, [notasAlmacen]);

  // Para "Descarga Camion" e "Intercambio Salida" → sólo mostrar artículos que hay en el camión
  const articulosFiltrados = useMemo(() => {
    const esDescarga = tipoNota === 'Descarga Camion' || tipoNota === 'Intercambio Salida';
    if (!esDescarga) return articulos;
    // Solo mostrar artículos con stock en el camión
    return articulos.filter(a => (stockCamion[a.id] || 0) > 0);
  }, [articulos, tipoNota, stockCamion]);

  // Si cambia el tipo, re-precargar carrito para Descarga (mostrar lo que hay)
  useEffect(() => {
    setCarrito([]);
    setCodigoInput('');
    setArticuloSeleccionado(null);
    setCantInput('');
  }, [tipoNota]);

  useFocusEffect(
    useCallback(() => {
      allowNavigateAwayRef.current = false;
    }, [])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (allowNavigateAwayRef.current || isSaving) return;

      if (e.data?.action?.type === 'REPLACE') return;

      const draftLines = carrito.length > 0;
      const tieneObservaciones = observaciones.trim().length > 0;
      const formularioArticuloSinVaciar =
        articuloSeleccionado != null ||
        codigoInput.trim().length > 0 ||
        cantInput.trim().length > 0;

      if (!draftLines && !tieneObservaciones && !formularioArticuloSinVaciar) return;

      e.preventDefault();

      Alert.alert(
        'Nota sin confirmar',
        'Hay líneas en el movimiento, observaciones o un artículo sin añadir. Si sales se perderá lo no guardado.',
        [
          { text: 'Seguir aquí', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action)
          }
        ]
      );
    });

    return unsubscribe;
  }, [navigation, carrito, observaciones, articuloSeleccionado, codigoInput, cantInput, isSaving]);

  // Precargar artículos del camión cuando cambia a Descarga/Inventario (para facilitar)
  const precargarDesdeStockCamion = () => {
    const items: CarritoItem[] = Object.entries(stockCamion)
      .filter(([, cant]) => cant > 0)
      .map(([id, stockQty]) => {
        const art = articulos.find(a => a.id === id);
        return {
          id,
          nombre: art?.nombre || id,
          codigoCorto: art?.codigoCorto || id,
          cantidad: stockQty,
          stockActual: stockQty
        };
      });

    if (items.length === 0) {
      Alert.alert('Sin Stock', 'No hay artículos registrados en el camión actualmente.');
      return;
    }
    setCarrito(items);
  };

  // ── Handlers ───────────────────────────────────────────────
  const onSelectArticulo = (art: any) => {
    setArticuloSeleccionado(art);
    setCodigoInput(art.codigoCorto || art.id || '');
    setModalArticulo(false);
  };

  const addItemToCart = () => {
    if (!articuloSeleccionado && !codigoInput) {
      Alert.alert('Error', 'Selecciona o busca un artículo primero.');
      return;
    }

    let targetArt = articuloSeleccionado;
    if (!targetArt && codigoInput) {
      targetArt = articulos.find(a =>
        (a.codigoCorto && a.codigoCorto.toLowerCase() === codigoInput.toLowerCase()) ||
        a.id.toLowerCase() === codigoInput.toLowerCase()
      );
    }

    if (!targetArt) {
      Alert.alert('Error', 'Artículo no encontrado con ese código.');
      return;
    }

    const valCant = parseFloat(cantInput.replace(',', '.'));
    if (isNaN(valCant) || valCant <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida mayor a 0.');
      return;
    }

    // Validar disponibilidad para descargas
    const esDescarga = tipoNota === 'Descarga Camion' || tipoNota === 'Intercambio Salida';
    const stockEnCamion = stockCamion[targetArt.id] || 0;
    if (esDescarga) {
      const yaEnCarrito = carrito.find(i => i.id === targetArt.id)?.cantidad || 0;
      const disponible = stockEnCamion - yaEnCarrito;
      if (valCant > disponible) {
        Alert.alert(
          'Stock insuficiente',
          `Solo tienes ${stockEnCamion} unidad(es) de "${targetArt.nombre}" cargadas en el camión.\n` +
          `Ya en la nota: ${yaEnCarrito} · Disponible para descargar: ${disponible}`
        );
        return;
      }
    }

    setCarrito(prev => {
      const exist = prev.find(i => i.id === targetArt.id);
      if (exist) {
        return prev.map(i => i.id === targetArt.id
          ? { ...i, cantidad: i.cantidad + valCant }
          : i
        );
      }
      return [...prev, {
        id: targetArt.id,
        nombre: targetArt.nombre,
        codigoCorto: targetArt.codigoCorto || targetArt.id,
        cantidad: valCant,
        stockActual: esDescarga ? stockEnCamion : (targetArt.cantidad || 0)
      }];
    });

    setArticuloSeleccionado(null);
    setCodigoInput('');
    setCantInput('');
    Keyboard.dismiss();
  };

  const removeItem = (id: string) => setCarrito(prev => prev.filter(i => i.id !== id));

  const updateCantidad = (id: string, delta: number) => {
    setCarrito(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newCant = Math.max(1, i.cantidad + delta);
      return { ...i, cantidad: newCant };
    }));
  };

  const getFormatDate = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const finalizarNota = async () => {
    if (carrito.length === 0) {
      Alert.alert('Error', 'No puedes crear una nota vacía. Añade artículos.');
      return;
    }

    const totalUds = carrito.reduce((s, i) => s + i.cantidad, 0);
    const config = TIPO_CONFIG[tipoNota];

    Alert.alert(
      `Confirmar ${config.label}`,
      `Se registrarán ${carrito.length} artículo(s) con un total de ${totalUds} unidades.\n\n` +
      `Acción: ${config.desc}\n\n¿Confirmar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar', onPress: async () => {
            setIsSaving(true);
            try {
              const nuevaNota: any = {
                id: `NOTA-${Date.now().toString().slice(-6)}`,
                tipo: tipoNota,
                fecha: getFormatDate(),
                usuario: currentVendor?.nombre || 'Agente Local',
                articulos: carrito.length, // cantidad de referencias distintas
                observaciones,
                estado: 'pendiente',
                items: carrito.map(i => ({
                  articuloId: i.id,
                  nombre: i.nombre,
                  codigoCorto: i.codigoCorto,
                  cantidad: i.cantidad
                }))
              };

              // 1. Guardar la nota
              await addNotaAlmacen(nuevaNota);

              // 2. Actualizar stock local según el tipo de movimiento
              for (const item of carrito) {
                const baseArt = articulos.find(a => a.id === item.id);
                if (baseArt !== undefined) {
                  let nuevaCantidad = baseArt.cantidad;
                  if (tipoNota === 'Carga Camion' || tipoNota === 'Intercambio Entrada') {
                    nuevaCantidad += item.cantidad;
                  } else if (tipoNota === 'Descarga Camion' || tipoNota === 'Intercambio Salida') {
                    nuevaCantidad = Math.max(0, nuevaCantidad - item.cantidad);
                  } else if (tipoNota === 'Inventario Camion') {
                    // En inventario fijamos el stock exacto
                    nuevaCantidad = item.cantidad;
                  }
                  await updateArticulo(item.id, nuevaCantidad);
                }
              }

              Alert.alert(
                '¡Nota guardada!',
                `${config.icon} ${config.label} registrada correctamente.\nStock actualizado en ${carrito.length} artículo(s).`,
                [{
                  text: 'Aceptar',
                  onPress: () => {
                    allowNavigateAwayRef.current = true;
                    navigation.goBack();
                  }
                }]
              );
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'No se pudo guardar la nota. Inténtalo de nuevo.');
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  // ── Render ─────────────────────────────────────────────────
  const config = TIPO_CONFIG[tipoNota];
  const esDescarga = tipoNota === 'Descarga Camion' || tipoNota === 'Intercambio Salida';
  const totalUds = carrito.reduce((s, i) => s + i.cantidad, 0);

  return (
    <ScreenWithSidebar currentScreen="NotasAlmacen" scrollable={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nueva Nota de Almacén</Text>
        </View>

        <View style={styles.mainContent}>
          {/* ── LEFT PANEL ── */}
          <View style={styles.leftPanel}>
            <ScrollView contentContainerStyle={styles.scrollInner} keyboardShouldPersistTaps="handled">

              {/* Tipo de movimiento */}
              <View style={styles.sectionCard}>
                <Text style={styles.fieldLabel}>Tipo de Movimiento</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {TIPOS.map(t => {
                    const cfg = TIPO_CONFIG[t];
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.tipoChip, tipoNota === t && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                        onPress={() => setTipoNota(t)}
                      >
                        <Text style={{ fontSize: 14 }}>{cfg.icon}</Text>
                        <Text style={[styles.tipoText, tipoNota === t && styles.tipoTextActive]}>{cfg.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={[styles.tipoDesc, { borderLeftColor: config.color }]}>
                  <Text style={{ fontSize: 13, color: '#64748b' }}>{config.icon}  <Text style={{ fontWeight: '600', color: config.color }}>{config.label}</Text>: {config.desc}</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Observaciones (Opcional)</Text>
              <TextInput
                style={styles.observacionesInput}
                placeholder="Añade algún comentario..."
                value={observaciones}
                onChangeText={setObservaciones}
                multiline
              />

              {/* Añadir artículos */}
              <Text style={styles.secTitle}>Añadir Artículos</Text>

              {/* Botón de precarga para Descarga/Inventario */}
              {(esDescarga || tipoNota === 'Inventario Camion') && (
                <TouchableOpacity
                  style={[styles.precargarBtn, { borderColor: config.color }]}
                  onPress={precargarDesdeStockCamion}
                >
                  <Text style={[styles.precargarBtnText, { color: config.color }]}>
                    {tipoNota === 'Inventario Camion' ? '📋 Precargar artículos del camión para recuento' : '📥 Precargar artículos disponibles en el camión'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.addCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 }}>
                  <View style={{ flex: 3, marginRight: 10 }}>
                    <Text style={styles.fieldLabel}>Artículo o Código</Text>
                    <View style={styles.inputWithIcon}>
                      <TextInput
                        style={styles.inputNoBorder}
                        value={codigoInput}
                        onChangeText={setCodigoInput}
                        placeholder="Escanear/Buscar..."
                      />
                      <TouchableOpacity onPress={() => setModalArticulo(true)} style={styles.iconContainer}>
                        <Text>🔍</Text>
                      </TouchableOpacity>
                    </View>
                    {articuloSeleccionado && (
                      <Text style={{ fontSize: 12, color: colors.success, marginTop: 3 }}>
                        ✓ {articuloSeleccionado.nombre}
                        {esDescarga && ` · En camión: ${stockCamion[articuloSeleccionado.id] || 0} uds`}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.fieldLabel}>Cant.</Text>
                    <TextInput
                      style={styles.inputGrid}
                      value={cantInput}
                      onChangeText={setCantInput}
                      placeholder="Uds."
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity style={[styles.addBtnCompact, { backgroundColor: config.color }]} onPress={addItemToCart}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center', padding: 12 }}>+ Añadir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* FOOTER */}
            <View style={styles.panelFooter}>
              <TouchableOpacity
                style={[styles.btnPri, isSaving && { opacity: 0.6 }]}
                onPress={finalizarNota}
                disabled={isSaving}
              >
                <LinearGradient colors={[config.color, config.color + 'bb']} style={styles.addBtnGrad}>
                  {isSaving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.txtBtnWhite}>{config.icon} Confirmar {config.label}</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── RIGHT PANEL - CARRITO ── */}
          <View style={styles.rightPanel}>
            <View style={[styles.cartHeader, { borderBottomColor: config.color }]}>
              <Text style={styles.cartTitle}>Detalle del Movimiento</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[styles.badge, { backgroundColor: config.color + '22' }]}>
                  <Text style={[styles.badgeText, { color: config.color }]}>{carrito.length} refs</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: config.color + '22' }]}>
                  <Text style={[styles.badgeText, { color: config.color }]}>{totalUds} uds</Text>
                </View>
              </View>
            </View>

            <ScrollView style={styles.cartScroll}>
              {carrito.length === 0 ? (
                <View style={styles.emptyCart}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>📭</Text>
                  <Text style={styles.emptyCartText}>
                    {esDescarga
                      ? 'Usa "Precargar" o añade artículos que quieres devolver del camión'
                      : 'No hay artículos añadidos aún'}
                  </Text>
                </View>
              ) : (
                carrito.map((item, index) => (
                  <View key={`${item.id}-${index}`} style={styles.cartItem}>
                    <View style={[styles.codeBadge, { backgroundColor: config.color + '22' }]}>
                      <Text style={[styles.codeText, { color: config.color }]}>{item.codigoCorto}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.nombre}</Text>
                      {esDescarga && (
                        <Text style={styles.itemStock}>Stock camión: {item.stockActual} uds</Text>
                      )}
                    </View>
                    <View style={styles.cantControl}>
                      <TouchableOpacity style={styles.cantBtn} onPress={() => updateCantidad(item.id, -1)}>
                        <Text style={styles.cantBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={[styles.itemCantidad, { color: config.color }]}>{item.cantidad}</Text>
                      <TouchableOpacity style={styles.cantBtn} onPress={() => updateCantidad(item.id, 1)}>
                        <Text style={styles.cantBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => removeItem(item.id)}>
                      <Text style={styles.deleteIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>

        {modalArticulo && (
          <View style={styles.floatingSidebar}>
            <SeleccionarArticuloSidebar
              articulos={articulosFiltrados}
              onSelect={onSelectArticulo}
              onClose={() => setModalArticulo(false)}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderColor: colors.border },
  backButton: { marginRight: 15, width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: '#092090' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },

  mainContent: { flex: 1, flexDirection: 'row', backgroundColor: '#f8fafc' },
  leftPanel: { flex: 1.5, borderRightWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  rightPanel: { flex: 1, backgroundColor: '#f1f5f9' },

  scrollInner: { padding: 20, paddingBottom: 10 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },

  fieldLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: '700', textTransform: 'uppercase' },

  tipoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: colors.border, marginRight: 10 },
  tipoText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  tipoTextActive: { color: '#fff' },
  tipoDesc: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, borderLeftWidth: 3, marginTop: 4 },

  observacionesInput: { borderWidth: 1, borderColor: colors.borderDark, borderRadius: 8, padding: 12, minHeight: 70, textAlignVertical: 'top', backgroundColor: '#f8fafc', fontSize: 15, marginBottom: 16 },

  secTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: colors.text },
  precargarBtn: { borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 12, alignItems: 'center', backgroundColor: '#f8fafc', borderStyle: 'dashed' },
  precargarBtnText: { fontSize: 14, fontWeight: '600' },

  addCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.primary, marginBottom: 10, elevation: 1 },

  inputWithIcon: { height: 42, borderWidth: 1, borderColor: colors.borderDark, borderRadius: 8, backgroundColor: '#f8fafc', flexDirection: 'row', alignItems: 'center', paddingLeft: 10 },
  inputNoBorder: { flex: 1, fontSize: 15 },
  iconContainer: { width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.border },

  inputGrid: { height: 42, borderWidth: 1, borderColor: colors.borderDark, borderRadius: 8, paddingHorizontal: 10, backgroundColor: '#f8fafc', fontSize: 16, textAlign: 'center' },

  addBtnCompact: { borderRadius: 8, overflow: 'hidden', height: 42 },
  addBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  panelFooter: { padding: 16, borderTopWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'flex-end' },
  btnPri: { borderRadius: 10, overflow: 'hidden', height: 50, width: '80%' },
  txtBtnWhite: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  cartHeader: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, backgroundColor: '#fff' },
  cartTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontWeight: '700', fontSize: 12 },

  cartScroll: { flex: 1, padding: 14 },
  emptyCart: { padding: 30, alignItems: 'center' },
  emptyCartText: { color: colors.textLight, fontStyle: 'italic', fontSize: 14, textAlign: 'center', marginTop: 8 },

  cartItem: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  codeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 54, alignItems: 'center' },
  codeText: { fontSize: 11, fontWeight: '700' },
  itemName: { fontSize: 13, fontWeight: '600', color: colors.text },
  itemStock: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  cantControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cantBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  cantBtnText: { fontSize: 16, fontWeight: '700', color: '#475569' },
  itemCantidad: { fontSize: 16, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  deleteBtn: { padding: 6, backgroundColor: '#fee2e2', borderRadius: 6 },
  deleteIcon: { fontSize: 14 },

  floatingSidebar: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 450, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10, zIndex: 100 }
});
