import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import { imprimirNotaVenta, exportarNotaTXT, copiarNotaTexto, NotaImpresion } from '../../services/printer.matricial.service';

// Helper para mostrar etiquetas amigables
const getEtiquetaTipoNota = (valor: string) => {
  switch (valor) {
    case 'Serie P': return 'Albarán';
    case 'Serie X': return 'Adicional';
    case 'Pedido': return 'Pedido';
    case 'Presupuesto': return 'Presupuesto';
    default: return valor || 'Nota de Venta';
  }
};

export default function VerNotaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { updateNotaVenta, clientes } = useApp();
  
  const ventaData = route.params?.ventaData;

  if (!ventaData) {
    return (
      <ScreenWithSidebar currentScreen="VerNota" scrollable={false}>
        <View style={styles.container}>
          <Text style={styles.errorText}>No se encontró información de la venta</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </ScreenWithSidebar>
    );
  }

  // Buscar el cliente completo desde el contexto usando clienteId
  const clienteCompleto = clientes.find(c => 
    String(c.id) === String(ventaData.clienteId) || 
    c.nombre === ventaData.cliente
  );

  // Datos del cliente - usar el cliente completo si existe, sino usar los datos de ventaData
  const cliente = clienteCompleto ? {
    codigo: clienteCompleto.codigo || clienteCompleto.id || '',
    nombre: clienteCompleto.nombre || ventaData.cliente || 'Cliente',
    razonSocial: clienteCompleto.empresa || '',
    nif: clienteCompleto.nif || '',
    direccion: clienteCompleto.direccion || '',
    telefono: clienteCompleto.telefono || '',
    email: clienteCompleto.email || ''
  } : (ventaData.cliente && typeof ventaData.cliente === 'object' 
    ? {
        codigo: ventaData.cliente.codigo || ventaData.clienteId || '',
        nombre: ventaData.cliente.nombre || ventaData.cliente || 'Cliente',
        razonSocial: ventaData.cliente.empresa || ventaData.cliente.razonSocial || '',
        nif: ventaData.cliente.nif || '',
        direccion: ventaData.cliente.direccion || '',
        telefono: ventaData.cliente.telefono || '',
        email: ventaData.cliente.email || ''
      }
    : {
        codigo: ventaData.clienteId || '',
        nombre: ventaData.cliente || 'Cliente',
        razonSocial: '',
        nif: '',
        direccion: '',
        telefono: '',
        email: ''
      });

  // Artículos
  const articulos = ventaData.articulos || ventaData.items || [];

  // --- LOGICA NUEVA PARA TOTALES ---
  // Si tenemos totales numéricos (nueva venta con descuento global), usarlos.
  // Si no, usar la lógica antigua de strings.
  const totalesNum = ventaData.totalesNumericos;
  
  const totales = {
    subtotal: totalesNum ? `${totalesNum.subtotal.toFixed(2)}` : (ventaData.totales?.subtotal || '0,00'),
    descuentos: totalesNum ? `${totalesNum.descuentos.toFixed(2)}` : (ventaData.totales?.descuentos || '0,00'),
    base: totalesNum ? `${totalesNum.base.toFixed(2)}` : (ventaData.totales?.base || '0,00'),
    porcentajeDescuento: ventaData.totales?.porcentajeDescuento || (ventaData.aplicarDescGlobal && ventaData.descGlobal ? ventaData.descGlobal : '0'),
    iva: totalesNum ? `${totalesNum.iva.toFixed(2)}` : (ventaData.totales?.iva || '0,00'),
    total: totalesNum ? `${totalesNum.total.toFixed(2)}` : (ventaData.precio?.replace('€', '').trim() || '0,00')
  };

  const tipoNota = ventaData.tipoNota || 'Serie P';
  const tituloNota = getEtiquetaTipoNota(tipoNota).toUpperCase();
  const formaPago = ventaData.formaPago || 'Efectivo';
  const estadoPagoLabel = ventaData.estado === 'pendiente' ? 'Crédito (Pendiente)' : 'Contado (Pagado)';

  const handleModificar = () => {
    navigation.navigate('NuevaVenta', { ventaData });
  };

  // Preparar datos para impresión con los nuevos campos
  const prepararDatosImpresion = (): NotaImpresion => {
    return {
      id: ventaData.id,
      cliente: {
        codigo: cliente.codigo || cliente.id || ventaData.clienteId || '',
        nombre: cliente.nombre || cliente.empresa || 'Cliente',
        razonSocial: cliente.razonSocial || cliente.empresa,
        nif: cliente.nif,
        direccion: cliente.direccion,
        telefono: cliente.telefono
      },
      articulos: articulos.map((art: any) => ({
        nombre: art.nombre,
        cantidad: art.cantidad,
        precioUnitario: art.precioUnitario,
        descuento: art.descuento || 0,
        tipoDescuento: art.tipoDescuento || 'porcentaje',
        nota: art.nota
      })),
      totales: {
        subtotal: totales.subtotal,
        descuentos: totales.descuentos,
        porcentajeDescuento: totales.porcentajeDescuento,
        base: totales.base,
        iva: totales.iva,
        total: totales.total
      },
      tipoNota: getEtiquetaTipoNota(tipoNota), // Usar nombre amigable
      formaPago,
      fecha: ventaData.fecha || new Date().toLocaleString('es-ES')
    };
  };

  const handleImprimir = async () => {
    const datosImpresion = prepararDatosImpresion();
    Alert.alert(
      'Imprimir Nota',
      'Selecciona el formato de impresión',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'PDF (Imprimir)',
          onPress: async () => {
            try {
              await imprimirNotaVenta(datosImpresion);
              Alert.alert('Éxito', 'Nota enviada para impresión');
            } catch (error: any) {
              console.error('Error imprimiendo:', error);
              Alert.alert('Error', `No se pudo imprimir: ${error?.message || 'Error desconocido'}`);
            }
          }
        },
        {
          text: 'TXT (Matricial)',
          onPress: async () => {
            try {
              await exportarNotaTXT(datosImpresion);
              Alert.alert('Éxito', 'Archivo TXT generado y listo para compartir');
            } catch (error: any) {
              console.error('Error exportando TXT:', error);
              Alert.alert('Error', `No se pudo exportar: ${error?.message || 'Error desconocido'}`);
            }
          }
        },
        {
          text: 'Copiar Texto',
          onPress: async () => {
            try {
              await copiarNotaTexto(datosImpresion);
              Alert.alert('Éxito', 'Texto copiado al portapapeles');
            } catch (error: any) {
              console.error('Error copiando texto:', error);
              Alert.alert('Error', `No se pudo copiar: ${error?.message || 'Error desconocido'}`);
            }
          }
        }
      ]
    );
  };

  const handleAnular = () => {
    Alert.alert(
      'Anular Venta',
      '¿Estás seguro de que deseas anular esta venta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Anular',
          style: 'destructive',
          onPress: async () => {
            await updateNotaVenta(ventaData.id, 'anulada');
            Alert.alert('Éxito', 'Venta anulada correctamente');
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleCerrar = () => {
    Alert.alert(
      'Cerrar Operación',
      '¿Confirmar el cierre de esta venta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar',
          onPress: async () => {
            await updateNotaVenta(ventaData.id, 'cerrada');
            Alert.alert('Éxito', 'Venta cerrada correctamente');
            navigation.goBack();
          }
        }
      ]
    );
  };

  // Calcular valor del artículo (Tus funciones originales)
  const calcularValorArticulo = (articulo: any) => {
    const subtotal = articulo.precioUnitario * articulo.cantidad;
    let descuentoAplicado = 0;
    if (articulo.descuento > 0) {
      if (articulo.tipoDescuento === 'porcentaje') {
        descuentoAplicado = (subtotal * articulo.descuento) / 100;
      } else {
        descuentoAplicado = articulo.descuento * articulo.cantidad;
      }
    }
    return (subtotal - descuentoAplicado).toFixed(2).replace('.', ',');
  };

  const calcularPorcentajeArticulo = (articulo: any) => {
    if (articulo.descuento > 0 && articulo.tipoDescuento === 'porcentaje') {
      return `${articulo.descuento}%`;
    }
    const subtotal = articulo.precioUnitario * articulo.cantidad;
    if (subtotal > 0 && articulo.descuento > 0) {
      const desc = articulo.tipoDescuento === 'pesos' 
        ? (articulo.descuento * articulo.cantidad) 
        : 0;
      return desc > 0 ? `${((desc / subtotal) * 100).toFixed(0)}%` : '0%';
    }
    return '0%';
  };

  return (
    <ScreenWithSidebar currentScreen="VerNota" scrollable={false}>
      <View style={styles.container}>
        {/* Header Sticky */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Resumen Nota</Text>
        </View>

        {/* Content - 2 Columnas */}
        <ScrollView 
          horizontal
          contentContainerStyle={styles.scrollContent}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.mainLayout}>
            {/* COLUMNA IZQUIERDA - Nota de Venta Card (669px) */}
            <View style={styles.leftColumn}>
              <View style={styles.notaCard}>
                {/* Header de la nota */}
                <View style={styles.notaHeader}>
                  {/* TÍTULO DINÁMICO */}
                  <Text style={styles.notaTitle}>{tituloNota}</Text>

                  {/* Cliente */}
                  <View style={styles.clienteRow}>
                    <View style={styles.clienteCodigo}>
                      <Text style={styles.clienteCodigoText}>
                        {cliente.codigo || cliente.id || ventaData.clienteId || ''}
                      </Text>
                    </View>
                    <Text style={styles.clienteNombre}>
                      {cliente.nombre || cliente.empresa || 'Cliente'}
                    </Text>
                  </View>

                  {/* Razón Social y NIF */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Razón Social:</Text>
                      <Text style={styles.infoValue}>
                        {cliente.razonSocial || cliente.empresa || '-'}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>NIF:</Text>
                      <Text style={styles.infoValue}>{cliente.nif || '-'}</Text>
                    </View>
                  </View>

                  {/* Dirección */}
                  <View style={styles.infoRowSingle}>
                    <Text style={styles.infoLabel}>Dirección:</Text>
                    <Text style={styles.infoValue}>{cliente.direccion || '-'}</Text>
                  </View>

                  {/* Teléfono y Email */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Teléfono:</Text>
                      <Text style={styles.infoValue}>{cliente.telefono || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>E-mail:</Text>
                      <Text style={styles.infoValue}>{cliente.email || '-'}</Text>
                    </View>
                  </View>

                  {/* Tipo de Nota y Forma de Pago (ACTUALIZADO) */}
                  <View style={styles.badgesRow}>
                    <View style={styles.badgeAzul}>
                      <Text style={styles.badgeText}>
                        Pago: <Text style={styles.badgeTextLight}>{formaPago}</Text>
                      </Text>
                    </View>
                    <View style={[styles.badgeAzul, ventaData.estado === 'pendiente' ? {backgroundColor: '#f59e0b'} : {}]}>
                      <Text style={styles.badgeText}>{estadoPagoLabel}</Text>
                    </View>
                  </View>
                </View>

                {/* Lista de artículos */}
                <ScrollView style={styles.articulosContainer} nestedScrollEnabled>
                  {articulos.map((articulo: any, index: number) => (
                    <View key={articulo.id || index} style={styles.articuloRow}>
                      {/* Artículo */}
                      <View style={styles.articuloCol}>
                        <Text style={styles.articuloLabel}>Artículo</Text>
                        <View style={styles.articuloBox}>
                          <Text style={styles.articuloText}>{articulo.nombre}</Text>
                        </View>
                      </View>

                      {/* Cantidad */}
                      <View style={styles.cantidadCol}>
                        <Text style={styles.articuloLabel}>Cantidad</Text>
                        <View style={styles.articuloBox}>
                          <Text style={[styles.articuloText, { textAlign: 'center' }]}>
                            {String(articulo.cantidad || 0).padStart(2, '0')}
                          </Text>
                        </View>
                      </View>

                      {/* Valor */}
                      <View style={styles.valorCol}>
                        <Text style={styles.articuloLabel}>Valor</Text>
                        <View style={styles.articuloBox}>
                          <Text style={styles.articuloText}>
                            {calcularValorArticulo(articulo)} €
                          </Text>
                        </View>
                      </View>

                      {/* Descuento */}
                      <View style={styles.descuentoCol}>
                        <Text style={styles.articuloLabel}>Descuento</Text>
                        <View style={styles.descuentoBox}>
                          <Text style={styles.articuloText}>
                            {articulo.descuento > 0 
                              ? `${articulo.descuento}${articulo.tipoDescuento === 'porcentaje' ? '%' : '€'}`
                              : '-'}
                          </Text>
                          {articulo.descuento > 0 && (
                            <Text style={styles.descuentoPorcentaje}>
                              {calcularPorcentajeArticulo(articulo)}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Icono documento */}
                      <View style={styles.iconoCol}>
                        <Text style={styles.iconoDoc}>📄</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* COLUMNA DERECHA - Botones y Totales (351px) */}
            <View style={styles.rightColumn}>
              {/* Botón Modificar */}
              <TouchableOpacity style={styles.actionButton} onPress={handleModificar}>
                <LinearGradient
                  colors={['#092090', '#0C2ABF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <Text style={styles.actionIcon}>✏️</Text>
                  <Text style={styles.actionButtonText}>Modificar</Text>
                  <View style={{ width: 16 }} />
                </LinearGradient>
              </TouchableOpacity>

              {/* Botón Imprimir */}
              <TouchableOpacity style={styles.actionButton} onPress={handleImprimir}>
                <LinearGradient
                  colors={['#092090', '#0C2ABF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <Text style={styles.actionIcon}>🖨️</Text>
                  <Text style={styles.actionButtonText}>Imprimir</Text>
                  <View style={{ width: 16 }} />
                </LinearGradient>
              </TouchableOpacity>

              {/* Botón Anular */}
              <TouchableOpacity style={styles.actionButtonSecondary} onPress={handleAnular}>
                <Text style={styles.actionIconSecondary}>✕</Text>
                <Text style={styles.actionButtonSecondaryText}>Anular</Text>
                <View style={{ width: 16 }} />
              </TouchableOpacity>

              {/* Separador */}
              <View style={styles.separator} />

              {/* Botón Cerrar Operación */}
              <TouchableOpacity style={styles.actionButtonCerrar} onPress={handleCerrar}>
                <LinearGradient
                  colors={['#8bd600', '#c4ff57']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <Text style={styles.actionIconCerrar}>✓</Text>
                  <Text style={styles.actionButtonCerrarText}>Cerrar Operación</Text>
                  <View style={{ width: 16 }} />
                </LinearGradient>
              </TouchableOpacity>

              {/* Panel de Totales (ACTUALIZADO) */}
              <View style={styles.totalesPanel}>
                {/* Subtotal */}
                {totales.subtotal && totales.subtotal !== '0,00' && (
                  <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>Subtotal:</Text>
                    <Text style={styles.totalValue}>{totales.subtotal} €</Text>
                  </View>
                )}

                {/* Descuentos */}
                {parseFloat(totales.descuentos.replace(',', '.')) > 0 && (
                  <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>
                      {/* Mostrar el % global si aplica */}
                      Descuentos {totales.porcentajeDescuento !== '0' ? `(Global ${totales.porcentajeDescuento}%)` : ''}:
                    </Text>
                    <Text style={styles.totalValue}>
                      -{totales.descuentos} €
                    </Text>
                  </View>
                )}

                {/* Base Imponible */}
                {totales.base && totales.base !== '0,00' && (
                  <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>Base Imponible:</Text>
                    <Text style={styles.totalValue}>{totales.base} €</Text>
                  </View>
                )}

                {/* IVA o RE */}
                <View style={styles.totalItem}>
                  <Text style={styles.totalLabel}>IVA (21%):</Text>
                  <Text style={styles.totalValue}>{totales.iva} €</Text>
                </View>

                {/* Total */}
                <View style={styles.subtotalPill}>
                  <Text style={styles.subtotalLabel}>TOTAL:</Text>
                  <Text style={styles.subtotalValue}>{totales.total} €</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  // SE MANTIENEN TODOS TUS ESTILOS ORIGINALES
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { height: 62, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  headerTitle: { fontSize: 22, fontWeight: '600', color: '#1a1a1a' },
  scrollContent: { minWidth: 1020 },
  mainLayout: { flexDirection: 'row', padding: 34, paddingHorizontal: 60, gap: 60, minWidth: 1020 },
  leftColumn: { width: 669, flexShrink: 0 },
  notaCard: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  notaHeader: { padding: 34, paddingTop: 22, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  notaTitle: { fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 30, color: '#0C2ABF' },
  clienteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  clienteCodigo: { backgroundColor: '#0C2ABF', borderRadius: 5, paddingVertical: 4, paddingHorizontal: 6 },
  clienteCodigoText: { fontSize: 14, fontWeight: '600', color: '#ffffff', lineHeight: 14 },
  clienteNombre: { fontSize: 22, fontWeight: '600', color: '#1a1a1a', flex: 1 },
  infoRow: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  infoRowSingle: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 10 },
  infoItem: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  infoLabel: { fontSize: 20, fontWeight: '700', color: '#0C2ABF' },
  infoValue: { fontSize: 20, color: '#697b92' },
  badgesRow: { flexDirection: 'row', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 },
  badgeAzul: { backgroundColor: '#0C2ABF', borderRadius: 5, paddingVertical: 6, paddingHorizontal: 12 },
  badgeText: { fontSize: 18, fontWeight: '600', color: '#ffffff', lineHeight: 18 },
  badgeTextLight: { fontWeight: '400' },
  articulosContainer: { maxHeight: 367, padding: 34, paddingVertical: 20 },
  articuloRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'flex-start' },
  articuloCol: { width: 279 },
  cantidadCol: { width: 60 },
  valorCol: { width: 93 },
  descuentoCol: { width: 115 },
  iconoCol: { width: 20, alignItems: 'flex-end', paddingTop: 15 },
  articuloLabel: { fontSize: 12, fontWeight: '600', color: '#0C2ABF', marginBottom: 12, paddingLeft: 8 },
  articuloBox: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5, padding: 15, paddingHorizontal: 8 },
  articuloText: { fontSize: 18, color: '#697b92', lineHeight: 18 },
  descuentoBox: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5, padding: 15, paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  descuentoPorcentaje: { fontSize: 16, color: '#07bc13', lineHeight: 16 },
  iconoDoc: { fontSize: 20 },
  rightColumn: { width: 351, flexShrink: 0, gap: 16 },
  actionButton: { borderRadius: 30, overflow: 'hidden' },
  actionButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 },
  actionIcon: { fontSize: 20, width: 20, height: 20 },
  actionButtonText: { fontSize: 18, fontWeight: '600', color: '#ffffff', lineHeight: 18 },
  actionButtonSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 30, borderWidth: 1, borderColor: '#092090', backgroundColor: '#ffffff' },
  actionIconSecondary: { fontSize: 20, width: 20, height: 20, color: '#092090' },
  actionButtonSecondaryText: { fontSize: 18, fontWeight: '600', color: '#092090', lineHeight: 18 },
  separator: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10 },
  actionButtonCerrar: { borderRadius: 30, overflow: 'hidden' },
  actionIconCerrar: { fontSize: 16, width: 16, height: 20, color: '#1a1a1a' },
  actionButtonCerrarText: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', lineHeight: 18 },
  totalesPanel: { backgroundColor: '#f3f7fd', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 34, marginTop: 40 },
  totalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  totalLabel: { fontSize: 20, fontWeight: '600', color: '#697b92', lineHeight: 22 },
  totalValue: { fontSize: 20, fontWeight: '600', color: '#697b92', lineHeight: 22 },
  subtotalPill: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 18, borderRadius: 50, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'rgba(255, 255, 255, 0.8)', marginTop: 10 },
  subtotalLabel: { fontSize: 20, fontWeight: '600', color: '#0C2ABF', lineHeight: 22 },
  subtotalValue: { fontSize: 20, fontWeight: '600', color: '#0C2ABF', lineHeight: 22 },
  errorText: { fontSize: 20, color: '#ef4444', textAlign: 'center', marginTop: 40 },
  backLink: { fontSize: 20, color: '#0C2ABF', textAlign: 'center', marginTop: 20 }
});