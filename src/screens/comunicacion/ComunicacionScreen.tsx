/**
 * Comunicación Screen - CONECTADA A DATOS REALES
 * Muestra estado real de sincronización y permite exportar datos del contexto.
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
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function ComunicacionScreen() {
  const navigation = useNavigation<any>();
  
  // CONEXIÓN GLOBAL: Obtenemos estado real y datos
  const { 
    notasVenta, 
    gastos, 
    documentos, 
    forzarSincronizacion,
    syncStatus,
    modoOffline,
    config,
    logout
  } = useApp();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [exportType, setExportType] = useState<'ventas' | 'gastos' | 'todo'>('ventas');
  const [internalSyncState, setInternalSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // HANDLER PARA CERRAR SESIÓN
  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Salir', 
          style: 'destructive', 
          onPress: () => {
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } 
        }
      ]
    );
  };

  // EXPORTACIÓN: Usa datos reales del contexto
  const handleExport = async () => {
    let dataToExport: any = {};
    let filename = '';
    const dateStr = new Date().toISOString().split('T')[0];

    switch (exportType) {
      case 'ventas':
        dataToExport = notasVenta;
        filename = `ventas_${dateStr}.json`;
        break;
      case 'gastos':
        dataToExport = gastos;
        filename = `gastos_${dateStr}.json`;
        break;
      case 'todo':
        dataToExport = { 
          ventas: notasVenta, 
          gastos, 
          documentos,
          meta: {
            fecha: new Date().toISOString(),
            version: '1.0'
          }
        };
        filename = `backup_completo_${dateStr}.json`;
        break;
    }

    try {
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const baseDir =
        (FileSystemLegacy as any).cacheDirectory ||
        FileSystemLegacy.documentDirectory ||
        '';
      const fileUri = `${baseDir}${filename}`;
      await FileSystemLegacy.writeAsStringAsync(fileUri, jsonString);
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Éxito', `Archivo guardado localmente: ${filename}`);
      }
      
      setShowExportModal(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar o compartir el archivo de exportación.');
    }
  };

  const handleImport = () => {
    // Funcionalidad requiere expo-document-picker (no incluido en dependencias base)
    Alert.alert('Importar Datos', 'Para restaurar una copia de seguridad, por favor contacte con soporte técnico para habilitar la selección de archivos nativa.');
    setShowImportModal(false);
  };

  const handleSync = async () => {
    if (modoOffline && !config.erpEnabled) {
        Alert.alert('Modo Offline', 'No se puede sincronizar. Verifique su conexión o la configuración del ERP.');
        return;
    }

    setInternalSyncState('syncing');
    setShowSyncModal(true);
    
    try {
      await forzarSincronizacion();
      // Verificamos el resultado real en syncStatus
      if (syncStatus.error) {
          throw new Error(syncStatus.error);
      }
      setInternalSyncState('success');
      setTimeout(() => {
        setShowSyncModal(false);
        setInternalSyncState('idle');
      }, 2000);
    } catch (error) {
      setInternalSyncState('error');
      setTimeout(() => {
        setShowSyncModal(false);
        setInternalSyncState('idle');
      }, 2500);
    }
  };

  // CÁLCULOS DE VISUALIZACIÓN
  const lastSyncLabel = syncStatus.ultimaSync 
    ? new Date(syncStatus.ultimaSync).toLocaleString('es-ES')
    : 'Nunca';
    
  const connectionLabel = modoOffline ? 'Offline / Error' : 'Conectado ERP';
  const connectionColor = modoOffline ? '#dc2626' : '#10b981';

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

          {/* Stats: Datos Reales */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Ventas Locales</Text>
              <Text style={styles.statValue}>{notasVenta.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Gastos Locales</Text>
              <Text style={[styles.statValue, styles.statValueSecondary]}>{gastos.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Documentos</Text>
              <Text style={[styles.statValue, styles.statValueSecondary]}>{documentos.length}</Text>
            </View>
          </View>

          {/* Botones de acción */}
          <View style={styles.actionsContainer}>
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
                <Text style={styles.actionText}>Importar{'\n'}Respaldo</Text>
              </LinearGradient>
            </TouchableOpacity>

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
                <Text style={styles.actionText}>Sincronizar{'\n'}Ahora</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Información de Estado REAL */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Estado del Sistema</Text>
            <View style={styles.infoContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Última sincronización:</Text>
                <Text style={styles.infoValue}>{lastSyncLabel}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Conexión ERP:</Text>
                <View style={styles.connectionStatus}>
                  <View style={[styles.connectionDot, { backgroundColor: connectionColor }]} />
                  <Text style={[styles.connectionText, { color: connectionColor }]}>
                    {connectionLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cola pendiente:</Text>
                <Text style={styles.infoValue}>
                    {syncStatus.operacionesPendientes || 0} operaciones
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Configuración:</Text>
                <Text style={styles.infoValue}>
                    {config.autoSyncEnabled ? 'Sync Automática' : 'Sync Manual'}
                </Text>
              </View>
            </View>
          </View>

          {/* BOTÓN DE CERRAR SESIÓN */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Modales (Export, Import, Sync) sin cambios visuales, solo lógica conectada */}
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
              Genera un archivo JSON con los datos locales actuales. Útil para respaldos manuales.
            </Text>
            
            <View style={styles.modalOptions}>
              {[
                { value: 'ventas', label: `Ventas (${notasVenta.length} registros)` },
                { value: 'gastos', label: `Gastos (${gastos.length} registros)` },
                { value: 'todo', label: 'Copia Completa del Sistema' }
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
                  <Text style={styles.modalButtonPrimaryText}>Generar Archivo</Text>
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
            <Text style={styles.modalTitle}>Restaurar Datos</Text>
            <Text style={styles.modalDescription}>
              Esta función permite cargar datos desde un archivo de respaldo generado previamente.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowImportModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cerrar</Text>
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

      {/* Modal de Sincronización */}
      <Modal
        visible={showSyncModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.syncModalContent}>
            {internalSyncState === 'syncing' && (
              <>
                <ActivityIndicator size="large" color="#092090" />
                <Text style={styles.syncModalText}>Sincronizando con ERP...</Text>
                <Text style={styles.syncModalSubtext}>Por favor espere</Text>
              </>
            )}
            {internalSyncState === 'success' && (
              <>
                <Text style={styles.syncModalIcon}>✅</Text>
                <Text style={[styles.syncModalText, styles.syncModalTextSuccess]}>
                  ¡Sincronización Exitosa!
                </Text>
              </>
            )}
            {internalSyncState === 'error' && (
              <>
                <Text style={styles.syncModalIcon}>❌</Text>
                <Text style={[styles.syncModalText, styles.syncModalTextError]}>
                  Error de Conexión
                </Text>
                <Text style={styles.syncModalSubtext}>Revise su internet o el ERP</Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scrollContent: { padding: 40, paddingHorizontal: 60, maxWidth: 1400, alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: '#697b92' },
  title: { fontSize: 32, fontWeight: '700', color: '#1a1a1a' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 32 },
  statCard: { flex: 1, minWidth: 200, padding: 20, paddingVertical: 16, backgroundColor: '#f8fafc', borderRadius: 10 },
  statLabel: { fontSize: 18, color: '#697b92', marginBottom: 4 },
  statValue: { fontSize: 32, fontWeight: '700', color: '#092090' },
  statValueSecondary: { color: '#1a1a1a' },
  actionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 32 },
  actionButton: { flex: 1, minWidth: 150, height: 120, borderRadius: 12, overflow: 'hidden' },
  actionButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  actionIcon: { fontSize: 34 },
  actionText: { fontSize: 20, fontWeight: '600', color: '#ffffff', textAlign: 'center' },
  infoCard: { backgroundColor: '#f8fafc', padding: 24, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  infoTitle: { fontSize: 22, fontWeight: '600', color: '#1a1a1a', marginBottom: 16 },
  infoContent: { gap: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 18, color: '#697b92' },
  infoValue: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  connectionStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connectionDot: { width: 9, height: 9, borderRadius: 4.5 },
  connectionText: { fontSize: 18, fontWeight: '600' },
  // Modales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 32, maxWidth: 500, width: '90%' },
  modalTitle: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 20 },
  modalDescription: { fontSize: 18, color: '#697b92', marginBottom: 20 },
  modalOptions: { gap: 12, marginBottom: 24 },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  modalOptionActive: { borderColor: '#092090', backgroundColor: '#f0f4ff' },
  radioButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  radioButtonActive: { borderColor: '#092090' },
  radioButtonInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#092090' },
  modalOptionText: { fontSize: 18, color: '#1a1a1a' },
  modalOptionTextActive: { color: '#092090', fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, borderRadius: 8, overflow: 'hidden' },
  modalButtonCancel: { borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  modalButtonCancelText: { fontSize: 18, fontWeight: '600', color: '#697b92', textAlign: 'center', paddingVertical: 12 },
  modalButtonPrimary: { borderRadius: 8 },
  modalButtonGradient: { paddingVertical: 12, alignItems: 'center' },
  modalButtonPrimaryText: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  syncModalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 40, alignItems: 'center', maxWidth: 400, width: '90%' },
  syncModalIcon: { fontSize: 64, marginBottom: 16 },
  syncModalText: { fontSize: 22, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  syncModalSubtext: { fontSize: 18, color: '#697b92' },
  syncModalTextSuccess: { color: '#10b981' },
  syncModalTextError: { color: '#dc2626' },

  // ESTILOS PARA EL BOTÓN DE CERRAR SESIÓN
  logoutContainer: { marginTop: 30, marginBottom: 20 },
  logoutButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#dc2626', // Rojo intenso
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18
  }
});