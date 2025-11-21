/**
 * Cobros Confirmación Screen - EXACTAMENTE IGUAL A LA WEB
 * Pantalla de confirmación de cobro con detalles y notas pendientes
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
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

export default function CobrosConfirmacionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const cobranzaActual = route.params?.cobranzaActual;

  const [showPrintMessage, setShowPrintMessage] = useState(false);

  const notasPendientes = cobranzaActual?.notas || [];
  const subtotal = cobranzaActual?.subtotal || 0;

  const handleImprimir = () => {
    Alert.alert('Imprimir', 'Comprobante enviado para impresión');
    setShowPrintMessage(true);
    setTimeout(() => setShowPrintMessage(false), 3000);
  };

  const handleVolverACobros = () => {
    navigation.navigate('CobrosList');
  };

  return (
    <ScreenWithSidebar currentScreen="CobrosConfirmacion" scrollable={false}>
      <View style={styles.container}>
        {/* Header Sticky */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Cobro Confirmado</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.navigate('CobrosList')}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content wrapper */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info del cliente y método de pago */}
          {cobranzaActual && cobranzaActual.cliente && (
            <View style={styles.clientInfoCard}>
              <View>
                <Text style={styles.clientInfoLabel}>Cliente</Text>
                <Text style={styles.clientInfoValue}>
                  {cobranzaActual.cliente.empresa || cobranzaActual.cliente.nombre}
                </Text>
              </View>
              <View style={styles.clientInfoRight}>
                <Text style={styles.clientInfoLabel}>Método de Pago</Text>
                <Text style={styles.clientInfoPayment}>
                  {cobranzaActual.metodoPago || cobranzaActual.formaPago}
                </Text>
              </View>
            </View>
          )}

          {/* Notas Pendientes panel */}
          <View style={styles.notesPanel}>
            {/* Panel header */}
            <View style={styles.notesHeader}>
              <Text style={styles.notesHeaderIcon}>📄</Text>
              <Text style={styles.notesHeaderTitle}>Notas Pendientes</Text>
            </View>

            {/* Scrollable list */}
            <ScrollView
              style={styles.notesList}
              contentContainerStyle={styles.notesListContent}
              showsVerticalScrollIndicator={false}
            >
              {notasPendientes.length === 0 ? (
                <View style={styles.emptyNotes}>
                  <Text style={styles.emptyNotesText}>No hay notas pendientes</Text>
                </View>
              ) : (
                notasPendientes.map((nota: any, index: number) => (
                  <View key={index} style={styles.noteCard}>
                    <View style={styles.noteHeader}>
                      <View style={styles.noteIdBadge}>
                        <Text style={styles.noteIdText}>{nota.id}</Text>
                      </View>
                      <Text style={styles.noteClient}>{nota.client}</Text>
                    </View>

                    <View style={styles.noteDateRow}>
                      <Text style={styles.noteDateLabel}>Fecha:</Text>
                      <Text style={styles.noteDateValue}>{nota.date}</Text>
                    </View>

                    <Text style={styles.noteAmount}>
                      {nota.amount.toFixed(2)} €
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Footer with subtotal */}
            <View style={styles.notesFooter}>
              <View style={styles.subtotalContainer}>
                <Text style={styles.subtotalLabel}>Subtotal:</Text>
                <Text style={styles.subtotalValue}>{subtotal.toFixed(2)} €</Text>
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            {/* Imprimir Comprobante button */}
            <TouchableOpacity
              style={styles.printButton}
              onPress={handleImprimir}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.printButtonGradient}
              >
                <Text style={styles.printButtonIcon}>🖨️</Text>
                <Text style={styles.printButtonText}>Imprimir Comprobante</Text>
                <View style={{ width: 16 }} />
              </LinearGradient>
            </TouchableOpacity>

            {/* Volver a Cobros button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleVolverACobros}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonIcon}>←</Text>
              <Text style={styles.backButtonText}>Volver a Cobros</Text>
              <View style={{ width: 16 }} />
            </TouchableOpacity>
          </View>

          {/* Print message */}
          {showPrintMessage && (
            <View style={styles.printMessage}>
              <Text style={styles.printMessageText}>Comprobante impreso</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    position: 'relative',
    width: '100%',
    height: 62,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24
  },
  headerSpacer: {
    width: 26,
    height: 26
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 18,
    color: '#1a1a1a'
  },
  closeButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeIcon: {
    fontSize: 20,
    color: '#697B92'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 40,
    paddingTop: 0,
    alignItems: 'center'
  },
  clientInfoCard: {
    width: 669,
    maxWidth: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 24,
    paddingVertical: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  clientInfoLabel: {
    fontSize: 12,
    color: '#697b92',
    marginBottom: 4
  },
  clientInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  clientInfoRight: {
    alignItems: 'flex-end'
  },
  clientInfoPayment: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0C2ABF'
  },
  notesPanel: {
    width: 669,
    maxWidth: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 38
  },
  notesHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    height: 70,
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
    lineHeight: 24,
    color: '#1a1a1a'
  },
  notesList: {
    maxHeight: 578
  },
  notesListContent: {
    padding: 26,
    paddingTop: 32,
    paddingBottom: 0,
    gap: 12
  },
  emptyNotes: {
    padding: 40,
    alignItems: 'center'
  },
  emptyNotesText: {
    fontSize: 14,
    color: '#697b92'
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 18,
    paddingVertical: 31,
    minHeight: 112,
    position: 'relative',
    marginBottom: 12
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8
  },
  noteIdBadge: {
    backgroundColor: '#91e600',
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 5
  },
  noteIdText: {
    fontSize: 10,
    lineHeight: 10,
    color: '#1a1a1a'
  },
  noteClient: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 14,
    color: '#697b92'
  },
  noteDateRow: {
    flexDirection: 'row',
    gap: 4
  },
  noteDateLabel: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    color: '#092090'
  },
  noteDateValue: {
    fontSize: 12,
    lineHeight: 14,
    color: '#092090'
  },
  noteAmount: {
    position: 'absolute',
    right: 18,
    top: 49,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 14,
    color: '#0c1c8d'
  },
  notesFooter: {
    backgroundColor: '#f3f7fd',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 34,
    paddingVertical: 28
  },
  subtotalContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 50,
    padding: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  subtotalLabel: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 18,
    color: '#092090'
  },
  subtotalValue: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 18,
    color: '#092090'
  },
  actionsContainer: {
    width: 351,
    maxWidth: '100%',
    gap: 18,
    alignItems: 'center'
  },
  printButton: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden'
  },
  printButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  printButtonIcon: {
    fontSize: 16
  },
  printButtonText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 14,
    color: '#ffffff'
  },
  backButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#092090',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButtonIcon: {
    fontSize: 14,
    color: '#092090'
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 14,
    color: '#092090'
  },
  printMessage: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#0C2ABF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10
  },
  printMessageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff'
  }
});
