/**
 * Configuración Screen - EXACTAMENTE IGUAL A LA WEB
 * Lista de opciones con modales
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
  Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

type ModalType = 'printer' | 'user' | 'bell' | 'sync' | 'globe' | 'database' | 'info' | null;

export default function ConfiguracionScreen() {
  const navigation = useNavigation<any>();
  const { syncStatus, forzarSincronizacion } = useApp();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [printerEnabled, setPrinterEnabled] = useState(false);
  const [printerAutoprint, setPrinterAutoprint] = useState(false);
  const [printerCopies, setPrinterCopies] = useState('1');
  const [userProfile, setUserProfile] = useState({
    nombre: 'Juan Pérez',
    email: 'juan.perez@4ventas.com',
    telefono: '+34 600 123 456',
    puesto: 'Vendedor'
  });
  const [notifications, setNotifications] = useState({
    ventasNuevas: true,
    cobros: true,
    gastos: false,
    documentos: true
  });
  const [autoSync, setAutoSync] = useState(true);
  const [language, setLanguage] = useState('Español');

  const opcionesConfig = [
    { id: 1, nombre: 'Impresora', descripcion: 'Configurar dispositivo de impresión', icono: 'printer' as ModalType },
    { id: 2, nombre: 'Perfil de Usuario', descripcion: 'Editar información personal', icono: 'user' as ModalType },
    { id: 3, nombre: 'Notificaciones', descripcion: 'Gestionar alertas y avisos', icono: 'bell' as ModalType },
    { id: 4, nombre: 'Sincronización', descripcion: 'Estado de sincronización con servidor', icono: 'sync' as ModalType },
    { id: 5, nombre: 'Idioma y Región', descripcion: 'Cambiar configuración regional', icono: 'globe' as ModalType },
    { id: 6, nombre: 'Respaldo de Datos', descripcion: 'Exportar e importar información', icono: 'database' as ModalType },
    { id: 7, nombre: 'Acerca de', descripcion: 'Versión y términos de uso', icono: 'info' as ModalType },
  ];

  const handleSalir = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => navigation.replace('Login')
        }
      ]
    );
  };

  const handleOptionClick = (icono: ModalType) => {
    setActiveModal(icono);
  };

  const handleExportData = () => {
    Alert.alert('Exportar Datos', 'Exportando datos... (Esta funcionalidad exportaría todos los datos a un archivo JSON)');
  };

  const handleImportData = () => {
    Alert.alert('Importar Datos', 'Importando datos... (Esta funcionalidad permitiría importar datos desde un archivo)');
  };

  const handleSync = async () => {
    Alert.alert('Sincronizando', 'Sincronizando datos...');
    await forzarSincronizacion();
    Alert.alert('Completado', 'Datos sincronizados correctamente');
  };

  const lastSync = syncStatus.ultimaSync 
    ? new Date(syncStatus.ultimaSync).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Nunca';

  return (
    <ScreenWithSidebar currentScreen="Configuracion" scrollable={false}>
      <View style={styles.container}>
        {/* Header Sticky */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Configuración</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.navigate('Main')}
          >
            <Text style={styles.closeIcon}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Opciones de configuración */}
          <View style={styles.opcionesContainer}>
            {opcionesConfig.map((opcion, index) => (
              <TouchableOpacity
                key={opcion.id}
                style={[
                  styles.opcionCard,
                  index === opcionesConfig.length - 1 && styles.opcionCardLast
                ]}
                onPress={() => handleOptionClick(opcion.icono)}
                activeOpacity={0.7}
              >
                <View style={styles.opcionContent}>
                  <View style={styles.opcionText}>
                    <Text style={styles.opcionNombre}>{opcion.nombre}</Text>
                    <Text style={styles.opcionDescripcion}>{opcion.descripcion}</Text>
                  </View>
                  <Text style={styles.opcionArrow}>→</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Separador */}
            <View style={styles.separator} />

            {/* Opción de Salir */}
            <TouchableOpacity
              style={styles.salirCard}
              onPress={handleSalir}
              activeOpacity={0.7}
            >
              <Text style={styles.salirText}>Salir</Text>
            </TouchableOpacity>
          </View>

          {/* Información de la aplicación */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>4Ventas v1.0.0</Text>
            <Text style={styles.footerText}>© 2024 Todos los derechos reservados</Text>
          </View>
        </ScrollView>
      </View>

      {/* Modales */}
      {/* Modal Impresora */}
      <Modal
        visible={activeModal === 'printer'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configuración de Impresora</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.modalBody}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Impresión habilitada</Text>
                  <Switch
                    value={printerEnabled}
                    onValueChange={setPrinterEnabled}
                    trackColor={{ false: '#e2e8f0', true: '#91e600' }}
                    thumbColor="#ffffff"
                  />
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Impresión automática</Text>
                  <Switch
                    value={printerAutoprint}
                    onValueChange={setPrinterAutoprint}
                    trackColor={{ false: '#e2e8f0', true: '#91e600' }}
                    thumbColor="#ffffff"
                  />
                </View>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Número de copias</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={printerCopies}
                    onChangeText={setPrinterCopies}
                    keyboardType="number-pad"
                    placeholder="1"
                  />
                </View>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    Alert.alert('Éxito', 'Configuración guardada');
                    setActiveModal(null);
                  }}
                >
                  <LinearGradient
                    colors={['#092090', '#0C2ABF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>Guardar Configuración</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Perfil de Usuario */}
      <Modal
        visible={activeModal === 'user'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Perfil de Usuario</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.modalBody}>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Nombre completo</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={userProfile.nombre}
                    onChangeText={(text) => setUserProfile({ ...userProfile, nombre: text })}
                    placeholder="Nombre completo"
                  />
                </View>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Email</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={userProfile.email}
                    onChangeText={(text) => setUserProfile({ ...userProfile, email: text })}
                    keyboardType="email-address"
                    placeholder="email@ejemplo.com"
                  />
                </View>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Teléfono</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={userProfile.telefono}
                    onChangeText={(text) => setUserProfile({ ...userProfile, telefono: text })}
                    keyboardType="phone-pad"
                    placeholder="+34 600 123 456"
                  />
                </View>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Puesto</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={userProfile.puesto}
                    onChangeText={(text) => setUserProfile({ ...userProfile, puesto: text })}
                    placeholder="Vendedor"
                  />
                </View>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    Alert.alert('Éxito', 'Cambios guardados');
                    setActiveModal(null);
                  }}
                >
                  <LinearGradient
                    colors={['#092090', '#0C2ABF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>Guardar Cambios</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Notificaciones */}
      <Modal
        visible={activeModal === 'bell'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notificaciones</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.modalBody}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Ventas nuevas</Text>
                  <Switch
                    value={notifications.ventasNuevas}
                    onValueChange={(value) => setNotifications({ ...notifications, ventasNuevas: value })}
                    trackColor={{ false: '#e2e8f0', true: '#91e600' }}
                    thumbColor="#ffffff"
                  />
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Cobros pendientes</Text>
                  <Switch
                    value={notifications.cobros}
                    onValueChange={(value) => setNotifications({ ...notifications, cobros: value })}
                    trackColor={{ false: '#e2e8f0', true: '#91e600' }}
                    thumbColor="#ffffff"
                  />
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Gastos registrados</Text>
                  <Switch
                    value={notifications.gastos}
                    onValueChange={(value) => setNotifications({ ...notifications, gastos: value })}
                    trackColor={{ false: '#e2e8f0', true: '#91e600' }}
                    thumbColor="#ffffff"
                  />
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Documentos nuevos</Text>
                  <Switch
                    value={notifications.documentos}
                    onValueChange={(value) => setNotifications({ ...notifications, documentos: value })}
                    trackColor={{ false: '#e2e8f0', true: '#91e600' }}
                    thumbColor="#ffffff"
                  />
                </View>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    Alert.alert('Éxito', 'Preferencias guardadas');
                    setActiveModal(null);
                  }}
                >
                  <LinearGradient
                    colors={['#092090', '#0C2ABF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>Guardar Preferencias</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Sincronización */}
      <Modal
        visible={activeModal === 'sync'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sincronización</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.modalBody}>
                <View style={styles.syncStatusCard}>
                  <Text style={styles.syncStatusTitle}>
                    Estado: {syncStatus.error ? 'Error' : 'Sincronizado'}
                  </Text>
                  <Text style={styles.syncStatusText}>
                    Última sincronización: {lastSync}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Sincronización automática</Text>
                  <Switch
                    value={autoSync}
                    onValueChange={setAutoSync}
                    trackColor={{ false: '#e2e8f0', true: '#91e600' }}
                    thumbColor="#ffffff"
                  />
                </View>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleSync}
                >
                  <LinearGradient
                    colors={['#092090', '#0C2ABF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>Sincronizar Ahora</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Idioma y Región */}
      <Modal
        visible={activeModal === 'globe'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Idioma y Región</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.modalBody}>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Idioma de la aplicación</Text>
                  <View style={styles.languageButtons}>
                    {['Español', 'English', 'Français', 'Deutsch'].map((lang) => (
                      <TouchableOpacity
                        key={lang}
                        style={[
                          styles.languageButton,
                          language === lang && styles.languageButtonActive
                        ]}
                        onPress={() => setLanguage(lang)}
                      >
                        <Text style={[
                          styles.languageButtonText,
                          language === lang && styles.languageButtonTextActive
                        ]}>
                          {lang}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>
                    ℹ️ La aplicación se reiniciará para aplicar el cambio de idioma
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    Alert.alert('Éxito', 'Cambios aplicados');
                    setActiveModal(null);
                  }}
                >
                  <LinearGradient
                    colors={['#092090', '#0C2ABF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>Aplicar Cambios</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Respaldo de Datos */}
      <Modal
        visible={activeModal === 'database'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Respaldo de Datos</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.modalBody}>
                <View style={styles.warningCard}>
                  <Text style={styles.warningText}>
                    ⚠️ Los respaldos incluyen todas las ventas, gastos, cobros y documentos
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalButton, styles.exportButton]}
                  onPress={handleExportData}
                >
                  <Text style={styles.exportButtonText}>📥 Exportar Datos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.importButton]}
                  onPress={handleImportData}
                >
                  <Text style={styles.importButtonText}>📤 Importar Datos</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Acerca de */}
      <Modal
        visible={activeModal === 'info'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Acerca de 4Ventas</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.modalBody}>
                <View style={styles.aboutContent}>
                  <Text style={styles.aboutTitle}>4Ventas</Text>
                  <Text style={styles.aboutVersion}>Versión 1.0.0</Text>
                </View>
                <View style={styles.aboutCard}>
                  <Text style={styles.aboutDescription}>
                    Sistema de gestión de ventas para vendedores
                  </Text>
                  <Text style={styles.aboutCopyright}>
                    © 2024 Todos los derechos reservados
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.aboutLink}
                  onPress={() => Alert.alert('Términos y Condiciones', 'Términos y condiciones...')}
                >
                  <Text style={styles.aboutLinkText}>📄 Términos y Condiciones</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.aboutLink}
                  onPress={() => Alert.alert('Política de Privacidad', 'Política de privacidad...')}
                >
                  <Text style={styles.aboutLinkText}>🔒 Política de Privacidad</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.aboutLink}
                  onPress={() => Alert.alert('Licencias', 'Licencias de software...')}
                >
                  <Text style={styles.aboutLinkText}>⚖️ Licencias</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    position: 'sticky',
    top: 0,
    width: '100%',
    minHeight: 62,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10
  },
  headerSpacer: {
    width: 26,
    height: 26
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center'
  },
  closeButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeIcon: {
    fontSize: 20,
    color: '#697b92'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 40,
    paddingHorizontal: 24,
    paddingBottom: 60,
    maxWidth: 1080,
    alignSelf: 'center',
    width: '100%'
  },
  opcionesContainer: {
    width: '100%'
  },
  opcionCard: {
    width: '100%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  opcionCardLast: {
    borderBottomWidth: 1
  },
  opcionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingVertical: 18
  },
  opcionText: {
    flex: 1
  },
  opcionNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4
  },
  opcionDescripcion: {
    fontSize: 14,
    color: '#697b92'
  },
  opcionArrow: {
    fontSize: 20,
    color: '#697b92',
    width: 20,
    height: 20
  },
  separator: {
    height: 20
  },
  salirCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  salirText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    padding: 24,
    paddingVertical: 18
  },
  footer: {
    marginTop: 60,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4
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
    width: '100%',
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    fontSize: 20,
    color: '#697b92',
    textAlign: 'center',
    lineHeight: 30
  },
  modalBody: {
    gap: 20
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8
  },
  modalLabel: {
    fontSize: 14,
    color: '#1a1a1a'
  },
  modalInputGroup: {
    gap: 8
  },
  modalInputLabel: {
    fontSize: 14,
    color: '#697b92',
    marginBottom: 8
  },
  modalInput: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    color: '#1a1a1a'
  },
  modalButton: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  modalButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center'
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff'
  },
  syncStatusCard: {
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac'
  },
  syncStatusTitle: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '600',
    marginBottom: 4
  },
  syncStatusText: {
    fontSize: 12,
    color: '#16a34a'
  },
  languageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  languageButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  languageButtonActive: {
    backgroundColor: '#0C2ABF',
    borderColor: '#0C2ABF'
  },
  languageButtonText: {
    fontSize: 14,
    color: '#697b92'
  },
  languageButtonTextActive: {
    color: '#ffffff'
  },
  infoCard: {
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af'
  },
  warningCard: {
    padding: 16,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa'
  },
  warningText: {
    fontSize: 13,
    color: '#9a3412'
  },
  exportButton: {
    backgroundColor: '#10b981',
    borderRadius: 8
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    paddingVertical: 12
  },
  importButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8
  },
  importButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    paddingVertical: 12
  },
  aboutContent: {
    alignItems: 'center',
    marginBottom: 20
  },
  aboutTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#092090',
    marginBottom: 8
  },
  aboutVersion: {
    fontSize: 18,
    color: '#697b92'
  },
  aboutCard: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 20
  },
  aboutDescription: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 8
  },
  aboutCopyright: {
    fontSize: 12,
    color: '#697b92'
  },
  aboutLink: {
    padding: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 8
  },
  aboutLinkText: {
    fontSize: 14,
    color: '#092090'
  }
});


