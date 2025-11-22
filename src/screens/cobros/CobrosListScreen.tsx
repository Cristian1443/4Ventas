/**
 * Cobros List Screen
 * Muestra lista de CLIENTES con deuda pendiente agrupada.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert
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
  const [sortBy, setSortBy] = useState<'nombre' | 'monto' | 'notas'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);

  // 1. Calcular totales globales
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

  // 2. Agrupar Cobros Pendientes por Cliente
  const clientesPendientes = useMemo(() => {
    // Filtramos solo los cobros pendientes
    const cobrosPendientesRaw = cobros.filter(c => c.estado === 'pendiente');

    // Mapeamos los clientes y calculamos sus totales
    const listaAgrupada = clientes
      .map(cliente => {
        // Buscar notas asociadas a este cliente
        const susCobros = cobrosPendientesRaw.filter(cobro => 
          (cobro.clienteId === cliente.id) ||
          (cobro.cliente && cobro.cliente.includes(cliente.nombre)) ||
          (cobro.cliente && cobro.cliente.includes(cliente.empresa))
        );

        if (susCobros.length === 0) return null;

        // Calcular total de deuda del cliente
        const deudaTotal = susCobros.reduce((sum, cobro) => {
           const monto = parseFloat(cobro.monto.replace(',', '.').replace('€', '').trim() || '0');
           return sum + monto;
        }, 0);

        return {
          ...cliente,
          notasPendientesCount: susCobros.length,
          deudaTotal: deudaTotal
        };
      })
      .filter(c => c !== null) as any[]; // Eliminar clientes sin deuda

    return listaAgrupada;
  }, [cobros, clientes]);

  // 3. Filtrar y Ordenar la lista agrupada
  const clientesFiltrados = clientesPendientes
    .filter(cliente =>
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'nombre') {
        comparison = a.nombre.localeCompare(b.nombre);
      } else if (sortBy === 'monto') {
        comparison = a.deudaTotal - b.deudaTotal;
      } else if (sortBy === 'notas') {
        comparison = a.notasPendientesCount - b.notasPendientesCount;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Función de impresión (Simulada)
  const handlePrintOptions = () => {
    Alert.alert(
      'Imprimir Listado de Cobros',
      'Seleccione una opción:',
      [
        {
          text: 'Listado Total (Todos)',
          onPress: () => Alert.alert('Imprimiendo', 'Imprimiendo listado general de pendientes...')
        },
        {
          text: 'Cancelar',
          style: 'cancel'
        }
      ]
    );
  };

  const handlePrintCliente = (cliente: any) => {
    Alert.alert('Imprimir', `Imprimiendo extracto de pendientes para: ${cliente.nombre}`);
  };

  return (
    <ScreenWithSidebar currentScreen="CobrosList" scrollable={false}>
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
              {/* Cambio de título solicitado */}
              <Text style={styles.headerTitle}>Cobros Pendientes</Text>
            </View>
            
            <View style={styles.headerActions}>
                {/* Botón de Impresión General */}
                <TouchableOpacity
                  style={styles.printButtonHeader}
                  onPress={handlePrintOptions}
                >
                  <Text style={styles.printIcon}>🖨️</Text>
                </TouchableOpacity>

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
                  </LinearGradient>
                </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.subtitle}>
            Clientes con facturas pendientes de cobro.
          </Text>

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
              placeholder="Buscar cliente..."
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
                  if (sortBy === 'notas') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('notas');
                    setSortOrder('desc'); // Default desc para ver quien tiene mas notas
                  }
                }}
              >
                <Text style={[styles.sortIcon, sortBy === 'notas' && styles.sortIconActive]}>
                  🔢
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => {
                  if (sortBy === 'monto') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('monto');
                    setSortOrder('desc'); // Default desc para ver mayor deuda
                  }
                }}
              >
                <Text style={[styles.sortIcon, sortBy === 'monto' && styles.sortIconActive]}>
                  €
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista agrupada por clientes */}
          {clientesFiltrados.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>Todo al día</Text>
              <Text style={styles.emptyText}>
                {searchTerm ? 'No se encontraron clientes con esa búsqueda' : 'No hay clientes con cobros pendientes'}
              </Text>
            </View>
          ) : (
            <View style={styles.cobrosList}>
              {clientesFiltrados.map((cliente) => (
                <TouchableOpacity
                  key={cliente.id}
                  style={styles.cobroCard}
                  onPress={() => {
                    // Navegar al detalle para ver el desglose y cobrar
                    navigation.navigate('Cobros', {
                      clienteSeleccionado: cliente
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.cobroHeader}>
                    <View style={styles.iconBadge}>
                         <Text style={styles.cobroIcon}>👤</Text>
                    </View>
                   
                    <View style={styles.cobroInfo}>
                        <View style={styles.titleRow}>
                            <Text style={styles.clienteCodigo}>{cliente.id}</Text>
                            <Text style={styles.cobroTitle} numberOfLines={1}>
                                {cliente.empresa || cliente.nombre}
                            </Text>
                        </View>
                        <Text style={styles.clienteNombreReal}>{cliente.nombre}</Text>
                    </View>
                  </View>

                  <View style={styles.cobroRight}>
                    <Text style={styles.cobroMonto}>
                      {cliente.deudaTotal.toFixed(2).replace('.', ',')} €
                    </Text>
                    <View style={styles.badgeContainer}>
                        <View style={styles.estadoBadgePendiente}>
                        <View style={styles.estadoDot} />
                        <Text style={styles.estadoText}>
                            {cliente.notasPendientesCount} Nota{cliente.notasPendientesCount > 1 ? 's' : ''}
                        </Text>
                        </View>
                        
                        {/* Botón rápido de imprimir solo este cliente */}
                        <TouchableOpacity 
                            style={styles.miniPrintButton}
                            onPress={() => handlePrintCliente(cliente)}
                        >
                             <Text style={{fontSize: 14}}>🖨️</Text>
                        </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Modal para nueva cobranza manual */}
      <SeleccionarClienteModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSelect={(cliente) => {
          setShowModal(false);
          navigation.navigate('Cobros', { clienteSeleccionado: cliente });
        }}
        clientes={clientesPendientes}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
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
  printButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  printIcon: {
      fontSize: 18
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
    paddingVertical: 10,
    paddingHorizontal: 20
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
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#697b92',
    marginBottom: 24
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
    color: '#0C2ABF',
    fontWeight: 'bold'
  },
  cobrosList: {
    gap: 12
  },
  cobroCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 20,
    minHeight: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cobroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  iconBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#f0f4ff',
      alignItems: 'center',
      justifyContent: 'center'
  },
  cobroIcon: {
    fontSize: 18
  },
  cobroInfo: {
    flex: 1
  },
  titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4
  },
  clienteCodigo: {
      fontSize: 12,
      fontWeight: '700',
      color: '#092090',
      backgroundColor: '#e0e7ff',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4
  },
  cobroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1
  },
  clienteNombreReal: {
    fontSize: 13,
    color: '#697b92'
  },
  cobroRight: {
    alignItems: 'flex-end',
    marginLeft: 10
  },
  cobroMonto: {
    fontSize: 20,
    fontWeight: '700',
    color: '#092090',
    marginBottom: 6
  },
  badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
  },
  estadoBadgePendiente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#FEF3C7'
  },
  estadoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59F0A'
  },
  estadoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59F0A'
  },
  miniPrintButton: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: '#f1f5f9'
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 60,
    paddingVertical: 40,
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