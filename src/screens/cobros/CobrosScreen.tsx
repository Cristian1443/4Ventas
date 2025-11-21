/**
 * Cobros Screen - EXACTAMENTE IGUAL A LA WEB
 * Formulario de cobro con dos columnas (formulario izquierda, notas pendientes derecha)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

export default function CobrosScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { notasVenta, updateNotaVenta, addCobro, updateCobro, cobros } = useApp();

  const clienteSeleccionado = route.params?.clienteSeleccionado;

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);

  const paymentMethods = [
    'Efectivo',
    'Tarjeta de Débito',
    'Tarjeta de Crédito',
    'Bizum',
    'Transferencia Bancaria'
  ];

  // Obtener las notas pendientes del cliente seleccionado
  const pendingNotes = clienteSeleccionado
    ? notasVenta
        .filter(nota => {
          if (nota.estado !== 'pendiente') return false;
          
          // Buscar por ID del cliente
          if (nota.clienteId && clienteSeleccionado.id && nota.clienteId === clienteSeleccionado.id) {
            return true;
          }
          
          // Buscar por nombre o empresa
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
          amount: parseFloat(nota.precio.replace(/[^\d,]/g, '').replace(',', '.')) || 0
        }))
    : [];

  const toggleNote = (index: string) => {
    if (selectedNotes.includes(index)) {
      setSelectedNotes(selectedNotes.filter(n => n !== index));
    } else {
      setSelectedNotes([...selectedNotes, index]);
    }
  };

  // Calcular subtotal basado en las notas seleccionadas
  const subtotal = selectedNotes.reduce((sum, noteIndex) => {
    const note = pendingNotes[parseInt(noteIndex)];
    return sum + (note?.amount || 0);
  }, 0);

  const handleConfirmarCobro = async () => {
    if (!clienteSeleccionado || selectedNotes.length === 0 || !selectedPaymentMethod) {
      Alert.alert('Error', 'Completa todos los campos requeridos');
      return;
    }

    try {
      // Buscar si existe un cobro pendiente para este cliente
      const cobroPendiente = cobros.find(c =>
        c.estado === 'pendiente' &&
        (c.clienteId === clienteSeleccionado.id ||
          c.cliente.includes(clienteSeleccionado.empresa) ||
          c.cliente.includes(clienteSeleccionado.nombre))
      );

      if (cobroPendiente) {
        // ACTUALIZAR el cobro existente de 'pendiente' a 'pagado'
        await updateCobro(cobroPendiente.id, 'pagado');
      } else {
        // Si no existe cobro pendiente, crear uno nuevo como pagado
        const nuevoCobro = {
          id: `C${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          cliente: clienteSeleccionado.empresa || clienteSeleccionado.nombre,
          clienteId: clienteSeleccionado.id,
          monto: `${subtotal.toFixed(2).replace('.', ',')} €`,
          fecha: new Date().toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
          }),
          estado: 'pagado' as const,
          formaPago: selectedPaymentMethod
        };
        await addCobro(nuevoCobro);
      }

      // Obtener las notas seleccionadas con sus datos completos
      const notasSeleccionadas = selectedNotes.map(index => {
        const nota = pendingNotes[parseInt(index)];
        return nota;
      }).filter(Boolean);

      // Actualizar el estado de las notas de venta a 'cerrada'
      for (const index of selectedNotes) {
        const nota = pendingNotes[parseInt(index)];
        if (nota) {
          await updateNotaVenta(nota.id, 'cerrada');
        }
      }

      // Preparar datos para la pantalla de confirmación
      const cobranzaData = {
        cliente: clienteSeleccionado,
        notas: notasSeleccionadas,
        metodoPago: selectedPaymentMethod,
        formaPago: selectedPaymentMethod,
        subtotal: subtotal
      };

      // Navegar directamente a confirmación con los datos
      navigation.navigate('CobrosConfirmacion', { cobranzaActual: cobranzaData });
    } catch (error: any) {
      Alert.alert('Error', `No se pudo confirmar el cobro: ${error?.message || 'Error desconocido'}`);
    }
  };

  return (
    <ScreenWithSidebar currentScreen="Cobros" scrollable={false}>
      <View style={styles.container}>
        <View style={styles.mainContent}>
          {/* Left side - Form */}
          <View style={styles.leftColumn}>
            <Text style={styles.sectionLabel}>Cliente</Text>

            {/* Client Selector */}
            <TouchableOpacity
              style={styles.clientSelector}
              onPress={() => navigation.navigate('CobrosList')}
            >
              <Text style={[
                styles.clientText,
                !clienteSeleccionado && styles.clientTextPlaceholder
              ]}>
                {clienteSeleccionado ? (clienteSeleccionado.empresa || clienteSeleccionado.nombre) : 'Seleccione un cliente'}
              </Text>
              {clienteSeleccionado && clienteSeleccionado.direccion && (
                <Text style={styles.clientAddress}>{clienteSeleccionado.direccion}</Text>
              )}
              {!clienteSeleccionado && (
                <Text style={styles.clientSelectorHint}>Toca para seleccionar cliente</Text>
              )}
            </TouchableOpacity>

            {/* Cambiar cliente button */}
            {clienteSeleccionado && (
              <TouchableOpacity
                style={styles.changeClientButton}
                onPress={() => navigation.navigate('CobrosList')}
              >
                <Text style={styles.changeClientIcon}>↻</Text>
                <Text style={styles.changeClientText}>Cambiar Cliente</Text>
              </TouchableOpacity>
            )}

            {/* Payment Method Label */}
            <Text style={styles.sectionLabel}>Forma de Pago</Text>

            {/* Payment Method Selector */}
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
                      style={[
                        styles.paymentOption,
                        index < paymentMethods.length - 1 && styles.paymentOptionBorder
                      ]}
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

            {/* Confirm Button */}
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
                    : ['#8bd600', '#c4ff57']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmButtonGradient}
              >
                <Text style={styles.confirmButtonIcon}>📄</Text>
                <Text style={styles.confirmButtonText}>Confirmar Cobro</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Right side - Pending Notes */}
          <View style={styles.rightColumn}>
            {/* Header */}
            <View style={styles.notesHeader}>
              <Text style={styles.notesHeaderIcon}>📄</Text>
              <Text style={styles.notesHeaderTitle}>Marcar Notas Pendientes</Text>
            </View>

            {/* Notes List */}
            <ScrollView style={styles.notesList} contentContainerStyle={styles.notesListContent}>
              {!clienteSeleccionado ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>👤</Text>
                  <Text style={styles.emptyStateTitle}>No hay cliente seleccionado</Text>
                  <Text style={styles.emptyStateText}>
                    Selecciona un cliente para ver sus notas pendientes
                  </Text>
                </View>
              ) : pendingNotes.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>📄</Text>
                  <Text style={styles.emptyStateTitle}>No hay notas pendientes</Text>
                  <Text style={styles.emptyStateText}>
                    Este cliente no tiene notas pendientes de cobro
                  </Text>
                </View>
              ) : (
                pendingNotes.map((note, index) => (
                  <View key={index} style={styles.noteCard}>
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
                      {note.amount.toFixed(2)} €
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.noteCheckbox,
                        selectedNotes.includes(index.toString()) && styles.noteCheckboxSelected
                      ]}
                      onPress={() => toggleNote(index.toString())}
                    >
                      {selectedNotes.includes(index.toString()) && (
                        <Text style={styles.noteCheckmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.notesFooter}>
              <View style={styles.subtotalContainer}>
                <Text style={styles.subtotalLabel}>Subtotal:</Text>
                <Text style={styles.subtotalValue}>{subtotal.toFixed(2)} €</Text>
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
    padding: 80,
    paddingHorizontal: 60,
    gap: 60
  },
  leftColumn: {
    width: 400,
    paddingTop: 20
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 24
  },
  clientSelector: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    padding: 18,
    marginBottom: 12,
    minHeight: 56
  },
  clientSelectorHint: {
    fontSize: 12,
    color: '#0C2ABF',
    marginTop: 4,
    fontStyle: 'italic'
  },
  clientText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600'
  },
  clientTextPlaceholder: {
    color: '#697b92',
    fontWeight: '400'
  },
  clientAddress: {
    fontSize: 12,
    color: '#697b92',
    marginTop: 4
  },
  changeClientButton: {
    width: '100%',
    padding: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  changeClientIcon: {
    fontSize: 14,
    color: '#0C2ABF'
  },
  changeClientText: {
    fontSize: 12,
    color: '#0C2ABF',
    fontWeight: '600'
  },
  paymentSelectorContainer: {
    position: 'relative',
    marginBottom: 60
  },
  paymentSelector: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56
  },
  paymentText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600'
  },
  paymentTextPlaceholder: {
    color: '#697b92',
    fontWeight: '400'
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
    borderRadius: 5,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5
  },
  paymentOption: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  paymentOptionBorder: {
    borderBottomWidth: 1
  },
  paymentOptionText: {
    fontSize: 14,
    color: '#697b92'
  },
  confirmButton: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden'
  },
  confirmButtonDisabled: {
    opacity: 0.6
  },
  confirmButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  confirmButtonIcon: {
    fontSize: 12
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  rightColumn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: 720,
    flexDirection: 'column'
  },
  notesHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 32,
    paddingVertical: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  notesHeaderIcon: {
    fontSize: 20
  },
  notesHeaderTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  notesList: {
    flex: 1
  },
  notesListContent: {
    padding: 26,
    paddingVertical: 32
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.3
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 14,
    color: '#697b92',
    textAlign: 'center'
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 18,
    paddingVertical: 31,
    marginBottom: 12,
    minHeight: 112,
    position: 'relative'
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8
  },
  noteIdBadge: {
    paddingVertical: 3,
    paddingHorizontal: 5,
    backgroundColor: '#91e600',
    borderRadius: 5
  },
  noteIdText: {
    fontSize: 10,
    color: '#1a1a1a'
  },
  noteClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#697b92'
  },
  noteDateRow: {
    flexDirection: 'row',
    gap: 4
  },
  noteDateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#092090'
  },
  noteDateValue: {
    fontSize: 12,
    color: '#092090'
  },
  noteAmount: {
    position: 'absolute',
    right: 18,
    top: 49,
    fontSize: 14,
    fontWeight: '600',
    color: '#0c1c8d'
  },
  noteCheckbox: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 19,
    height: 19,
    backgroundColor: '#ffffff',
    borderWidth: 0.559,
    borderColor: '#092090',
    borderRadius: 5.588,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2.794
  },
  noteCheckboxSelected: {
    backgroundColor: '#0C2ABF'
  },
  noteCheckmark: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold'
  },
  notesFooter: {
    backgroundColor: '#f3f7fd',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 40,
    paddingVertical: 32
  },
  subtotalContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 50,
    padding: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  subtotalLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#092090'
  },
  subtotalValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#092090'
  }
});
