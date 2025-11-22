/**
 * Cobros Screen
 * Selección de notas pendientes y confirmación de pago.
 * Incluye opción para generar recibo impreso.
 */

import React, { useState, useEffect } from 'react';
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

export default function CobrosScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { notasVenta, updateNotaVenta, addCobro, cobros } = useApp();

  const clienteSeleccionado = route.params?.clienteSeleccionado;

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  
  // Nuevo estado para la opción de imprimir
  const [imprimirRecibo, setImprimirRecibo] = useState(true);

  const paymentMethods = [
    'Efectivo',
    'Tarjeta de Débito',
    'Tarjeta de Crédito',
    'Bizum',
    'Transferencia Bancaria'
  ];

  // Filtrar notas pendientes del cliente
  const pendingNotes = clienteSeleccionado
    ? notasVenta
        .filter(nota => {
          if (nota.estado !== 'pendiente') return false;
          
          // Coincidencia por ID o Nombre
          if (nota.clienteId && clienteSeleccionado.id && nota.clienteId === clienteSeleccionado.id) {
            return true;
          }
          
          const nombreCliente = clienteSeleccionado.nombre?.toLowerCase().trim() || '';
          const empresaCliente = clienteSeleccionado.empresa?.toLowerCase().trim() || '';
          const nombreNota = nota.cliente?.toLowerCase().trim() || '';
          
          return nombreNota.includes(nombreCliente) || 
                 nombreCliente.includes(nombreNota) ||
                 nombreNota.includes(empresaCliente) ||
                 empresaCliente.includes(nombreNota);
        })
        .map(nota => ({
          id: nota.id,
          client: nota.cliente,
          date: nota.fecha,
          amount: parseFloat(nota.precio.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
          originalNota: nota // Guardamos la referencia completa
        }))
    : [];

  const toggleNote = (index: string) => {
    if (selectedNotes.includes(index)) {
      setSelectedNotes(selectedNotes.filter(n => n !== index));
    } else {
      setSelectedNotes([...selectedNotes, index]);
    }
  };

  // Calcular subtotal
  const subtotal = selectedNotes.reduce((sum, noteIndex) => {
    const note = pendingNotes[parseInt(noteIndex)];
    return sum + (note?.amount || 0);
  }, 0);

  const handleConfirmarCobro = async () => {
    if (!clienteSeleccionado || selectedNotes.length === 0 || !selectedPaymentMethod) {
      Alert.alert('Faltan datos', 'Por favor selecciona un método de pago y al menos una nota para cobrar.');
      return;
    }

    try {
      // 1. Registrar el Cobro en el sistema
      const nuevoCobro = {
        id: `C${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`, // ID único
        cliente: clienteSeleccionado.empresa || clienteSeleccionado.nombre,
        clienteId: clienteSeleccionado.id,
        monto: `${subtotal.toFixed(2).replace('.', ',')} €`,
        fecha: new Date().toLocaleString('es-ES'),
        estado: 'pagado' as const,
        formaPago: selectedPaymentMethod,
        notasPagadasIds: selectedNotes.map(idx => pendingNotes[parseInt(idx)].id) // Referencia a notas
      };
      
      await addCobro(nuevoCobro);

      // 2. Actualizar estado de las notas a 'cerrada'
      for (const index of selectedNotes) {
        const nota = pendingNotes[parseInt(index)];
        if (nota) {
          await updateNotaVenta(nota.id, 'cerrada');
        }
      }

      // 3. Preparar datos para la pantalla de Recibo/Impresión
      const notasCobradas = selectedNotes.map(index => pendingNotes[parseInt(index)]).filter(Boolean);
      
      const datosRecibo = {
        cobroId: nuevoCobro.id,
        cliente: clienteSeleccionado,
        notas: notasCobradas,
        metodoPago: selectedPaymentMethod,
        totalCobrado: subtotal,
        fecha: new Date(),
        autoPrint: imprimirRecibo // Pasamos la preferencia de impresión
      };

      // 4. Navegar a la pantalla de Impresión/Confirmación
      navigation.replace('CobrosConfirmacion', { cobranzaActual: datosRecibo });

    } catch (error: any) {
      Alert.alert('Error', `Ocurrió un error al procesar el cobro: ${error?.message}`);
    }
  };

  return (
    <ScreenWithSidebar currentScreen="Cobros" scrollable={false}>
      <View style={styles.container}>
        <View style={styles.mainContent}>
          
          {/* COLUMNA IZQUIERDA - Formulario de Pago */}
          <View style={styles.leftColumn}>
            <View style={styles.headerLeft}>
                 {/* Botón Volver sutil */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={{marginBottom: 10}}>
                    <Text style={{color: '#697b92'}}>← Volver a lista</Text>
                </TouchableOpacity>
                <Text style={styles.sectionLabel}>Cliente</Text>
            </View>

            {/* Selector de Cliente (Visualización) */}
            <View style={styles.clientCard}>
              <Text style={styles.clientName}>
                {clienteSeleccionado ? (clienteSeleccionado.empresa || clienteSeleccionado.nombre) : 'Seleccione un cliente'}
              </Text>
              {clienteSeleccionado && (
                <Text style={styles.clientDetail}>{clienteSeleccionado.direccion}</Text>
              )}
            </View>
            
            {clienteSeleccionado && (
                <TouchableOpacity 
                    style={styles.changeClientLink}
                    onPress={() => navigation.navigate('CobrosList')}
                >
                    <Text style={styles.changeClientText}>↻ Cambiar Cliente</Text>
                </TouchableOpacity>
            )}

            <Text style={[styles.sectionLabel, {marginTop: 30}]}>Forma de Pago</Text>

            {/* Selector Método de Pago */}
            <View style={styles.paymentSelectorContainer}>
              <TouchableOpacity
                style={styles.paymentSelector}
                onPress={() => setShowPaymentDropdown(!showPaymentDropdown)}
              >
                <Text style={[
                  styles.paymentText,
                  !selectedPaymentMethod && styles.paymentTextPlaceholder
                ]}>
                  {selectedPaymentMethod || 'Seleccione método de pago'}
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

            {/* Opción Imprimir Recibo */}
            <View style={styles.printOptionContainer}>
                <Text style={styles.printOptionLabel}>🖨️ Generar Recibo para Cliente</Text>
                <Switch
                    trackColor={{ false: "#e2e8f0", true: "#0C2ABF" }}
                    thumbColor={imprimirRecibo ? "#ffffff" : "#f4f3f4"}
                    onValueChange={setImprimirRecibo}
                    value={imprimirRecibo}
                />
            </View>

            {/* Botón Confirmar */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!clienteSeleccionado || selectedNotes.length === 0 || !selectedPaymentMethod) &&
                styles.confirmButtonDisabled
              ]}
              onPress={handleConfirmarCobro}
              disabled={!clienteSeleccionado || selectedNotes.length === 0 || !selectedPaymentMethod}
            >
              <LinearGradient
                colors={
                  (!clienteSeleccionado || selectedNotes.length === 0 || !selectedPaymentMethod)
                    ? ['#d4d4d4', '#e2e2e2']
                    : ['#092090', '#0C2ABF']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmButtonGradient}
              >
                <Text style={styles.confirmButtonIcon}>✅</Text>
                <Text style={styles.confirmButtonText}>Confirmar Cobro</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* COLUMNA DERECHA - Notas Pendientes */}
          <View style={styles.rightColumn}>
            <View style={styles.notesHeader}>
              <Text style={styles.notesHeaderIcon}>📄</Text>
              <Text style={styles.notesHeaderTitle}>Marcar Notas Pendientes</Text>
            </View>

            <ScrollView style={styles.notesList} contentContainerStyle={styles.notesListContent}>
              {!clienteSeleccionado ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Selecciona un cliente para ver sus notas</Text>
                </View>
              ) : pendingNotes.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>Todo al día</Text>
                  <Text style={styles.emptyStateText}>Este cliente no tiene deudas pendientes.</Text>
                </View>
              ) : (
                pendingNotes.map((note, index) => {
                   const isSelected = selectedNotes.includes(index.toString());
                   return (
                    <TouchableOpacity 
                        key={index} 
                        style={[styles.noteCard, isSelected && styles.noteCardSelected]}
                        onPress={() => toggleNote(index.toString())}
                        activeOpacity={0.9}
                    >
                        <View style={styles.noteHeader}>
                        <View style={styles.noteIdBadge}>
                            <Text style={styles.noteIdText}>{note.id}</Text>
                        </View>
                        <Text style={styles.noteClient}>{note.client}</Text>
                        </View>

                        <View style={styles.noteDateRow}>
                        <Text style={styles.noteDateLabel}>Fecha:</Text>
                        <Text style={styles.noteDateValue}>{note.date}</Text>
                        </View>

                        <Text style={styles.noteAmount}>
                        {note.amount.toFixed(2).replace('.', ',')} €
                        </Text>

                        <View style={[
                            styles.checkbox,
                            isSelected && styles.checkboxSelected
                        ]}>
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 40,
    gap: 40
  },
  // Left Column
  leftColumn: {
    width: 400,
    paddingTop: 20,
    flexShrink: 0
  },
  headerLeft: {
      marginBottom: 10
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12
  },
  clientCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 20,
    marginBottom: 8
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4
  },
  clientDetail: {
    fontSize: 13,
    color: '#697b92'
  },
  changeClientLink: {
      alignSelf: 'flex-start',
      paddingVertical: 8
  },
  changeClientText: {
      fontSize: 13,
      color: '#0C2ABF',
      fontWeight: '600'
  },
  paymentSelectorContainer: {
    position: 'relative',
    marginBottom: 30,
    zIndex: 10 // Ensure dropdown appears on top
  },
  paymentSelector: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  paymentText: {
    fontSize: 14,
    color: '#1a1a1a'
  },
  paymentTextPlaceholder: {
    color: '#94a3b8'
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#697b92'
  },
  paymentDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  paymentOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  paymentOptionText: {
    fontSize: 14,
    color: '#1a1a1a'
  },
  printOptionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#f8fafc',
      padding: 16,
      borderRadius: 8,
      marginBottom: 30,
      borderWidth: 1,
      borderColor: '#e2e8f0'
  },
  printOptionLabel: {
      fontSize: 14,
      color: '#1a1a1a',
      fontWeight: '500'
  },
  confirmButton: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: 'auto' // Push to bottom if space allows
  },
  confirmButtonDisabled: {
    opacity: 0.5
  },
  confirmButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  confirmButtonIcon: {
    fontSize: 16
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff'
  },
  
  // Right Column
  rightColumn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  notesHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff'
  },
  notesHeaderIcon: {
    fontSize: 20
  },
  notesHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  notesList: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  notesListContent: {
    padding: 24
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 14,
    color: '#697b92'
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
    position: 'relative'
  },
  noteCardSelected: {
      borderColor: '#0C2ABF',
      backgroundColor: '#f0f7ff'
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8
  },
  noteIdBadge: {
    backgroundColor: '#91e600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  noteIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  noteClient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#697b92'
  },
  noteDateRow: {
    flexDirection: 'row',
    gap: 6
  },
  noteDateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#092090'
  },
  noteDateValue: {
    fontSize: 12,
    color: '#092090'
  },
  noteAmount: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  checkbox: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff'
  },
  checkboxSelected: {
    borderColor: '#0C2ABF',
    backgroundColor: '#0C2ABF'
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  notesFooter: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  subtotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b'
  },
  subtotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#092090'
  }
});