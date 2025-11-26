/**
 * Cobros Screen
 * - Actualizada la llamada a updateCobro para pasar los datos reales del pago.
 * - Incluye método de pago y fecha en los metadatos para sincronización con ERP.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import { imprimirComprobanteCobro, ComprobanteCobro } from '../../services/printer.matricial.service';

export default function CobrosScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const { notasVenta, updateNotaVenta, cobros, updateCobro, addCobro } = useApp();

  const clienteSeleccionado = route.params?.clienteSeleccionado;

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([]); 
  const [imprimirRecibo, setImprimirRecibo] = useState(true);

  const paymentMethods = [
    'Efectivo',
    'Tarjeta de Débito',
    'Tarjeta de Crédito',
    'Bizum',
    'Transferencia Bancaria'
  ];

  // 1. Listar Deudas Pendientes
  const pendingDebts = useMemo(() => {
    if (!clienteSeleccionado) return [];

    const deudasCliente = cobros.filter(c => {
      if (c.estado !== 'pendiente') return false;

      const idMatch = String(c.clienteId) === String(clienteSeleccionado.id);
      const nameMatch = c.cliente && clienteSeleccionado.nombre && 
                        c.cliente.toLowerCase().includes(clienteSeleccionado.nombre.toLowerCase());
      
      return idMatch || nameMatch;
    });

    return deudasCliente.map(cobro => {
      const notaOriginal = notasVenta.find(n => n.id === cobro.notaVentaId);
      
      return {
        id: cobro.id, // ID Real del Cobro
        notaId: cobro.notaVentaId || 'S/N',
        client: cobro.cliente,
        date: cobro.fecha,
        amount: parseFloat(cobro.monto.toString().replace(/[^\d,]/g, '').replace(',', '.') || '0'),
        originalNota: notaOriginal,
      };
    });
  }, [cobros, notasVenta, clienteSeleccionado]);

  const toggleDebt = (id: string) => {
    if (selectedDebtIds.includes(id)) {
      setSelectedDebtIds(selectedDebtIds.filter(dId => dId !== id));
    } else {
      setSelectedDebtIds([...selectedDebtIds, id]);
    }
  };

  const subtotal = selectedDebtIds.reduce((sum, id) => {
    const item = pendingDebts.find(d => d.id === id);
    return sum + (item?.amount || 0);
  }, 0);

  // 2. PROCESO DE COBRO BLINDADO
  const handleConfirmarCobro = async () => {
    if (!clienteSeleccionado || selectedDebtIds.length === 0 || !selectedPaymentMethod) {
      Alert.alert('Faltan datos', 'Selecciona método de pago y al menos una deuda.');
      return;
    }

    try {
      const itemsAPagar = pendingDebts.filter(d => selectedDebtIds.includes(d.id));
      
      // Datos para el recibo
      const notasParaRecibo = itemsAPagar.map(item => ({
        id: item.notaId !== 'S/N' ? item.notaId : item.id,
        client: item.client,
        date: item.date,
        amount: item.amount
      }));

      // B. ACTUALIZAR BASE DE DATOS
      // Actualizar todos los cobros de una vez para evitar problemas de estado
      const fechaPago = new Date();
      for (const item of itemsAPagar) {
        // MODIFICACIÓN CLAVE: Pasamos el método de pago y fecha a updateCobro
        await updateCobro(item.id, 'pagado', {
            formaPago: selectedPaymentMethod,
            fecha: fechaPago
        });
      }

      // Cerrar todas las notas de venta después de actualizar los cobros
      for (const item of itemsAPagar) {
        if (item.originalNota) {
          await updateNotaVenta(item.originalNota.id, 'cerrada');
        }
      }

      // Datos para pantalla de confirmación
      const datosRecibo = {
        cobroId: `PAGO-${Date.now().toString().slice(-6)}`,
        cliente: clienteSeleccionado,
        notas: notasParaRecibo, 
        metodoPago: selectedPaymentMethod,
        subtotal: subtotal, 
        fecha: new Date(),
        autoPrint: imprimirRecibo
      };

      // Imprimir automáticamente si está habilitado
      if (imprimirRecibo) {
        try {
          const comprobante: ComprobanteCobro = {
            cobroId: datosRecibo.cobroId,
            cliente: {
              nombre: clienteSeleccionado.nombre || '',
              empresa: clienteSeleccionado.empresa,
              codigo: clienteSeleccionado.id || clienteSeleccionado.codigo,
              direccion: clienteSeleccionado.direccion,
              nif: clienteSeleccionado.nif
            },
            notas: notasParaRecibo,
            metodoPago: selectedPaymentMethod,
            subtotal: subtotal,
            fecha: fechaPago
          };
          await imprimirComprobanteCobro(comprobante);
        } catch (error: any) {
          console.error('Error imprimiendo comprobante automáticamente:', error);
          // No bloqueamos el flujo si falla la impresión
        }
      }

      navigation.navigate('CobrosConfirmacion', { cobranzaActual: datosRecibo });

    } catch (error: any) {
      console.error("Error al cobrar:", error);
      Alert.alert('Error', 'No se pudo procesar el cobro.');
    }
  };

  return (
    <ScreenWithSidebar currentScreen="Cobros" scrollable={false}>
      <View style={styles.container}>
        <View style={styles.mainContent}>
          
          {/* COLUMNA IZQUIERDA */}
          <View style={styles.leftColumn}>
            <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{marginBottom: 10}}>
                    <Text style={{color: '#697b92'}}>← Volver a lista</Text>
                </TouchableOpacity>
                <Text style={styles.sectionLabel}>Cliente</Text>
            </View>

            <View style={styles.clientCard}>
              <Text style={styles.clientName}>
                {clienteSeleccionado ? (clienteSeleccionado.empresa || clienteSeleccionado.nombre) : 'Seleccione un cliente'}
              </Text>
              {clienteSeleccionado && (
                <Text style={styles.clientDetail}>{clienteSeleccionado.direccion}</Text>
              )}
            </View>
            
            <Text style={[styles.sectionLabel, {marginTop: 30}]}>Forma de Pago</Text>

            <View style={styles.paymentSelectorContainer}>
              <TouchableOpacity
                style={styles.paymentSelector}
                onPress={() => setShowPaymentDropdown(!showPaymentDropdown)}
              >
                <Text style={[styles.paymentText, !selectedPaymentMethod && styles.paymentTextPlaceholder]}>
                  {selectedPaymentMethod || 'Seleccione método...'}
                </Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>

              {showPaymentDropdown && (
                <View style={styles.paymentDropdown}>
                  {paymentMethods.map((method, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.paymentOption}
                      onPress={() => {
                        setSelectedPaymentMethod(method);
                        setShowPaymentDropdown(false);
                      }}
                    >
                      <Text style={styles.paymentOptionText}>{method}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.printOptionContainer}>
                <Text style={styles.printOptionLabel}>🖨️ Generar Recibo</Text>
                <Switch
                    trackColor={{ false: "#e2e8f0", true: "#0C2ABF" }}
                    thumbColor={imprimirRecibo ? "#ffffff" : "#f4f3f4"}
                    onValueChange={setImprimirRecibo}
                    value={imprimirRecibo}
                />
            </View>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!clienteSeleccionado || selectedDebtIds.length === 0 || !selectedPaymentMethod) &&
                styles.confirmButtonDisabled
              ]}
              onPress={handleConfirmarCobro}
              disabled={!clienteSeleccionado || selectedDebtIds.length === 0 || !selectedPaymentMethod}
            >
              <LinearGradient
                colors={(!clienteSeleccionado || selectedDebtIds.length === 0 || !selectedPaymentMethod)
                    ? ['#d4d4d4', '#e2e2e2'] : ['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.confirmButtonGradient}
              >
                <Text style={styles.confirmButtonIcon}>✅</Text>
                <Text style={styles.confirmButtonText}>Confirmar ({subtotal.toFixed(2)} €)</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* COLUMNA DERECHA */}
          <View style={styles.rightColumn}>
            <View style={styles.notesHeader}>
              <Text style={styles.notesHeaderIcon}>📄</Text>
              <Text style={styles.notesHeaderTitle}>Recibos Pendientes ({pendingDebts.length})</Text>
            </View>

            <ScrollView style={styles.notesList} contentContainerStyle={styles.notesListContent}>
              {!clienteSeleccionado ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Selecciona un cliente</Text>
                </View>
              ) : pendingDebts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>🎉</Text>
                  <Text style={styles.emptyStateTitle}>Todo al día</Text>
                  <Text style={styles.emptyStateText}>No hay recibos pendientes.</Text>
                </View>
              ) : (
                pendingDebts.map((item) => {
                   const isSelected = selectedDebtIds.includes(item.id);
                   return (
                    <TouchableOpacity 
                        key={item.id} 
                        style={[styles.noteCard, isSelected && styles.noteCardSelected]}
                        onPress={() => toggleDebt(item.id)}
                        activeOpacity={0.9}
                    >
                        <View style={styles.noteHeader}>
                            <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
                                <View style={styles.noteIdBadge}>
                                    <Text style={styles.noteIdText}>
                                      {item.notaId !== 'S/N' ? item.notaId : item.id}
                                    </Text>
                                </View>
                                <Text style={{fontSize: 14, fontWeight: '600', color: '#1e293b'}}>
                                    {item.originalNota ? 'Nota de Venta' : 'Deuda'}
                                </Text>
                            </View>
                            <Text style={styles.noteDateValue}>{item.date}</Text>
                        </View>

                        <Text style={styles.noteAmount}>
                            {item.amount.toFixed(2).replace('.', ',')} €
                        </Text>

                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.notesFooter}>
              <View style={styles.subtotalContainer}>
                <Text style={styles.subtotalLabel}>Total a Cobrar:</Text>
                <Text style={styles.subtotalValue}>{subtotal.toFixed(2).replace('.', ',')} €</Text>
              </View>
            </View>
          </View>

        </View>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  mainContent: { flex: 1, flexDirection: 'row', padding: 30, gap: 30, height: '100%', overflow: 'hidden' },
  
  leftColumn: { width: 350, flexDirection: 'column', flexShrink: 0 },
  headerLeft: { marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  clientCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 16 },
  clientName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  clientDetail: { fontSize: 13, color: '#697b92' },
  
  paymentSelectorContainer: { position: 'relative', marginBottom: 20, zIndex: 20 },
  paymentSelector: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paymentText: { fontSize: 14, color: '#1a1a1a' },
  paymentTextPlaceholder: { color: '#94a3b8' },
  dropdownIcon: { fontSize: 12, color: '#697b92' },
  paymentDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  paymentOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  paymentOptionText: { fontSize: 14, color: '#1a1a1a' },
  
  printOptionContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  printOptionLabel: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  
  confirmButton: { width: '100%', borderRadius: 30, overflow: 'hidden', marginTop: 'auto' },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonGradient: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  confirmButtonIcon: { fontSize: 16 },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  
  rightColumn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  notesHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff' },
  notesHeaderIcon: { fontSize: 20 },
  notesHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  
  notesList: { flex: 1, backgroundColor: '#f8fafc' },
  notesListContent: { padding: 20 },
  
  noteCard: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noteCardSelected: { borderColor: '#0C2ABF', backgroundColor: '#f0f7ff' },
  noteHeader: { flexDirection: 'column', gap: 4 },
  noteIdBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  noteIdText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  noteDateValue: { fontSize: 12, color: '#64748b' },
  noteAmount: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginRight: 40 },
  
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkboxSelected: { borderColor: '#0C2ABF', backgroundColor: '#0C2ABF' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', flex: 1 },
  emptyStateIcon: { fontSize: 40, marginBottom: 10 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: '#697b92' },
  
  notesFooter: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  subtotalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f7ff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#dbeafe' },
  subtotalLabel: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  subtotalValue: { fontSize: 20, fontWeight: '700', color: '#092090' }
});