/**
 * Nueva Venta Screen - FIX FINAL SCROLL TABLET
 * Solución: Eliminación de KeyboardAvoidingView bloqueante y ajuste de flexbox.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext'; // Conexión Global
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import SeleccionarArticuloModal from '../../components/SeleccionarArticuloModal';

// Interfaces
interface ArticuloVenta {
  id: string;
  articuloId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  tipoDescuento: 'porcentaje' | 'pesos';
  nota?: string;
}

export default function NuevaVentaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  
  // --- CONEXIÓN GLOBAL ---
  const { addNotaVenta, clientes, articulos } = useApp();

  const clienteInicial = route.params?.clienteSeleccionado;

  // --- ESTADOS ---
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(clienteInicial || null);
  const [tipoNotaSeleccionado, setTipoNotaSeleccionado] = useState('Serie P (Oficiales)');
  const [formaPagoSeleccionado, setFormaPagoSeleccionado] = useState('Efectivo');
  const [estadoPago, setEstadoPago] = useState<'pagado' | 'pendiente'>('pagado');
  const [tieneDescuentoDocumento, setTieneDescuentoDocumento] = useState(false);
  
  // Artículo en edición
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<any>(null);
  const [articuloCantidad, setArticuloCantidad] = useState('1');
  const [articuloPrecio, setArticuloPrecio] = useState('');
  const [articuloDescuento, setArticuloDescuento] = useState('');
  const [tipoDescuentoArticulo, setTipoDescuentoArticulo] = useState<'porcentaje' | 'pesos'>('porcentaje');
  const [articuloNota, setArticuloNota] = useState('');
  
  // Carrito
  const [articulosVenta, setArticulosVenta] = useState<ArticuloVenta[]>([]);
  
  // UI
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showArticuloModal, setShowArticuloModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showTipoDropdown, setShowTipoDropdown] = useState(false);
  const [showPagoDropdown, setShowPagoDropdown] = useState(false);

  const tiposNota = ['Serie P (Oficiales)', 'Serie X (No oficiales)', 'Pedido', 'Presupuesto'];
  const formasPago = ['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Bizum', 'Transferencia'];

  useEffect(() => {
      if (clienteInicial) setClienteSeleccionado(clienteInicial);
  }, [clienteInicial]);

  const resetFormulario = () => {
    setClienteSeleccionado(null);
    setArticulosVenta([]);
    resetCamposArticulo();
    setEstadoPago('pagado');
  };

  const resetCamposArticulo = () => {
    setArticuloSeleccionado(null);
    setArticuloCantidad('1');
    setArticuloPrecio('');
    setArticuloDescuento('');
    setArticuloNota('');
  };

  const calcularTotales = () => {
    let subtotal = 0;
    let totalDescuentos = 0;
    
    articulosVenta.forEach(articulo => {
      const subtotalArt = articulo.precioUnitario * articulo.cantidad;
      subtotal += subtotalArt;
      if (articulo.descuento > 0) {
        if (articulo.tipoDescuento === 'porcentaje') {
          totalDescuentos += (subtotalArt * articulo.descuento) / 100;
        } else {
          totalDescuentos += articulo.descuento * articulo.cantidad;
        }
      }
    });
    
    const baseImponible = subtotal - totalDescuentos;
    const iva = baseImponible * 0.21;
    const total = baseImponible + iva;
    
    return { subtotal, descuentos: totalDescuentos, baseImponible, iva, total };
  };

  const totales = calcularTotales();

  const handleSelectArticulo = (articulo: any) => {
    setArticuloSeleccionado(articulo);
    setArticuloPrecio(articulo.precio?.toString().replace(/[€\s]/g, '').replace(',', '.') || '');
    setShowArticuloModal(false);
  };

  const handleAddArticulo = () => {
    if (!articuloSeleccionado) return Alert.alert('Atención', 'Selecciona un artículo primero.');
    
    const cantidad = parseFloat(articuloCantidad.replace(',', '.'));
    const precio = parseFloat(articuloPrecio.replace(',', '.'));
    const descuento = parseFloat(articuloDescuento.replace(',', '.')) || 0;

    if (isNaN(cantidad) || cantidad <= 0) return Alert.alert('Error', 'Cantidad inválida');
    if (isNaN(precio) || precio < 0) return Alert.alert('Error', 'Precio inválido');

    const nuevoArticulo: ArticuloVenta = {
      id: Date.now().toString(),
      articuloId: articuloSeleccionado.id,
      nombre: articuloSeleccionado.nombre,
      cantidad,
      precioUnitario: precio,
      descuento,
      tipoDescuento: tipoDescuentoArticulo,
      nota: articuloNota
    };

    setArticulosVenta([...articulosVenta, nuevoArticulo]);
    resetCamposArticulo();
  };

  const handleDeleteArticulo = (id: string) => {
    setArticulosVenta(articulosVenta.filter(a => a.id !== id));
  };

  const handleGuardarVenta = async () => {
    if (articulosVenta.length === 0) return Alert.alert('Faltan datos', 'Añade artículos.');
    if (!clienteSeleccionado) return Alert.alert('Faltan datos', 'Selecciona cliente.');

    Alert.alert('Confirmar Venta', `Total: ${totales.total.toFixed(2)} €`, [
        { text: 'Cancelar', style: 'cancel' },
        { 
            text: 'Guardar', 
            onPress: async () => {
                try {
                    const nuevaNotaData = {
                      id: `N${Date.now().toString().slice(-6)}`,
                      cliente: clienteSeleccionado.nombre || clienteSeleccionado.empresa,
                      clienteId: clienteSeleccionado.id,
                      fecha: new Date().toISOString(),
                      precio: `${totales.total.toFixed(2).replace('.', ',')} €`,
                      estado: estadoPago === 'pagado' ? 'cerrada' : 'pendiente',
                      tipoNota: tipoNotaSeleccionado,
                      formaPago: formaPagoSeleccionado,
                      items: articulosVenta,
                      totalesNumericos: totales
                    };
                    
                    // Guardar globalmente
                    await addNotaVenta(nuevaNotaData);
                    
                    resetFormulario();
                    navigation.navigate('VerNota', { ventaData: nuevaNotaData });
                } catch (error) {
                    Alert.alert('Error', 'No se pudo guardar.');
                }
            }
        }
    ]);
  };

  return (
    <ScreenWithSidebar currentScreen="NuevaVenta" scrollable={false}>
      <View style={styles.container}>
        {/* Header Fijo */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nueva Venta</Text>
        </View>

        <View style={styles.mainLayout}>
          
          {/* === COLUMNA IZQUIERDA === */}
          <View style={styles.leftPanel}>
            
            {/* Contenedor del Formulario */}
            <View style={styles.formWrapper}>
                {/* ScrollView DIRECTO sin KeyboardAvoidingView para evitar bloqueos */}
                <ScrollView 
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  {/* --- CAMPOS DEL FORMULARIO --- */}

                  {/* Cliente */}
                  <View style={[styles.formGroup, { zIndex: 300 }]}>
                    <Text style={styles.label}>Cliente *</Text>
                    <TouchableOpacity style={styles.dropdown} onPress={() => setShowClienteModal(true)}>
                      <Text style={[styles.dropdownText, !clienteSeleccionado && styles.placeholderText]} numberOfLines={1}>
                        {clienteSeleccionado ? (clienteSeleccionado.nombre) : 'Seleccionar Cliente...'}
                      </Text>
                      <Text style={styles.dropdownIcon}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Estado Pago */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Estado inicial</Text>
                    <View style={styles.toggleButtons}>
                      <TouchableOpacity
                        style={[styles.toggleButton, estadoPago === 'pagado' && styles.toggleBgWhite]}
                        onPress={() => setEstadoPago('pagado')}>
                        <Text style={[styles.toggleText, estadoPago === 'pagado' && styles.textBlue]}>Pagado</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toggleButton, estadoPago === 'pendiente' && styles.toggleBgBlue]}
                        onPress={() => setEstadoPago('pendiente')}>
                        <Text style={[styles.toggleText, estadoPago === 'pendiente' && styles.textWhite]}>Pendiente</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Tipo y Forma Pago */}
                  <View style={[styles.twoColumns, { zIndex: 200 }]}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Tipo Doc.</Text>
                      <TouchableOpacity style={styles.dropdown} onPress={() => { setShowTipoDropdown(!showTipoDropdown); setShowPagoDropdown(false); }}>
                        <Text style={styles.dropdownText} numberOfLines={1}>{tipoNotaSeleccionado}</Text>
                        <Text style={styles.dropdownIcon}>▼</Text>
                      </TouchableOpacity>
                      {showTipoDropdown && (
                        <View style={styles.dropdownMenuAbs}>
                            {tiposNota.map(t => (
                              <TouchableOpacity key={t} style={styles.dropdownItem} onPress={() => { setTipoNotaSeleccionado(t); setShowTipoDropdown(false); }}>
                                <Text style={styles.dropdownItemText}>{t}</Text>
                              </TouchableOpacity>
                            ))}
                        </View>
                      )}
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Forma Pago</Text>
                      <TouchableOpacity style={styles.dropdown} onPress={() => { setShowPagoDropdown(!showPagoDropdown); setShowTipoDropdown(false); }}>
                        <Text style={styles.dropdownText} numberOfLines={1}>{formaPagoSeleccionado}</Text>
                        <Text style={styles.dropdownIcon}>▼</Text>
                      </TouchableOpacity>
                        {showPagoDropdown && (
                        <View style={styles.dropdownMenuAbs}>
                            <ScrollView style={{maxHeight: 200}} nestedScrollEnabled={true}>
                            {formasPago.map(f => (
                              <TouchableOpacity key={f} style={styles.dropdownItem} onPress={() => { setFormaPagoSeleccionado(f); setShowPagoDropdown(false); }}>
                                <Text style={styles.dropdownItemText}>{f}</Text>
                              </TouchableOpacity>
                            ))}
                            </ScrollView>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Descuento Global */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>¿Descuento global?</Text>
                    <View style={styles.toggleButtons}>
                      <TouchableOpacity
                        style={[styles.toggleButton, tieneDescuentoDocumento && styles.toggleBgWhite]}
                        onPress={() => setTieneDescuentoDocumento(true)}>
                        <Text style={[styles.toggleText, tieneDescuentoDocumento && styles.textBlue]}>Sí</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toggleButton, !tieneDescuentoDocumento && styles.toggleBgBlue]}
                        onPress={() => setTieneDescuentoDocumento(false)}>
                        <Text style={[styles.toggleText, !tieneDescuentoDocumento && styles.textWhite]}>No</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.divider} />
                  
                  {/* SECCIÓN QUE ESTABA OCULTA */}
                  <Text style={styles.sectionTitle}>Añadir Línea</Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Artículo *</Text>
                    <TouchableOpacity style={styles.searchInput} onPress={() => setShowArticuloModal(true)}>
                      <Text style={[styles.searchText, !articuloSeleccionado && styles.placeholderText]}>
                        {articuloSeleccionado ? articuloSeleccionado.nombre : 'Buscar en catálogo...'}
                      </Text>
                      <Text style={styles.searchIcon}>🔍</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.twoColumns}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Cant.</Text>
                      <TextInput style={styles.input} value={articuloCantidad} onChangeText={setArticuloCantidad} keyboardType="numeric" selectTextOnFocus />
                    </View>
                    <View style={[styles.formGroup, { flex: 1.5 }]}>
                      <Text style={styles.label}>Precio Unit.</Text>
                      <TextInput style={styles.input} value={articuloPrecio} onChangeText={setArticuloPrecio} keyboardType="decimal-pad" selectTextOnFocus placeholder="0.00" />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Descuento</Text>
                    <View style={styles.discountRow}>
                      <TextInput
                          style={[styles.input, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                          value={articuloDescuento}
                          onChangeText={setArticuloDescuento}
                          keyboardType="decimal-pad"
                          placeholder="0"
                        />
                      <TouchableOpacity 
                        style={styles.discountToggle}
                        onPress={() => setTipoDescuentoArticulo(t => t === 'porcentaje' ? 'pesos' : 'porcentaje')}
                      >
                        <Text style={styles.discountToggleText}>{tipoDescuentoArticulo === 'porcentaje' ? '%' : '€'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Nota (opcional)</Text>
                    <TextInput
                      style={styles.textArea}
                      value={articuloNota}
                      onChangeText={setArticuloNota}
                      multiline
                      numberOfLines={3}
                      placeholder="Detalles..."
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <TouchableOpacity style={styles.addButton} onPress={handleAddArticulo}>
                    <LinearGradient colors={['#092090', '#0C2ABF']} style={styles.addButtonGradient}>
                      <Text style={styles.addButtonText}>+ AÑADIR AL CARRITO</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                </ScrollView>
            </View>

            {/* Footer Fijo al fondo del LeftPanel */}
            <View style={[styles.footerStatic, { paddingBottom: Math.max(16, insets.bottom + 10) }]}>
              <TouchableOpacity style={styles.footerButtonSecundary} onPress={() => setShowHistorialModal(true)}>
                <Text style={{fontWeight:'600', color:'#475569'}}>Historial</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerButtonPrimary} onPress={handleGuardarVenta}>
                <LinearGradient colors={['#8bd600', '#c4ff57']} style={styles.footerButtonGradient}>
                  <Text style={styles.footerButtonText}>✅ CREAR NOTA</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* === COLUMNA DERECHA (RESUMEN) === */}
          <View style={[styles.rightPanel, { paddingBottom: insets.bottom }]}>
            <View style={styles.notaHeader}>
              <Text style={styles.notaTitle}>Resumen ({articulosVenta.length} items)</Text>
            </View>

            {articulosVenta.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>🛒</Text>
                <Text style={styles.emptyTitle}>Carrito Vacío</Text>
              </View>
            ) : (
              <View style={styles.carritoContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 3 }]}>Item</Text>
                  <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Cnt</Text>
                  <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
                  <View style={{ width: 30 }} />
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {articulosVenta.map((item) => (
                      <View key={item.id} style={styles.tableRow}>
                        <View style={{ flex: 3 }}>
                          <Text style={styles.tdMain}>{item.nombre}</Text>
                          {item.descuento > 0 && <Text style={styles.tdDiscount}>Desc: {item.descuento}</Text>}
                        </View>
                        <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>{item.cantidad}</Text>
                        <Text style={[styles.tdBold, { flex: 1.5, textAlign: 'right' }]}>
                          {(item.precioUnitario * item.cantidad).toFixed(2)} €
                        </Text>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteArticulo(item.id)}>
                          <Text style={styles.deleteIcon}>×</Text>
                        </TouchableOpacity>
                      </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.totalsPanel}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Base:</Text>
                <Text style={styles.totalValue}>{totales.baseImponible.toFixed(2)} €</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IVA (21%):</Text>
                <Text style={styles.totalValue}>{totales.iva.toFixed(2)} €</Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.totalFinalRow}>
                <Text style={styles.totalFinalLabel}>TOTAL</Text>
                <Text style={styles.totalFinalValue}>{totales.total.toFixed(2)} €</Text>
              </View>
            </View>
          </View>
        </View>

        {/* MODALES */}
        <Modal visible={showClienteModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {clientes.map(c => (
                  <TouchableOpacity key={c.id} style={styles.modalItem} onPress={() => { setClienteSeleccionado(c); setShowClienteModal(false); }}>
                    <Text style={{fontWeight: '600'}}>{c.nombre}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowClienteModal(false)}>
                <Text>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <SeleccionarArticuloModal
          visible={showArticuloModal}
          onClose={() => setShowArticuloModal(false)}
          articulos={articulos}
          onSelect={handleSelectArticulo}
        />
        <Modal visible={showHistorialModal} transparent><View style={styles.modalOverlay}><View style={styles.modalContent}><Text>Historial</Text><TouchableOpacity onPress={() => setShowHistorialModal(false)}><Text>Cerrar</Text></TouchableOpacity></View></View></Modal>

      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  headerTitle: { fontFamily: 'Inter', fontWeight: '700', fontSize: 20, color: '#1e293b' },
  
  // LAYOUT PRINCIPAL
  mainLayout: { flex: 1, flexDirection: 'row', overflow: 'hidden' },
  
  // PANEL IZQUIERDO
  leftPanel: { 
    width: 420, 
    backgroundColor: '#f8fafc', 
    borderRightWidth: 1, 
    borderColor: '#e2e8f0', 
    height: '100%',
    display: 'flex', 
    flexDirection: 'column' 
  },
  
  // ÁREA SCROLLABLE
  formWrapper: {
    flex: 1, 
    width: '100%',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 150 // PADDING CRÍTICO PARA EL SCROLL
  },

  // FOOTER FIJO
  footerStatic: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width:0, height: -2},
  },

  // DERECHA
  rightPanel: { flex: 1, backgroundColor: '#fff', padding: 24, display: 'flex', flexDirection: 'column', height: '100%' },

  // ELEMENTOS UI
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 16, marginBottom: 12 },
  formGroup: { marginBottom: 16, position: 'relative' },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { height: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, fontSize: 15, color: '#1e293b' },
  textArea: { height: 80, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 14, textAlignVertical: 'top' },
  
  dropdown: { height: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { fontSize: 15, color: '#1e293b', flex: 1 },
  placeholderText: { color: '#94a3b8' },
  dropdownIcon: { color: '#64748b' },
  dropdownMenuAbs: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, zIndex: 9999, maxHeight: 200 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  dropdownItemText: { fontSize: 14, color: '#334155' },

  twoColumns: { flexDirection: 'row', gap: 12 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },

  toggleButtons: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 8, padding: 2 },
  toggleButton: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  toggleBgWhite: { backgroundColor: '#fff', elevation: 1 },
  toggleBgBlue: { backgroundColor: '#0C2ABF' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  textBlue: { color: '#092090' },
  textWhite: { color: '#fff' },

  searchInput: { height: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchText: { fontSize: 15 },
  searchIcon: { fontSize: 18 },
  discountRow: { flexDirection: 'row', height: 48 },
  discountToggle: { width: 48, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', borderTopRightRadius: 8, borderBottomRightRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', borderLeftWidth: 0 },
  discountToggleText: { fontWeight: '700', color: '#092090' },

  addButton: { marginTop: 8, borderRadius: 8, overflow: 'hidden', marginBottom: 20 },
  addButtonGradient: { paddingVertical: 12, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  footerButtonSecundary: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 8, alignItems: 'center', justifyContent: 'center', height: 50, borderWidth: 1, borderColor: '#e2e8f0' },
  footerButtonPrimary: { flex: 2, borderRadius: 8, overflow: 'hidden', height: 50 },
  footerButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footerButtonText: { color: '#1a1a1a', fontWeight: '800', fontSize: 14 },

  // RESUMEN
  notaHeader: { paddingBottom: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  notaTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748b' },
  carritoContainer: { flex: 1, marginTop: 16 },
  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  th: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f8fafc', alignItems: 'center' },
  tdMain: { fontSize: 14, fontWeight: '500', color: '#0f172a' },
  tdDiscount: { fontSize: 11, color: '#16a34a' },
  td: { fontSize: 14, color: '#334155' },
  tdBold: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  deleteBtn: { width: 30, alignItems: 'flex-end' },
  deleteIcon: { fontSize: 20, color: '#ef4444' },

  totalsPanel: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 20, marginTop: 'auto' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { color: '#64748b', fontSize: 14 },
  totalValue: { color: '#334155', fontSize: 14, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#cbd5e1', marginVertical: 12 },
  totalFinalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalFinalLabel: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  totalFinalValue: { fontSize: 24, fontWeight: '800', color: '#0C2ABF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 400, backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalItem: { padding: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  modalCloseBtn: { marginTop: 16, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 8, alignItems: 'center' }
});