/**
 * Comunicación Screen - EXACTAMENTE IGUAL A LA WEB
 * Exportar, Importar y Sincronizar datos
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function ComunicacionScreen() {
  const navigation = useNavigation<any>();
  const { notasVenta, gastos, documentos, forzarSincronizacion } = useApp();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [exportType, setExportType] = useState<'ventas' | 'gastos' | 'todo'>('ventas');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    let dataToExport: any = {};
    let filename = '';

    switch (exportType) {
      case 'ventas':
        dataToExport = notasVenta;
        filename = `ventas_${new Date().toISOString().split('T')[0]}.json`;
        break;
      case 'gastos':
        dataToExport = gastos;
        filename = `gastos_${new Date().toISOString().split('T')[0]}.json`;
        break;
      case 'todo':
        dataToExport = { ventas: notasVenta, gastos, documentos };
        filename = `datos_completos_${new Date().toISOString().split('T')[0]}.json`;
        break;
    }

    try {
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const fileUri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Éxito', `Archivo guardado: ${filename}`);
      }
      
      setShowExportModal(false);
      Alert.alert('Éxito', `Exportado correctamente: ${filename}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar el archivo');
    }
  };

  const handleImport = () => {
    Alert.alert('Importar Datos', 'Funcionalidad de importación en desarrollo');
    setShowImportModal(false);
  };

  const handleSync = async () => {
    setSyncStatus('syncing');
    setShowSyncModal(true);
    
    try {
      await forzarSincronizacion();
      setSyncStatus('success');
      setTimeout(() => {
        setShowSyncModal(false);
        setSyncStatus('idle');
      }, 2000);
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => {
        setShowSyncModal(false);
        setSyncStatus('idle');
      }, 2000);
    }
  };

  return (
    <ScreenWithSidebar currentScreen="Comunicacion" scrollable={false}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Main')}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Comunicación y Sincronización</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Ventas Registradas</Text>
              <Text style={styles.statValue}>{notasVenta.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Gastos Registrados</Text>
              <Text style={[styles.statValue, styles.statValueSecondary]}>{gastos.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Documentos</Text>
              <Text style={[styles.statValue, styles.statValueSecondary]}>{documentos.length}</Text>
            </View>
          </View>

          {/* Botones de acción principales */}
          <View style={styles.actionsContainer}>
            {/* Exportar Ventas */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowExportModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionIcon}>📤</Text>
                <Text style={styles.actionText}>Exportar{'\n'}Datos</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Importar Datos */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowImportModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionIcon}>📥</Text>
                <Text style={styles.actionText}>Importar{'\n'}Datos</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Sincronizar */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSync}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionIcon}>🔄</Text>
                <Text style={styles.actionText}>Sincronizar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Información adicional */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Información de Sincronización</Text>
            <View style={styles.infoContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Última sincronización:</Text>
                <Text style={styles.infoValue}>Hoy, 15:30</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estado de conexión:</Text>
                <View style={styles.connectionStatus}>
                  <View style={styles.connectionDot} />
                  <Text style={styles.connectionText}>Conectado</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Modo de sincronización:</Text>
                <Text style={styles.infoValue}>Automático</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Modal de exportación */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowExportModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Exportar Datos</Text>
            <Text style={styles.modalDescription}>
              Selecciona qué datos deseas exportar:
            </Text>
            
            <View style={styles.modalOptions}>
              {[
                { value: 'ventas', label: `Ventas (${notasVenta.length} registros)` },
                { value: 'gastos', label: `Gastos (${gastos.length} registros)` },
                { value: 'todo', label: 'Todos los datos' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    exportType === option.value && styles.modalOptionActive
                  ]}
                  onPress={() => setExportType(option.value as any)}
                >
                  <View style={[
                    styles.radioButton,
                    exportType === option.value && styles.radioButtonActive
                  ]}>
                    {exportType === option.value && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={[
                    styles.modalOptionText,
                    exportType === option.value && styles.modalOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowExportModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleExport}
              >
                <LinearGradient
                  colors={['#092090', '#0C2ABF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonPrimaryText}>Exportar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de importación */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImportModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImportModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Importar Datos</Text>
            <Text style={styles.modalDescription}>
              Selecciona un archivo JSON para importar los datos. Los datos actuales no se eliminarán, se agregarán los nuevos.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowImportModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleImport}
              >
                <LinearGradient
                  colors={['#092090', '#0C2ABF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonPrimaryText}>Seleccionar Archivo</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de sincronización */}
      <Modal
        visible={showSyncModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSyncModal(false);
          setSyncStatus('idle');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.syncModalContent}>
            {syncStatus === 'syncing' && (
              <>
                <ActivityIndicator size="large" color="#092090" />
                <Text style={styles.syncModalText}>Sincronizando datos...</Text>
              </>
            )}
            {syncStatus === 'success' && (
              <>
                <Text style={styles.syncModalIcon}>✅</Text>
                <Text style={[styles.syncModalText, styles.syncModalTextSuccess]}>
                  ¡Sincronización completada!
                </Text>
              </>
            )}
            {syncStatus === 'error' && (
              <>
                <Text style={styles.syncModalIcon}>❌</Text>
                <Text style={[styles.syncModalText, styles.syncModalTextError]}>
                  Error en la sincronización
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 40,
    paddingHorizontal: 60,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  backIcon: {
    fontSize: 20,
    color: '#697b92'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    padding: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 10
  },
  statLabel: {
    fontSize: 14,
    color: '#697b92',
    marginBottom: 4
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#092090'
  },
  statValueSecondary: {
    color: '#1a1a1a'
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32
  },
  actionButton: {
    flex: 1,
    minWidth: 150,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden'
  },
  actionButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  actionIcon: {
    fontSize: 32
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center'
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16
  },
  infoContent: {
    gap: 12
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  infoLabel: {
    fontSize: 14,
    color: '#697b92'
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981'
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981'
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    maxWidth: 500,
    width: '90%'
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20
  },
  modalDescription: {
    fontSize: 14,
    color: '#697b92',
    marginBottom: 20
  },
  modalOptions: {
    gap: 12,
    marginBottom: 24
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  modalOptionActive: {
    borderColor: '#092090',
    backgroundColor: '#f0f4ff'
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioButtonActive: {
    borderColor: '#092090'
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#092090'
  },
  modalOptionText: {
    fontSize: 14,
    color: '#1a1a1a'
  },
  modalOptionTextActive: {
    color: '#092090',
    fontWeight: '600'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden'
  },
  modalButtonCancel: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#697b92',
    textAlign: 'center',
    paddingVertical: 12
  },
  modalButtonPrimary: {
    borderRadius: 8
  },
  modalButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  modalButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff'
  },
  syncModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    maxWidth: 400,
    width: '90%'
  },
  syncModalIcon: {
    fontSize: 60,
    marginBottom: 16
  },
  syncModalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  syncModalTextSuccess: {
    color: '#10b981'
  },
  syncModalTextError: {
    color: '#dc2626'
  }
});


