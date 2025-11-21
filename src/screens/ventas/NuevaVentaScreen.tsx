/**
 * Nueva Venta Screen - COPIA COMPLETA DEL WEB
 * Layout exacto: Formulario izquierda (351px) + Nota derecha (flex)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useResponsiveLayout } from '../../constants/layout';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import SeleccionarArticuloModal from '../../components/SeleccionarArticuloModal';

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
  const layout = useResponsiveLayout();
  const { addNotaVenta, addCobro, clientes, articulos, updateArticulo } = useApp();

  const clienteInicial = route.params?.clienteSeleccionado;

  // Estados del formulario
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(clienteInicial || null);
  const [tipoNotaSeleccionado, setTipoNotaSeleccionado] = useState('Serie P (Oficiales)');
  const [formaPagoSeleccionado, setFormaPagoSeleccionado] = useState('Efectivo');
  const [estadoPago, setEstadoPago] = useState<'pagado' | 'pendiente'>('pagado');
  
  // Estados del artículo actual
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<any>(null);
  const [articuloBuscado, setArticuloBuscado] = useState('');
  const [articuloCantidad, setArticuloCantidad] = useState('1');
  const [articuloPrecio, setArticuloPrecio] = useState('');
  const [articuloDescuento, setArticuloDescuento] = useState('');
  const [tipoDescuentoArticulo, setTipoDescuentoArticulo] = useState<'porcentaje' | 'pesos'>('porcentaje');
  const [articuloNota, setArticuloNota] = useState('');
  
  // Estados del documento
  const [tieneDescuentoDocumento, setTieneDescuentoDocumento] = useState(false);
  const [descuentoDocumento, setDescuentoDocumento] = useState('');
  const [tipoDescuentoDocumento, setTipoDescuentoDocumento] = useState<'porcentaje' | 'pesos'>('porcentaje');
  
  // Lista de artículos
  const [articulosVenta, setArticulosVenta] = useState<ArticuloVenta[]>([]);
  
  // Tab activo (Líneas, Porcentajes, Pesos)
  const [activeTab, setActiveTab] = useState('lineas');
  
  // Modales
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showArticuloModal, setShowArticuloModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  
  // Dropdowns
  const [showTipoDropdown, setShowTipoDropdown] = useState(false);
  const [showPagoDropdown, setShowPagoDropdown] = useState(false);

  const tiposNota = ['Serie P (Oficiales)', 'Serie X (No oficiales)', 'Pedido', 'Presupuesto'];
  const formasPago = ['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Bizum', 'Transferencia'];

  // FUNCIONES DE CÁLCULO (igual al web)
  
  const calcularSubtotalArticulo = (articulo: ArticuloVenta) => {
    const subtotal = articulo.precioUnitario * articulo.cantidad;
    if (articulo.descuento > 0) {
      if (articulo.tipoDescuento === 'porcentaje') {
        return subtotal * (1 - articulo.descuento / 100);
      } else {
        return subtotal - (articulo.descuento * articulo.cantidad);
      }
    }
    return subtotal;
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
    
    // Descuento del documento
    if (tieneDescuentoDocumento && descuentoDocumento) {
      const descDoc = parseFloat(descuentoDocumento.replace(',', '.')) || 0;
      if (tipoDescuentoDocumento === 'porcentaje') {
        totalDescuentos += (subtotal * descDoc) / 100;
      } else {
        totalDescuentos += descDoc;
      }
    }
    
    const baseImponible = subtotal - totalDescuentos;
    const iva = baseImponible * 0.21;
    const total = baseImponible + iva;
    
    return {
      subtotal,
      descuentos: totalDescuentos,
      porcentajeDescuento: subtotal > 0 ? ((totalDescuentos / subtotal) * 100).toFixed(0) : '0',
      baseImponible,
      iva,
      total
    };
  };

  const totales = calcularTotales();

  // Manejar selección de artículo del catálogo
  const handleSelectArticulo = (articulo: any) => {
    setArticuloSeleccionado(articulo);
    setArticuloBuscado(articulo.nombre);
    setArticuloPrecio(articulo.precio?.replace(/[€\s]/g, '').replace(',', '.') || '');
    setShowArticuloModal(false);
  };

  // Agregar artículo a la venta
  const handleAddArticulo = () => {
    if (!articuloSeleccionado) {
      Alert.alert('Error', 'Selecciona un artículo del catálogo');
      return;
    }

    const cantidad = parseInt(articuloCantidad);
    const precio = parseFloat(articuloPrecio.replace(',', '.'));
    const descuento = parseFloat(articuloDescuento.replace(',', '.')) || 0;

    if (!cantidad || cantidad <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a 0');
      return;
    }

    if (!precio || precio <= 0) {
      Alert.alert('Error', 'El precio debe ser mayor a 0');
      return;
    }

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
    
    // Limpiar formulario
    setArticuloSeleccionado(null);
    setArticuloBuscado('');
    setArticuloCantidad('1');
    setArticuloPrecio('');
    setArticuloDescuento('');
    setArticuloNota('');
  };

  // Eliminar artículo
  const handleDeleteArticulo = (id: string) => {
    Alert.alert(
      'Eliminar artículo',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => setArticulosVenta(articulosVenta.filter(a => a.id !== id))
        }
      ]
    );
  };

  // Guardar venta
  const handleGuardarVenta = async () => {
    if (articulosVenta.length === 0) {
      Alert.alert('Error', 'Añade al menos un artículo');
      return;
    }

    if (!clienteSeleccionado) {
      Alert.alert('Error', 'Selecciona un cliente');
      return;
    }

    try {
      // Calcular totales nuevamente para asegurar que están actualizados
      const totalesCalculados = calcularTotales();
      
      const nuevaNota = {
        id: `P${Date.now()}`,
        cliente: clienteSeleccionado.nombre || clienteSeleccionado.empresa,
        clienteId: clienteSeleccionado.id,
        fecha: new Date().toLocaleString('es-ES'),
        precio: `${totalesCalculados.total.toFixed(2).replace('.', ',')} €`,
        estado: estadoPago === 'pagado' ? 'cerrada' : 'pendiente',
        tipoNota: tipoNotaSeleccionado,
        formaPago: formaPagoSeleccionado,
        items: articulosVenta
      };

      await addNotaVenta(nuevaNota);

      // Actualizar stock
      for (const artVenta of articulosVenta) {
        const articuloCatalogo = articulos.find(a => a.id === artVenta.articuloId);
        if (articuloCatalogo) {
          await updateArticulo(artVenta.articuloId, articuloCatalogo.cantidad - artVenta.cantidad);
        }
      }

      // Si pago pendiente, crear cobro
      if (estadoPago === 'pendiente') {
        await addCobro({
          id: `C${Date.now()}`,
          cliente: clienteSeleccionado.nombre || clienteSeleccionado.empresa,
          clienteId: clienteSeleccionado.id,
          monto: nuevaNota.precio,
          fecha: nuevaNota.fecha,
          estado: 'pendiente',
          notaId: nuevaNota.id
        });
      }

      // Preparar datos para VerNotaScreen
      const ventaDataCompleta = {
        ...nuevaNota,
        cliente: clienteSeleccionado,
        clienteId: clienteSeleccionado.id,
        items: articulosVenta,
        articulos: articulosVenta,
        totales: {
          subtotal: totalesCalculados.subtotal.toFixed(2).replace('.', ','),
          descuentos: totalesCalculados.descuentos.toFixed(2).replace('.', ','),
          porcentajeDescuento: totalesCalculados.porcentajeDescuento,
          baseImponible: totalesCalculados.baseImponible.toFixed(2).replace('.', ','),
          iva: totalesCalculados.iva.toFixed(2).replace('.', ','),
          total: totalesCalculados.total.toFixed(2).replace('.', ',')
        },
        tipoNota: tipoNotaSeleccionado,
        formaPago: formaPagoSeleccionado,
        estadoPago: estadoPago
      };

      // Navegar a Ver Nota directamente (como en el web)
      console.log('Navegando a VerNota con datos:', ventaDataCompleta);
      navigation.navigate('VerNota', { ventaData: ventaDataCompleta });
    } catch (error: any) {
      console.error('Error al guardar venta:', error);
      Alert.alert('Error', `No se pudo guardar la venta: ${error?.message || 'Error desconocido'}`);
    }
  };

  return (
    <ScreenWithSidebar currentScreen="NuevaVenta" scrollable={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nueva Venta</Text>
      </View>

      {/* Layout de dos columnas */}
      <View style={styles.mainLayout}>
        {/* COLUMNA IZQUIERDA: Formulario (351px) */}
        <View style={styles.leftPanel}>
          <ScrollView contentContainerStyle={styles.formContent}>
            
            {/* Cliente */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Cliente</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowClienteModal(true)}
              >
                <Text style={styles.dropdownText}>
                  {clienteSeleccionado ? clienteSeleccionado.nombre : 'Cliente'}
                </Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Estado del Pago (Pagado/Pendiente) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Estado del Pago</Text>
              <View style={styles.toggleButtons}>
                <TouchableOpacity
                  style={[styles.toggleButton, estadoPago === 'pagado' && styles.toggleButtonActive]}
                  onPress={() => setEstadoPago('pagado')}
                >
                  <Text style={[styles.toggleText, estadoPago === 'pagado' && styles.toggleTextActive]}>
                    Pagado
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, estadoPago === 'pendiente' && styles.toggleButtonActiveNo]}
                  onPress={() => setEstadoPago('pendiente')}
                >
                  <Text style={[styles.toggleText, estadoPago === 'pendiente' && styles.toggleTextActiveNo]}>
                    Pendiente
                  </Text>
                </TouchableOpacity>
              </View>
              {estadoPago === 'pendiente' && (
                <Text style={styles.helperText}>
                  ⚠️ Se creará un cobro pendiente
                </Text>
              )}
            </View>

            {/* Tipo de Nota y Forma de Pago */}
            <View style={styles.twoColumns}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Tipo de Nota</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowTipoDropdown(!showTipoDropdown)}
                >
                  <Text style={styles.dropdownText} numberOfLines={1}>{tipoNotaSeleccionado}</Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>
                {showTipoDropdown && (
                  <View style={styles.dropdownMenu}>
                    {tiposNota.map(tipo => (
                      <TouchableOpacity
                        key={tipo}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setTipoNotaSeleccionado(tipo);
                          setShowTipoDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{tipo}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Forma de Pago</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowPagoDropdown(!showPagoDropdown)}
                >
                  <Text style={styles.dropdownText} numberOfLines={1}>{formaPagoSeleccionado}</Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>
                {showPagoDropdown && (
                  <View style={styles.dropdownMenu}>
                    {formasPago.map(forma => (
                      <TouchableOpacity
                        key={forma}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormaPagoSeleccionado(forma);
                          setShowPagoDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{forma}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* ¿Aplicar descuento en documento? */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>¿Aplicar descuento en documento?</Text>
              <View style={styles.toggleButtons}>
                <TouchableOpacity
                  style={[styles.toggleButton, tieneDescuentoDocumento && styles.toggleButtonActive]}
                  onPress={() => setTieneDescuentoDocumento(true)}
                >
                  <Text style={[styles.toggleText, tieneDescuentoDocumento && styles.toggleTextActive]}>Sí</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, !tieneDescuentoDocumento && styles.toggleButtonActiveNo]}
                  onPress={() => setTieneDescuentoDocumento(false)}
                >
                  <Text style={[styles.toggleText, !tieneDescuentoDocumento && styles.toggleTextActiveNo]}>No</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Artículo */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Artículo</Text>
              <View style={styles.searchRow}>
                <TouchableOpacity
                  style={styles.searchInput}
                  onPress={() => setShowArticuloModal(true)}
                >
                  <Text style={styles.searchText}>
                    {articuloSeleccionado ? articuloSeleccionado.nombre : 'Artículo'}
                  </Text>
                  <Text style={styles.searchIcon}>🔍</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Cantidad y Precio */}
            <View style={styles.twoColumns}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Cant.</Text>
                <TextInput
                  style={styles.input}
                  value={articuloCantidad}
                  onChangeText={setArticuloCantidad}
                  keyboardType="numeric"
                  placeholder="1"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Precio</Text>
              <TextInput
                style={styles.input}
                value={articuloPrecio}
                onChangeText={setArticuloPrecio}
                keyboardType="decimal-pad"
                placeholder="27,90 €"
              />
            </View>

            {/* Descuento */}
            <View style={styles.twoColumns}>
              <View style={[styles.formGroup, { flex: 2 }]}>
                <Text style={styles.label}>Descuento</Text>
                <TextInput
                  style={styles.input}
                  value={articuloDescuento}
                  onChangeText={setArticuloDescuento}
                  keyboardType="decimal-pad"
                  placeholder="17%"
                />
              </View>
              <TouchableOpacity 
                style={styles.toggleDescuento}
                onPress={() => setTipoDescuentoArticulo(t => t === 'porcentaje' ? 'pesos' : 'porcentaje')}
              >
                <Text style={styles.toggleIcon}>🔄</Text>
              </TouchableOpacity>
            </View>

            {/* Nota */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nota:</Text>
              <TextInput
                style={styles.textArea}
                value={articuloNota}
                onChangeText={setArticuloNota}
                multiline
                numberOfLines={3}
                placeholder="Lorem ipsum dolor sit amet, consectet..."
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.charCount}>0/40</Text>
            </View>

            {/* Botón Añadir Artículo */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddArticulo}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButtonGradient}
              >
                <Text style={styles.addButtonText}>+ Añadir Artículo</Text>
              </LinearGradient>
            </TouchableOpacity>

          </ScrollView>

          {/* Botones inferiores fijos */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.historialButton}
              onPress={() => setShowHistorialModal(true)}
            >
              <Text style={styles.historialIcon}>📄</Text>
              <Text style={styles.historialText}>Historial de Ventas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resumenButton}
              onPress={() => {
                console.log('Botón Resumen Nota presionado');
                handleGuardarVenta();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8bd600', '#c4ff57']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.resumenGradient}
              >
                <Text style={styles.resumenIcon}>📋</Text>
                <Text style={styles.resumenText}>Resumen Nota</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* COLUMNA DERECHA: Nota de Venta */}
        <View style={styles.rightPanel}>
          {/* Header Nota */}
          <View style={styles.notaHeader}>
            <Text style={styles.notaTitle}>Nota de Venta</Text>
            
            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'lineas' && styles.tabActive]}
                onPress={() => setActiveTab('lineas')}
              >
                <Text style={[styles.tabText, activeTab === 'lineas' && styles.tabTextActive]}>
                  Líneas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'porcentajes' && styles.tabActive]}
                onPress={() => setActiveTab('porcentajes')}
              >
                <Text style={[styles.tabText, activeTab === 'porcentajes' && styles.tabTextActive]}>
                  Porcentajes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'pesos' && styles.tabActive]}
                onPress={() => setActiveTab('pesos')}
              >
                <Text style={[styles.tabText, activeTab === 'pesos' && styles.tabTextActive]}>
                  Pesos
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contenido de la nota */}
          {articulosVenta.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={styles.emptyTitle}>No hay artículos añadidos</Text>
              <Text style={styles.emptySubtitle}>Añade artículos para crear la nota de venta</Text>
            </View>
          ) : (
            <ScrollView style={styles.tableContainer}>
              {/* Tabla Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 3 }]}>Artículo</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Cantidad</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Valor</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Descuento</Text>
                <View style={{ width: 80 }} />
              </View>

              {/* Tabla Rows */}
              {articulosVenta.map((articulo, index) => (
                <View key={articulo.id} style={styles.tableRow}>
                  <View style={{ flex: 3 }}>
                    <Text style={styles.tableCell}>{articulo.nombre}</Text>
                    {articulo.nota && (
                      <Text style={styles.tableCellNote}>{articulo.nota}</Text>
                    )}
                  </View>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{String(articulo.cantidad).padStart(2, '0')}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>
                    {articulo.precioUnitario.toFixed(2).replace('.', ',')} €
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.5, color: '#10b981' }]}>
                    {articulo.descuento > 0
                      ? `${articulo.descuento}${articulo.tipoDescuento === 'porcentaje' ? '%' : '€'}`
                      : '-'}
                  </Text>
                  <View style={styles.tableActions}>
                    <TouchableOpacity onPress={() => handleDeleteArticulo(articulo.id)}>
                      <Text style={styles.actionIcon}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteArticulo(articulo.id)}>
                      <Text style={styles.actionIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Totales Footer */}
          <View style={styles.totalsPanel}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Descuentos:</Text>
              <Text style={styles.totalValue}>
                {totales.descuentos.toFixed(2).replace('.', ',')} € ({totales.porcentajeDescuento}%)
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA o RE:</Text>
              <Text style={styles.totalValue}>$ {totales.iva.toFixed(2).replace('.', ',')}</Text>
            </View>
            <View style={styles.totalRowSubtotal}>
              <Text style={styles.totalLabelSubtotal}>Subtotal:</Text>
              <Text style={styles.totalValueSubtotal}>
                {totales.baseImponible.toFixed(2).replace('.', ',')} €
              </Text>
            </View>
          </View>

          {/* Total Final */}
          <View style={styles.totalFinal}>
            <Text style={styles.totalFinalLabel}>TOTAL:</Text>
            <Text style={styles.totalFinalValue}>
              {totales.total.toFixed(2).replace('.', ',')} €
            </Text>
          </View>

          {/* Botones Líneas/Familias */}
          <View style={styles.footerButtons}>
            <TouchableOpacity style={styles.footerButton}>
              <Text style={styles.footerButtonText}>Líneas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerButton}>
              <Text style={styles.footerButtonText}>Familias</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modal Cliente */}
      <Modal
        visible={showClienteModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
            <ScrollView style={styles.modalList}>
              {clientes.map(cliente => (
                <TouchableOpacity
                  key={cliente.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setClienteSeleccionado(cliente);
                    setShowClienteModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{cliente.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowClienteModal(false)}
            >
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Artículo */}
      <SeleccionarArticuloModal
        visible={showArticuloModal}
        onClose={() => setShowArticuloModal(false)}
        articulos={articulos}
        onSelect={handleSelectArticulo}
      />
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 24,
    paddingHorizontal: 40,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 24,
    color: '#1a1a1a',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: 351,
    backgroundColor: '#fafafa',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  formContent: {
    padding: 28,
    paddingBottom: 120,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  dropdown: {
    height: 44,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
  },
  dropdownIcon: {
    fontSize: 10,
    color: '#697b92',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    borderColor: '#0C2ABF',
    borderWidth: 2,
  },
  toggleButtonActiveNo: {
    backgroundColor: '#0C2ABF',
    borderColor: '#0C2ABF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#697b92',
  },
  toggleTextActive: {
    color: '#0C2ABF',
  },
  toggleTextActiveNo: {
    color: '#ffffff',
  },
  helperText: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  searchIcon: {
    fontSize: 16,
  },
  input: {
    height: 44,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1a1a1a',
  },
  toggleDescuento: {
    width: 44,
    height: 44,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIcon: {
    fontSize: 20,
  },
  textArea: {
    height: 80,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  addButton: {
    marginTop: 12,
    borderRadius: 30,
    overflow: 'hidden',
  },
  addButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    flexDirection: 'row',
    gap: 12,
    padding: 18,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  historialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: 30,
  },
  historialIcon: {
    fontSize: 14,
  },
  historialText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#697b92',
  },
  resumenButton: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
  },
  resumenGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  resumenIcon: {
    fontSize: 14,
  },
  resumenText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  notaHeader: {
    padding: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  notaTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: '#0C2ABF',
    textAlign: 'center',
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'transparent',
    borderBottomWidth: 3,
    borderBottomColor: '#0C2ABF',
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#0C2ABF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#697b92',
    textAlign: 'center',
  },
  tableContainer: {
    flex: 1,
    padding: 28,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    marginBottom: 16,
  },
  tableHeaderText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#697b92',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  tableCell: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  tableCellNote: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#697b92',
    marginTop: 4,
  },
  tableActions: {
    width: 80,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  actionIcon: {
    fontSize: 18,
  },
  totalsPanel: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#697b92',
  },
  totalValue: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalRowSubtotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 8,
  },
  totalLabelSubtotal: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalValueSubtotal: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 2,
    borderTopColor: '#0C2ABF',
  },
  totalFinalLabel: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalFinalValue: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '700',
    color: '#0C2ABF',
  },
  footerButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  footerButtonText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#0C2ABF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalClose: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#0C2ABF',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});



