/**
 * Cobros List Screen - EXACTAMENTE IGUAL A LA WEB
 * Lista de cobros con búsqueda, ordenamiento y estadísticas
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
import SeleccionarClienteModal from '../../components/SeleccionarClienteModal';

export default function CobrosListScreen() {
  const navigation = useNavigation<any>();
  const { cobros, clientes } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'nombre' | 'monto' | 'fecha'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);

  // Calcular totales
  const cobradoTotal = cobros
    .filter(c => c.estado === 'pagado')
    .reduce((sum, cobro) => {
      const monto = parseFloat(cobro.monto.replace(',', '.').replace('€', '').trim() || '0');
      return sum + monto;
    }, 0);

  const totalGeneral = cobros.reduce((sum, cobro) => {
    const monto = parseFloat(cobro.monto.replace(',', '.').replace('€', '').trim() || '0');
    return sum + monto;
  }, 0);

  const porcentaje = totalGeneral > 0 ? Math.round((cobradoTotal / totalGeneral) * 100) : 0;

  // Filtrar clientes con cobros pendientes
  const clientesConCobrosPendientes = clientes
    .filter(cliente =>
      cobros.some(cobro =>
        cobro.estado === 'pendiente' &&
        (cobro.clienteId === cliente.id ||
          cobro.cliente.includes(cliente.nombre) ||
          cobro.cliente.includes(cliente.empresa))
      )
    )
    .map(cliente => {
      const cobroPendiente = cobros.find(cobro =>
        cobro.estado === 'pendiente' &&
        (cobro.clienteId === cliente.id ||
          cobro.cliente.includes(cliente.nombre) ||
          cobro.cliente.includes(cliente.empresa))
      );
      const montoPendiente = cobroPendiente
        ? parseFloat(cobroPendiente.monto.replace(',', '.').replace('€', '').trim() || '0')
        : 0;

      return {
        ...cliente,
        montoPendiente,
        cobroId: cobroPendiente?.id
      };
    });

  // Transformar cobros a formato para mostrar
  const cobrosConFormato = cobros.map(cobro => {
    const monto = parseFloat(cobro.monto.replace(',', '.').replace('€', '').trim() || '0');
    return {
      id: cobro.id,
      nombre: cobro.cliente,
      empresa: cobro.cliente,
      fecha: cobro.fecha,
      monto: monto,
      estado: cobro.estado,
      estadoTexto: cobro.estado === 'pendiente' ? 'Pendiente' : 'Pagado',
      estadoColor: cobro.estado === 'pendiente' ? '#F59F0A' : '#07BC13'
    };
  });

  // Filtrar y ordenar cobros
  const cobrosFiltrados = cobrosConFormato
    .filter(cobro =>
      cobro.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cobro.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cobro.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'nombre') {
        return sortOrder === 'asc' ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre);
      } else if (sortBy === 'monto') {
        return sortOrder === 'asc' ? a.monto - b.monto : b.monto - a.monto;
      } else if (sortBy === 'fecha') {
        return sortOrder === 'asc' ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha);
      }
      return 0;
    });

  return (
    <ScreenWithSidebar currentScreen="Cobros" scrollable={false}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIcon}>📄</Text>
              <Text style={styles.headerTitle}>Cobros</Text>
            </View>
            <TouchableOpacity
              style={styles.newCobranzaButton}
              onPress={() => setShowModal(true)}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newCobranzaGradient}
              >
                <Text style={styles.newCobranzaIcon}>+</Text>
                <Text style={styles.newCobranzaText}>Nueva Cobranza</Text>
                {clientesConCobrosPendientes.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{clientesConCobrosPendientes.length}</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Gestioná tus cobros.</Text>

          {/* Total bar */}
          <View style={styles.totalBar}>
            <Text style={styles.totalText}>
              <Text style={styles.totalTextGradient}>
                Cobrado: {cobradoTotal.toFixed(2).replace('.', ',')} €
              </Text>
              {' '}
              <Text style={styles.totalTextSecondary}>
                de {totalGeneral.toFixed(2).replace('.', ',')} €
              </Text>
              {' '}
              <Text style={styles.totalTextGradient}>
                ({porcentaje}%)
              </Text>
            </Text>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${porcentaje}%` }]}
              />
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar cliente"
              placeholderTextColor="#697b92"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            <View style={styles.sortButtons}>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => {
                  if (sortBy === 'nombre') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('nombre');
                    setSortOrder('asc');
                  }
                }}
              >
                <Text style={[styles.sortIcon, sortBy === 'nombre' && styles.sortIconActive]}>
                  A-Z
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => {
                  if (sortBy === 'fecha') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('fecha');
                    setSortOrder('asc');
                  }
                }}
              >
                <Text style={[styles.sortIcon, sortBy === 'fecha' && styles.sortIconActive]}>
                  📅
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => {
                  if (sortBy === 'monto') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('monto');
                    setSortOrder('desc');
                  }
                }}
              >
                <Text style={[styles.sortIcon, sortBy === 'monto' && styles.sortIconActive]}>
                  €
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cobros list */}
          {cobrosFiltrados.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No se encontraron cobros</Text>
              <Text style={styles.emptyText}>
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'No hay cobros registrados'}
              </Text>
            </View>
          ) : (
            <View style={styles.cobrosList}>
              {cobrosFiltrados.map((cobro, index) => (
                <TouchableOpacity
                  key={cobro.id}
                  style={styles.cobroCard}
                  onPress={() => {
                    // Buscar el cliente completo en la lista de clientes
                    const clienteCompleto = clientes.find(c => 
                      c.id === cobro.id || 
                      c.nombre === cobro.nombre || 
                      c.empresa === cobro.empresa
                    ) || { nombre: cobro.nombre, empresa: cobro.empresa, id: cobro.id };
                    
                    navigation.navigate('Cobros', {
                      clienteSeleccionado: clienteCompleto
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.cobroHeader}>
                    <Text style={styles.cobroIcon}>👤</Text>
                    <View style={styles.cobroInfo}>
                      <Text style={styles.cobroTitle}>
                        {cobro.id} — {cobro.nombre}
                      </Text>
                      <Text style={styles.cobroFecha}>Fecha: {cobro.fecha}</Text>
                    </View>
                  </View>

                  <View style={styles.cobroRight}>
                    <Text style={styles.cobroMonto}>
                      {cobro.monto.toFixed(2).replace('.', ',')} €
                    </Text>
                    <View style={[
                      styles.estadoBadge,
                      cobro.estado === 'pendiente' ? styles.estadoBadgePendiente : styles.estadoBadgePagado
                    ]}>
                      <View style={[styles.estadoDot, { backgroundColor: cobro.estadoColor }]} />
                      <Text style={[styles.estadoText, { color: cobro.estadoColor }]}>
                        {cobro.estadoTexto}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Modal para nueva cobranza */}
      <SeleccionarClienteModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSelect={(cliente) => {
          setShowModal(false);
          navigation.navigate('Cobros', { clienteSeleccionado: cliente });
        }}
        clientes={clientesConCobrosPendientes}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  headerIcon: {
    fontSize: 20
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 24
  },
  newCobranzaButton: {
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative'
  },
  newCobranzaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 24
  },
  newCobranzaIcon: {
    fontSize: 16,
    color: '#ffffff'
  },
  newCobranzaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff'
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F59F0A',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff'
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 28.8,
    color: '#697b92',
    marginBottom: 44
  },
  totalBar: {
    marginBottom: 32
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: '#1a1a1a',
    marginBottom: 14
  },
  totalTextGradient: {
    color: '#092090'
  },
  totalTextSecondary: {
    color: '#697b92'
  },
  progressBar: {
    width: '100%',
    height: 14,
    backgroundColor: '#e2e8f0',
    borderRadius: 15,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 15
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    height: 50,
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 14,
    marginBottom: 32
  },
  searchIcon: {
    fontSize: 14
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#697b92'
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  sortButton: {
    padding: 4
  },
  sortIcon: {
    fontSize: 14,
    color: '#697B92'
  },
  sortIconActive: {
    color: '#0C2ABF'
  },
  cobrosList: {
    gap: 12
  },
  cobroCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 24,
    minHeight: 116,
    position: 'relative'
  },
  cobroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8
  },
  cobroIcon: {
    fontSize: 18
  },
  cobroInfo: {
    flex: 1
  },
  cobroTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    color: '#1a1a1a',
    marginBottom: 8
  },
  cobroFecha: {
    fontSize: 12,
    lineHeight: 16,
    color: '#697b92'
  },
  cobroRight: {
    position: 'absolute',
    right: 24,
    top: 24,
    alignItems: 'flex-end'
  },
  cobroMonto: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
    color: '#092090',
    marginBottom: 8
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20
  },
  estadoBadgePendiente: {
    backgroundColor: '#FEF3C7'
  },
  estadoBadgePagado: {
    backgroundColor: '#D1FAE5'
  },
  estadoDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600'
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 60,
    paddingVertical: 24,
    alignItems: 'center'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 20
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#697b92'
  }
});
