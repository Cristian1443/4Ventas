/**
 * Ventas List Screen - COPIA COMPLETA DEL WEB
 * Muestra lista de CLIENTES con estadísticas y botones para crear notas de venta
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

export default function VentasListScreen() {
  const navigation = useNavigation<any>();
  const { clientes, cobros } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'todos' | 'cobros' | 'sin-cobros'>('todos');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Función para buscar cobros de un cliente
  const buscarCobrosDeCliente = (cliente: any) => {
    return cobros.filter(c => {
      if (c.estado !== 'pendiente') return false;
      
      // Match por ID
      if (c.clienteId && c.clienteId === cliente.id) {
        return true;
      }
      
      // Fallback: match por nombre
      const nombreCliente = cliente.nombre?.toLowerCase().trim() || '';
      const empresaCliente = cliente.empresa?.toLowerCase().trim() || '';
      const nombreCobro = c.cliente?.toLowerCase().trim() || '';
      
      return nombreCobro.includes(nombreCliente) || 
             nombreCliente.includes(nombreCobro) ||
             nombreCobro.includes(empresaCliente) ||
             empresaCliente.includes(nombreCobro);
    });
  };

  // Transformar clientes con datos calculados
  const clientesData = clientes.map(cliente => {
    const cobrosPendientesArray = buscarCobrosDeCliente(cliente);
    const cobrosPendientes = cobrosPendientesArray.length;

    return {
      ...cliente,
      razonSocial: cliente.empresa || '',
      nif: cliente.nif || 'N/A',
      cobrosPendientes,
      poblacion: cliente.direccion?.split('—')[1]?.trim() || '',
      provincia: ''
    };
  });

  const filteredClientes = clientesData.filter(cliente => {
    const matchesSearch = 
      cliente.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.razonSocial || cliente.empresa || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.nif || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.poblacion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.provincia || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterBy === 'todos' ||
      (filterBy === 'cobros' && cliente.cobrosPendientes > 0) ||
      (filterBy === 'sin-cobros' && cliente.cobrosPendientes === 0);

    return matchesSearch && matchesFilter;
  });

  const totalClientes = clientesData.length;
  const clientesConCobros = clientesData.filter(c => c.cobrosPendientes > 0).length;
  const totalCobrosPendientes = clientesData.reduce((sum, c) => sum + c.cobrosPendientes, 0);

  const handleNuevaVenta = (cliente?: any) => {
    if (cliente) {
      navigation.navigate('NuevaVenta', { clienteSeleccionado: cliente });
    } else {
      navigation.navigate('NuevaVenta');
    }
  };

  return (
    <ScreenWithSidebar currentScreen="Ventas" scrollable={false}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerIcon}>📋</Text>
                <Text style={styles.headerTitle}>Crear Nota de Venta</Text>
              </View>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => handleNuevaVenta()}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#092090', '#0C2ABF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.createButtonGradient}
                >
                  <Text style={styles.createButtonIcon}>+</Text>
                  <Text style={styles.createButtonText}>Crear Nota de Venta</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>
              Selecciona un cliente para crear una nueva nota de venta
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Clientes</Text>
              <Text style={styles.statValue}>{totalClientes}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Con Cobros Pendientes</Text>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                {clientesConCobros}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Cobros</Text>
              <Text style={[styles.statValue, { color: '#092090' }]}>
                {totalCobrosPendientes}
              </Text>
            </View>
          </View>

          {/* Search bar and filter */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre, razón social, NIF, ciudad..."
                placeholderTextColor="#94a3b8"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm ? (
                <TouchableOpacity
                  onPress={() => setSearchTerm('')}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={() => setShowFilterMenu(!showFilterMenu)}
                style={styles.filterButton}
              >
                <Text style={styles.filterIcon}>⚙️</Text>
              </TouchableOpacity>
            </View>

            {showFilterMenu && (
              <View style={styles.filterMenu}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filterBy === 'todos' && styles.filterOptionActive
                  ]}
                  onPress={() => {
                    setFilterBy('todos');
                    setShowFilterMenu(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filterBy === 'todos' && styles.filterOptionTextActive
                  ]}>
                    Todos los clientes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filterBy === 'cobros' && styles.filterOptionActive
                  ]}
                  onPress={() => {
                    setFilterBy('cobros');
                    setShowFilterMenu(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filterBy === 'cobros' && styles.filterOptionTextActive
                  ]}>
                    Con cobros pendientes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filterBy === 'sin-cobros' && styles.filterOptionActive
                  ]}
                  onPress={() => {
                    setFilterBy('sin-cobros');
                    setShowFilterMenu(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filterBy === 'sin-cobros' && styles.filterOptionTextActive
                  ]}>
                    Sin cobros pendientes
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {filterBy !== 'todos' && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => setFilterBy('todos')}
              >
                <Text style={styles.clearFilterText}>Limpiar filtros ✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Results count */}
          <Text style={styles.resultsCount}>
            Mostrando {filteredClientes.length} de {totalClientes} clientes
          </Text>

          {/* Cliente list */}
          {filteredClientes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No se encontraron clientes</Text>
              {searchTerm && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => {
                    setSearchTerm('');
                    setFilterBy('todos');
                  }}
                >
                  <LinearGradient
                    colors={['#092090', '#0C2ABF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.clearSearchButtonGradient}
                  >
                    <Text style={styles.clearSearchButtonText}>Limpiar búsqueda</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.clientesList}>
              {filteredClientes.map((cliente) => (
                <View key={cliente.id} style={styles.clienteCard}>
                  <View style={styles.clienteHeader}>
                    <View style={styles.clienteIdBadge}>
                      <Text style={styles.clienteIdText}>{cliente.id}</Text>
                    </View>
                    <Text style={styles.clienteNombre}>{cliente.nombre}</Text>
                    <View style={styles.clienteMeta}>
                      <View style={styles.clienteMetaItem}>
                        <Text style={styles.clienteMetaLabel}>Razón Social:</Text>
                        <Text style={styles.clienteMetaValue}>
                          {cliente.razonSocial || '-'}
                        </Text>
                      </View>
                      <View style={styles.clienteMetaItem}>
                        <Text style={styles.clienteMetaLabel}>Cobros Pendientes:</Text>
                        <Text style={[
                          styles.clienteMetaValue,
                          { color: cliente.cobrosPendientes > 0 ? '#f59e0b' : '#10b981' }
                        ]}>
                          {cliente.cobrosPendientes}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.clienteInfo}>
                    <View style={styles.clienteInfoRow}>
                      <InfoField label="NIF:" value={cliente.nif || '-'} />
                      <InfoField 
                        label="Dirección:" 
                        value={`${cliente.direccion || ''}, ${cliente.poblacion || ''}, ${cliente.provincia || ''}`.replace(/^,\s*|,\s*$/g, '') || '-'} 
                      />
                    </View>
                    <View style={styles.clienteInfoRow}>
                      <InfoField label="Teléfono:" value={cliente.telefono || '-'} />
                      <InfoField label="E-mail:" value={cliente.email || '-'} />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.nuevaNotaButton}
                    onPress={() => handleNuevaVenta(cliente)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#092090', '#0C2ABF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nuevaNotaButtonGradient}
                    >
                      <Text style={styles.nuevaNotaButtonIcon}>+</Text>
                      <Text style={styles.nuevaNotaButtonText}>Nueva Nota de Venta</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenWithSidebar>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoField}>
      <Text style={styles.infoFieldLabel}>{label}</Text>
      <Text style={styles.infoFieldValue}>{value}</Text>
    </View>
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
    marginBottom: 32
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 16
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  headerIcon: {
    fontSize: 22
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  createButton: {
    borderRadius: 30,
    overflow: 'hidden'
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 24
  },
  createButtonIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600'
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff'
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#697b92'
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24
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
    fontSize: 16,
    color: '#697b92',
    marginBottom: 4
  },
  statValue: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  searchContainer: {
    marginBottom: 28,
    gap: 12
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 30,
    height: 50,
    paddingHorizontal: 18,
    gap: 14
  },
  searchIcon: {
    fontSize: 18
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '400',
    color: '#1a1a1a',
    padding: 0
  },
  clearButton: {
    padding: 4
  },
  clearIcon: {
    fontSize: 18,
    color: '#697b92'
  },
  filterButton: {
    padding: 4
  },
  filterIcon: {
    fontSize: 18
  },
  filterMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5
  },
  filterOption: {
    padding: 12,
    borderRadius: 8
  },
  filterOptionActive: {
    backgroundColor: '#f0f4ff'
  },
  filterOptionText: {
    fontSize: 18,
    color: '#1a1a1a',
    fontWeight: '400'
  },
  filterOptionTextActive: {
    color: '#092090',
    fontWeight: '600'
  },
  clearFilterButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 30,
    alignSelf: 'flex-start'
  },
  clearFilterText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#697b92'
  },
  resultsCount: {
    fontSize: 18,
    color: '#697b92',
    marginBottom: 16
  },
  clientesList: {
    gap: 12
  },
  clienteCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 36,
    paddingVertical: 26,
    minHeight: 116,
    position: 'relative'
  },
  clienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap'
  },
  clienteIdBadge: {
    paddingVertical: 3,
    paddingHorizontal: 5,
    backgroundColor: '#91e600',
    borderRadius: 5
  },
  clienteIdText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#1a1a1a',
    lineHeight: 14
  },
  clienteNombre: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 20
  },
  clienteMeta: {
    flexDirection: 'row',
    gap: 16,
    marginLeft: 8,
    flexWrap: 'wrap'
  },
  clienteMetaItem: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  clienteMetaLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C2ABF'
  },
  clienteMetaValue: {
    fontSize: 16,
    fontWeight: '400',
    color: '#697b92',
    lineHeight: 18
  },
  clienteInfo: {
    gap: 8
  },
  clienteInfoRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap'
  },
  infoField: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  infoFieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C2ABF',
    lineHeight: 18
  },
  infoFieldValue: {
    fontSize: 16,
    fontWeight: '400',
    color: '#697b92',
    lineHeight: 18
  },
  nuevaNotaButton: {
    position: 'absolute',
    top: 45,
    right: 32,
    borderRadius: 30,
    overflow: 'hidden'
  },
  nuevaNotaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 10
  },
  nuevaNotaButtonIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600'
  },
  nuevaNotaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff'
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12
  },
  emptyStateText: {
    fontSize: 18,
    color: '#697b92'
  },
  clearSearchButton: {
    marginTop: 16,
    borderRadius: 30,
    overflow: 'hidden'
  },
  clearSearchButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  clearSearchButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff'
  }
});
