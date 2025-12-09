import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import { printerService } from '../../services/printer.matricial.service';

export default function ConfiguracionScreen() {
  const navigation = useNavigation<any>();
  const {
    userSession,
    logout,
    syncStatus,
    sincronizar,
    modoOffline,
    config,
    updateConfig
  } = useApp();

  // Estados locales para formularios
  const [printerIp, setPrinterIp] = useState('');
  const [printerPort, setPrinterPort] = useState('9100');
  const [isSyncingManual, setIsSyncingManual] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState(false);

  // Cargar configuración inicial
  useEffect(() => {
    const loadSettings = async () => {
      // Cargar config impresora
      await printerService.loadSettings();
      const currentConfig = printerService.getConfig();
      setPrinterIp(currentConfig.host);
      setPrinterPort(currentConfig.port);
    };
    loadSettings();
  }, []);

  // Handlers
  const handleSavePrinter = async () => {
    if (!printerIp || !printerPort) {
      Alert.alert('Error', 'La IP y el Puerto son obligatorios');
      return;
    }
    await printerService.updateSettings(printerIp, printerPort);
    Alert.alert('Éxito', 'Configuración de impresora guardada correctamente');
  };

  const handleTestPrint = async () => {
    setTestingPrinter(true);
    const success = await printerService.testPrint(); // Asume que existe en el servicio
    setTestingPrinter(false);

    if (success) {
      Alert.alert('Impresora', 'Prueba de conexión enviada con éxito');
    } else {
      Alert.alert('Error', 'No se pudo conectar con la impresora. Verifica la IP y que estés en la misma red WiFi.');
    }
  };

  const handleManualSync = async () => {
    if (modoOffline && !config.erpEnabled) {
      Alert.alert('Modo Offline', 'No se puede sincronizar porque la conexión al ERP está deshabilitada o no hay internet.');
      return;
    }

    setIsSyncingManual(true);
    await sincronizar();
    setIsSyncingManual(false);
    Alert.alert('Sincronización', 'Proceso finalizado.');
  };

  const handleTestERPConnection = async () => {
    try {
      setIsSyncingManual(true);
      const axios = require('axios');
      const testUrl = 'http://x.verial.org:8000/WcfServiceLibraryVerial/GetClientesWS?x=39';

      console.log('🧪 Probando conexión al ERP:', testUrl);
      const response = await axios.get(testUrl, { timeout: 10000 });

      if (response.data) {
        const clientCount = Array.isArray(response.data) ? response.data.length : 0;
        Alert.alert(
          '✅ Conexión Exitosa',
          `El ERP respondió correctamente.\n\nClientes encontrados: ${clientCount}\n\nURL: ${testUrl}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('⚠️ Respuesta Vacía', 'El ERP respondió pero no envió datos.');
      }
    } catch (error: any) {
      console.error('❌ Error probando ERP:', error);
      let errorMsg = 'Error desconocido';

      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Tiempo de espera agotado (10s). El servidor no responde.';
      } else if (error.code === 'ENOTFOUND') {
        errorMsg = 'No se pudo resolver el dominio x.verial.org';
      } else if (error.message) {
        errorMsg = error.message;
      }

      Alert.alert(
        '❌ Error de Conexión',
        `No se pudo conectar al ERP.\n\nError: ${errorMsg}\n\nVerifica:\n• Estás conectado a Internet\n• El servidor ERP está activo\n• La URL es correcta`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSyncingManual(false);
    }
  };

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
            // Navegar a Login y resetear el stack de navegación
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  // Formatear fecha
  const lastSyncDate = syncStatus.ultimaSync
    ? new Date(syncStatus.ultimaSync).toLocaleString('es-ES')
    : 'Nunca';

  return (
    <ScreenWithSidebar currentScreen="Configuracion" scrollable={false}>
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
              <Text style={styles.title}>Configuración</Text>
            </View>
          </View>

          <View style={styles.gridContainer}>
            {/* COLUMNA IZQUIERDA: Usuario y Sync */}
            <View style={styles.column}>

              {/* Tarjeta de Usuario */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>👤</Text>
                  <Text style={styles.cardTitle}>Sesión Actual</Text>
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {userSession.username ? userSession.username.substring(0, 2).toUpperCase() : 'US'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.userName}>
                      {userSession.username || 'Usuario Desconocido'}
                    </Text>
                    <Text style={styles.userRole}>Vendedor / Agente</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Text style={styles.logoutText}>Cerrar Sesión</Text>
                </TouchableOpacity>
              </View>

              {/* Tarjeta de Sincronización */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>🔄</Text>
                  <Text style={styles.cardTitle}>Estado Sincronización</Text>
                </View>

                <View style={styles.syncStatusRow}>
                  <Text style={styles.syncLabel}>Estado:</Text>
                  <View style={[styles.statusBadge, modoOffline ? styles.badgeOffline : styles.badgeOnline]}>
                    <Text style={[styles.statusText, modoOffline ? styles.textOffline : styles.textOnline]}>
                      {modoOffline ? 'Offline' : 'Conectado'}
                    </Text>
                  </View>
                </View>

                <View style={styles.syncStatusRow}>
                  <Text style={styles.syncLabel}>Última vez:</Text>
                  <Text style={styles.syncValue}>{lastSyncDate}</Text>
                </View>

                <View style={styles.syncStatusRow}>
                  <Text style={styles.syncLabel}>Pendientes de subida:</Text>
                  <Text style={[styles.syncValue, (syncStatus.operacionesPendientes || 0) > 0 && { color: '#f59e0b', fontWeight: 'bold' }]}>
                    {syncStatus.operacionesPendientes || 0} registros
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.syncButton, isSyncingManual && { opacity: 0.7 }]}
                  onPress={handleManualSync}
                  disabled={isSyncingManual}
                >
                  <LinearGradient
                    colors={['#092090', '#0C2ABF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.syncGradient}
                  >
                    {isSyncingManual ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.syncButtonIcon}>⟳</Text>
                        <Text style={styles.syncButtonText}>Sincronizar Ahora</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.testButton, isSyncingManual && { opacity: 0.7 }]}
                  onPress={handleTestERPConnection}
                  disabled={isSyncingManual}
                >
                  <Text style={styles.testButtonText}>🧪 Probar Conexión ERP</Text>
                </TouchableOpacity>
              </View>

            </View>

            {/* COLUMNA DERECHA: Impresora y App */}
            <View style={styles.column}>

              {/* Configuración Impresora */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>🖨️</Text>
                  <Text style={styles.cardTitle}>Impresora de Tickets</Text>
                </View>

                <Text style={styles.inputLabel}>Dirección IP Impresora</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 192.168.1.200"
                  value={printerIp}
                  onChangeText={setPrinterIp}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Puerto</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 9100"
                  value={printerPort}
                  onChangeText={setPrinterPort}
                  keyboardType="numeric"
                />

                <View style={styles.printerActions}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleTestPrint}
                    disabled={testingPrinter}
                  >
                    {testingPrinter ? <ActivityIndicator color="#092090" /> : <Text style={styles.secondaryButtonText}>Test Impresión</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.primaryButton} onPress={handleSavePrinter}>
                    <Text style={styles.primaryButtonText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Información App */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>📱</Text>
                  <Text style={styles.cardTitle}>Información App</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Versión:</Text>
                  <Text style={styles.infoValue}>1.0.0 (Producción)</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ERP:</Text>
                  <Text style={styles.infoValue}>Verial Soft (v.2024)</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ID Dispositivo:</Text>
                  <Text style={styles.infoValue}>TAB-001</Text>
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 40, paddingHorizontal: 60 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: '#697b92' },
  title: { fontSize: 32, fontWeight: '700', color: '#1a1a1a' },

  gridContainer: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  column: { flex: 1, minWidth: 350, gap: 24 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },

  // User Card
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#bfdbfe' },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#092090' },
  userName: { fontSize: 22, fontWeight: '600', color: '#1e293b' },
  userRole: { fontSize: 18, color: '#64748b' },
  logoutButton: { paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 18 },

  // Sync Card
  syncStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  syncLabel: { fontSize: 18, color: '#64748b' },
  syncValue: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeOnline: { backgroundColor: '#dcfce7' },
  badgeOffline: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 16, fontWeight: '700' },
  textOnline: { color: '#166534' },
  textOffline: { color: '#991b1b' },
  syncButton: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  syncGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  syncButtonIcon: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  syncButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  testButton: { paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#64748b', marginTop: 12 },
  testButtonText: { color: '#64748b', fontWeight: '600', fontSize: 16 },

  // Printer Card
  inputLabel: { fontSize: 17, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 18, color: '#1e293b', marginBottom: 16 },
  printerActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  secondaryButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#092090' },
  secondaryButtonText: { color: '#092090', fontWeight: '600', fontSize: 18 },
  primaryButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#092090' },
  primaryButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 18 },

  // Info Card
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { fontSize: 18, color: '#64748b' },
  infoValue: { fontSize: 18, fontWeight: '500', color: '#1e293b' }
});