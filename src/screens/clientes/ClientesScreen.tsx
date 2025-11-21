/**
 * Clientes Screen - EXACTAMENTE IGUAL A LA WEB
 * Lista de clientes con búsqueda, filtros, ordenamiento y acciones
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
  Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

interface ClienteExtendido {
  id: string;
  nombre: string;
  empresa?: string;
  razonSocial?: string;
  nif?: string;
  direccion?: string;
  poblacion?: string;
  provincia?: string;
  cp?: string;
  telefono?: string;
  email?: string;
  ultimaVisita?: string;
  cobros?: number;
  nota?: string;
}

export default function ClientesScreen() {
  const navigation = useNavigation<any>();
  const { clientes: clientesGlobales, notasVenta, cobros } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<ClienteExtendido | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvincia, setSelectedProvincia] = useState('Todas');
  const [sortBy, setSortBy] = useState<'nombre' | 'ultimaVisita' | 'cobros'>('nombre');

  // Función mejorada para buscar cobros de un cliente
  const buscarCobrosDeCliente = (cliente: any) => {
    return cobros.filter(c => {
      if (c.estado !== 'pendiente') return false;
      
      // Primero intentar match por ID (más confiable)
      if (c.clienteId && c.clienteId === cliente.id) {
        return true;
      }
      
      // Fallback: match por nombre (para cobros legacy sin clienteId)
      const nombreCliente = cliente.nombre?.toLowerCase().trim() || '';
      const empresaCliente = cliente.empresa?.toLowerCase().trim() || '';
      const nombreCobro = c.cliente?.toLowerCase().trim() || '';
      
      return nombreCobro.includes(nombreCliente) || 
             nombreCliente.includes(nombreCobro) ||
             nombreCobro.includes(empresaCliente) ||
             empresaCliente.includes(nombreCobro) ||
             nombreCliente.split(' ').some((palabra: string) => 
               palabra.length > 3 && nombreCobro.includes(palabra)
             ) ||
             empresaCliente.split(' ').some((palabra: string) => 
               palabra.length > 3 && nombreCobro.includes(palabra)
             );
    });
  };

  // Transformar clientes globales a formato extendido con datos calculados
  const clientesData: ClienteExtendido[] = clientesGlobales.map(cliente => {
    const cobrosPendientesArray = buscarCobrosDeCliente(cliente);
    const cobrosPendientes = cobrosPendientesArray.length;

    return {
      ...cliente,
      razonSocial: cliente.empresa,
      nif: cliente.nif || 'N/A',
      poblacion: cliente.direccion?.split('—')[1]?.trim() || '',
      provincia: cliente.direccion?.split('—')[1]?.trim() || '',
      cp: '',
      cobros: cobrosPendientes,
      nota: cobrosPendientes > 0 
        ? `${cobrosPendientes} cobro${cobrosPendientes > 1 ? 's' : ''} pendiente${cobrosPendientes > 1 ? 's' : ''} de cobrar`
        : `Cliente sin cobros pendientes - Última visita: ${cliente.ultimaVisita || 'No registrada'}`
    };
  });

  const provincias = ['Todas', ...Array.from(new Set(clientesData.map(c => c.provincia || 'N/A')))];

  const filteredClientes = clientesData
    .filter((cliente) => {
      const matchesSearch = cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (cliente.razonSocial || cliente.empresa || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (cliente.poblacion || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProvincia = selectedProvincia === 'Todas' || cliente.provincia === selectedProvincia;
      return matchesSearch && matchesProvincia;
    })
    .sort((a, b) => {
      if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
      if (sortBy === 'cobros') return (b.cobros || 0) - (a.cobros || 0);
      return 0;
    });

  const handleMasOpciones = (cliente: ClienteExtendido) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
  };

  const handleVerDetalles = (cliente: ClienteExtendido) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
  };

  const handleIncidencia = (cliente: ClienteExtendido) => {
    Alert.alert('Incidencia', `Registrar incidencia para: ${cliente.nombre}`);
  };

  const handleLlamar = (telefono: string) => {
    if (telefono) {
      Linking.openURL(`tel:${telefono}`);
    } else {
      Alert.alert('Error', 'No hay teléfono disponible');
    }
  };

  const handleEmail = (email: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    } else {
      Alert.alert('Error', 'No hay email disponible');
    }
  };

  return (
    <ScreenWithSidebar currentScreen="Clientes" scrollable={false}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.navigate('Main')}
              >
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Clientes</Text>
            </View>
            <TouchableOpacity
              style={styles.nuevaVentaButton}
              onPress={() => navigation.navigate('NuevaVenta')}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nuevaVentaGradient}
              >
                <Text style={styles.nuevaVentaText}>Nueva Venta</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Clientes</Text>
              <Text style={styles.statValue}>{filteredClientes.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Visitados Hoy</Text>
              <Text style={[styles.statValue, { color: '#092090' }]}>
                {clientesData.filter(c => c.ultimaVisita === 'Hoy').length}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Pendientes Visita</Text>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                {clientesData.filter(c => c.ultimaVisita && c.ultimaVisita.includes('7')).length}
              </Text>
            </View>
          </View>

          {/* Search and filters */}
          <View style={styles.searchFilterContainer}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar cliente..."
                placeholderTextColor="#697b92"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
            
            {/* Filtro por provincia */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
              {provincias.map(prov => (
                <TouchableOpacity
                  key={prov}
                  style={[styles.filterChip, selectedProvincia === prov && styles.filterChipActive]}
                  onPress={() => setSelectedProvincia(prov)}
                >
                  <Text style={[styles.filterText, selectedProvincia === prov && styles.filterTextActive]}>
                    {prov}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Ordenar */}
            <View style={styles.sortContainer}>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'nombre' && styles.sortButtonActive]}
                onPress={() => setSortBy('nombre')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'nombre' && styles.sortButtonTextActive]}>
                  A-Z
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'cobros' && styles.sortButtonActive]}
                onPress={() => setSortBy('cobros')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'cobros' && styles.sortButtonTextActive]}>
                  Cobros
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'ultimaVisita' && styles.sortButtonActive]}
                onPress={() => setSortBy('ultimaVisita')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'ultimaVisita' && styles.sortButtonTextActive]}>
                  Visita
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de clientes */}
          {filteredClientes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No se encontraron clientes</Text>
            </View>
          ) : (
            filteredClientes.map((cliente) => (
              <View
                key={cliente.id}
                style={[
                  styles.clienteCard,
                  (cliente.cobros && cliente.cobros > 0) ? styles.clienteCardConCobros : undefined
                ]}
              >
                {/* Badge de cobros pendientes */}
                {cliente.cobros && cliente.cobros > 0 && (
                  <View style={styles.cobrosBadge}>
                    <Text style={styles.cobrosBadgeIcon}>📋</Text>
                    <Text style={styles.cobrosBadgeText}>
                      {cliente.cobros} COBRO{cliente.cobros > 1 ? 'S' : ''} PENDIENTE{cliente.cobros > 1 ? 'S' : ''}
                    </Text>
                  </View>
                )}

                <View style={styles.clienteMain}>
                  {/* Info principal */}
                  <View style={styles.clienteInfo}>
                    <View style={styles.clienteHeader}>
                      <Text style={styles.clienteIcon}>👤</Text>
                      <Text style={styles.clienteNombre}>{cliente.nombre}</Text>
                      {cliente.ultimaVisita === 'Hoy' && (
                        <View style={styles.hoyBadge}>
                          <Text style={styles.hoyBadgeText}>Visitado hoy</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.clienteEmpresa}>
                      {cliente.razonSocial || cliente.empresa} • NIF: {cliente.nif}
                    </Text>

                    <View style={styles.clienteDetalles}>
                      <Text style={styles.clienteDetalle}>📍 {cliente.poblacion}, {cliente.provincia}</Text>
                      <Text style={styles.clienteDetalle}>📅 {cliente.ultimaVisita || 'No registrada'}</Text>
                      {cliente.cobros && cliente.cobros > 0 && (
                        <Text style={[styles.clienteDetalle, { color: '#F59F0A', fontWeight: '700' }]}>
                          📋 {cliente.cobros} cobro{cliente.cobros > 1 ? 's' : ''} pendiente{cliente.cobros > 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>

                    <View style={[
                      styles.clienteNota,
                      (cliente.cobros && cliente.cobros > 0) ? styles.clienteNotaConCobros : undefined
                    ]}>
                      <Text style={styles.clienteNotaText}>
                        <Text style={{ fontWeight: '700' }}>Nota:</Text> {cliente.nota}
                      </Text>
                    </View>
                  </View>

                  {/* Acciones */}
                  <View style={styles.clienteActions}>
                    {/* Botón de cobro destacado si hay cobros pendientes */}
                    {cliente.cobros && cliente.cobros > 0 && (
                      <TouchableOpacity
                        style={styles.cobrarButton}
                        onPress={() => navigation.navigate('CobrosList')}
                      >
                        <Text style={styles.cobrarButtonText}>
                          COBRAR AHORA ({cliente.cobros})
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.detallesButton}
                      onPress={() => handleVerDetalles(cliente)}
                    >
                      <LinearGradient
                        colors={['#092090', '#0C2ABF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.detallesGradient}
                      >
                        <Text style={styles.detallesText}>Ver Detalles</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleLlamar(cliente.telefono || '')}
                      >
                        <Text style={styles.actionIcon}>📞</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEmail(cliente.email || '')}
                      >
                        <Text style={styles.actionIcon}>✉️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButtonRed}
                        onPress={() => handleIncidencia(cliente)}
                      >
                        <Text style={styles.actionIcon}>⚠️</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.nuevaVentaClienteButton}
                      onPress={() => navigation.navigate('NuevaVenta', { clienteSeleccionado: cliente })}
                    >
                      <Text style={styles.nuevaVentaClienteText}>Crear Nota de Venta</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Modal de detalles */}
        <Modal
          visible={isModalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setIsModalOpen(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <ScrollView>
                <TouchableOpacity style={styles.modalClose} onPress={() => setIsModalOpen(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
                
                {selectedCliente && (
                  <>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalIcon}>👤</Text>
                      <Text style={styles.modalTitle}>{selectedCliente.nombre}</Text>
                    </View>

                    <View style={styles.modalDivider} />

                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Datos Básicos</Text>
                      <Text style={styles.modalText}>Código: {selectedCliente.id}</Text>
                      <Text style={styles.modalText}>Empresa: {selectedCliente.empresa || selectedCliente.razonSocial}</Text>
                      <Text style={styles.modalText}>Dirección: {selectedCliente.direccion}</Text>
                      {selectedCliente.telefono && (
                        <Text style={styles.modalText}>Teléfono: {selectedCliente.telefono}</Text>
                      )}
                      {selectedCliente.email && (
                        <Text style={styles.modalText}>Email: {selectedCliente.email}</Text>
                      )}
                      <Text style={styles.modalText}>Última Visita: {selectedCliente.ultimaVisita || 'No registrada'}</Text>
                    </View>

                    {selectedCliente.cobros && selectedCliente.cobros > 0 && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>Cobros Pendientes</Text>
                        <View style={styles.modalCobrosBadge}>
                          <Text style={styles.modalCobrosText}>
                            {selectedCliente.cobros} cobro{selectedCliente.cobros > 1 ? 's' : ''} pendiente{selectedCliente.cobros > 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.modalNuevaVentaButton}
                      onPress={() => {
                        setIsModalOpen(false);
                        navigation.navigate('NuevaVenta', { clienteSeleccionado: selectedCliente });
                      }}
                    >
                      <LinearGradient
                        colors={['#8bd600', '#c4ff57']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.modalNuevaVentaGradient}
                      >
                        <Text style={styles.modalNuevaVentaText}>+ Nueva Venta</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
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
    padding: 24,
    paddingTop: 20,
    paddingBottom: 60
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
    backgroundColor: 'white',
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
  nuevaVentaButton: {
    borderRadius: 30,
    overflow: 'hidden'
  },
  nuevaVentaGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24
  },
  nuevaVentaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff'
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    padding: 20,
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
    color: '#1a1a1a'
  },
  searchFilterContainer: {
    marginBottom: 24
  },
  searchBox: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 30,
    height: 50,
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 14,
    marginBottom: 16
  },
  searchIcon: {
    fontSize: 14
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a'
  },
  filters: {
    marginBottom: 16
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginRight: 8
  },
  filterChipActive: {
    backgroundColor: '#0C2ABF',
    borderColor: '#0C2ABF'
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#697b92'
  },
  filterTextActive: {
    color: '#ffffff'
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 8
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  sortButtonActive: {
    backgroundColor: '#0C2ABF',
    borderColor: '#0C2ABF'
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#697b92'
  },
  sortButtonTextActive: {
    color: '#ffffff'
  },
  emptyState: {
    padding: 60,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#697b92'
  },
  clienteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    marginBottom: 16,
    position: 'relative'
  },
  clienteCardConCobros: {
    borderWidth: 2,
    borderColor: '#F59F0A'
  },
  cobrosBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#F59F0A',
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#F59F0A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  cobrosBadgeIcon: {
    fontSize: 12,
    marginRight: 6
  },
  cobrosBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff'
  },
  clienteMain: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20
  },
  clienteInfo: {
    flex: 1,
    minWidth: 300
  },
  clienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 10
  },
  clienteIcon: {
    fontSize: 18
  },
  clienteNombre: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 10
  },
  hoyBadge: {
    backgroundColor: '#91e600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  hoyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff'
  },
  clienteEmpresa: {
    fontSize: 13,
    color: '#697b92',
    marginBottom: 12
  },
  clienteDetalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 20
  },
  clienteDetalle: {
    fontSize: 13,
    color: '#697b92'
  },
  clienteNota: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#092090'
  },
  clienteNotaConCobros: {
    backgroundColor: '#FFF7ED',
    borderLeftColor: '#F59F0A'
  },
  clienteNotaText: {
    fontSize: 12,
    color: '#1a1a1a'
  },
  clienteActions: {
    flexDirection: 'column',
    minWidth: 200
  },
  cobrarButton: {
    backgroundColor: '#F59F0A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#F59F0A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  cobrarButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center'
  },
  detallesButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10
  },
  detallesGradient: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center'
  },
  detallesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff'
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center'
  },
  actionButtonRed: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center'
  },
  actionIcon: {
    fontSize: 14
  },
  nuevaVentaClienteButton: {
    borderWidth: 1,
    borderColor: '#092090',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center'
  },
  nuevaVentaClienteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#092090'
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 24
  },
  modalClose: {
    alignSelf: 'flex-end',
    padding: 8
  },
  modalCloseText: {
    fontSize: 28,
    color: '#697b92',
    fontWeight: '300'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  modalIcon: {
    fontSize: 18,
    marginRight: 10
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 24
  },
  modalSection: {
    marginBottom: 24
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12
  },
  modalText: {
    fontSize: 14,
    color: '#697b92',
    marginBottom: 4
  },
  modalCobrosBadge: {
    backgroundColor: '#FFF7ED',
    padding: 12,
    borderRadius: 8
  },
  modalCobrosText: {
    fontSize: 14,
    color: '#F59F0A',
    fontWeight: '600'
  },
  modalNuevaVentaButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: 16
  },
  modalNuevaVentaGradient: {
    paddingVertical: 16,
    alignItems: 'center'
  },
  modalNuevaVentaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#092090'
  }
});
