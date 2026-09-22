/**
 * Ventas List Screen - COPIA COMPLETA DEL WEB
 * Muestra lista de CLIENTES con estadísticas y botones para crear notas de venta
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { VentasListaParams } from '../../types/navigation.types';
import { NotaVenta } from '../../models/venta.model';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

const parseNotaFechaTs = (dateStr?: string): number => {
  if (!dateStr) return 0;
  try {
    const part = dateStr.split(',')[0].trim();
    const parts = part.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (day && month && year && year > 1900 && year < 2100) {
        return new Date(year, month - 1, day).getTime();
      }
    }
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  } catch {
    /* ignore */
  }
  return 0;
};

export default function VentasListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const filtroLista = (route.params as VentasListaParams)?.filtroLista;
  const modoNotasPendientes = filtroLista === 'pendientes';

  const { clientes, cobros, notasVenta, currentVendor } = useApp();
  const [isScreenReady, setIsScreenReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'todos' | 'cobros' | 'sin-cobros'>('todos');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [clientPoolLimit, setClientPoolLimit] = useState(300);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsScreenReady(true);
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setClientPoolLimit(300);
  }, [debouncedSearchTerm, filterBy]);

  const useClientPool =
    !modoNotasPendientes && debouncedSearchTerm.length === 0 && filterBy === 'todos';
  const clientesSource = useMemo(
    () => (useClientPool ? clientes.slice(0, clientPoolLimit) : clientes),
    [clientes, clientPoolLimit, useClientPool]
  );

  // Memoizar cobros pendientes por clienteId para búsqueda O(1) en vez de O(n*m)
  const cobrosPendientesPorCliente = useMemo(() => {
    const map = new Map<string, number>();
    const pendientes = cobros.filter(c => c.estado === 'pendiente');
    for (const c of pendientes) {
      // Indexar por clienteId
      if (c.clienteId) {
        map.set(String(c.clienteId), (map.get(String(c.clienteId)) || 0) + 1);
      }
    }
    return map;
  }, [cobros]);

  // Transformar clientes con datos calculados (memoizado)
  const clientesData = useMemo(() => {
    if (!isScreenReady) return [];
    return clientesSource.map(cliente => {
      const cobrosPendientes = cobrosPendientesPorCliente.get(String(cliente.id)) || 0;
      return {
        ...cliente,
        razonSocial: cliente.empresa || '',
        nif: cliente.nif || 'N/A',
        cobrosPendientes,
        poblacion: cliente.localidad || '',
        provincia: cliente.provincia || ''
      };
    });
  }, [clientesSource, cobrosPendientesPorCliente, isScreenReady]);

  const notasPendientesOrdenadas = useMemo(() => {
    if (!modoNotasPendientes || !currentVendor?.id) return [];
    return [...notasVenta]
      .filter(
        n =>
          n.vendedorId === currentVendor.id &&
          n.estado !== 'anulada' &&
          (n.estado === 'pendiente' || n.estado === 'abierta')
      )
      .sort((a, b) => parseNotaFechaTs(b.fecha) - parseNotaFechaTs(a.fecha));
  }, [modoNotasPendientes, notasVenta, currentVendor?.id]);

  const filteredNotasPendientes = useMemo(() => {
    const q = debouncedSearchTerm;
    if (!q.length) return notasPendientesOrdenadas;
    return notasPendientesOrdenadas.filter(n => {
      const idN = String(n.id || '').toLowerCase();
      const cli = (n.cliente || '').toLowerCase();
      const cid = String(n.clienteId || '').toLowerCase();
      return idN.includes(q) || cli.includes(q) || cid.includes(q);
    });
  }, [notasPendientesOrdenadas, debouncedSearchTerm]);

  const { filteredClientes, totalClientes, clientesConCobros, totalCobrosPendientes } = useMemo(() => {
    const searchLower = debouncedSearchTerm;
    const filtered = clientesData.filter(cliente => {
      const codigoNorm = String(cliente.codigo ?? '').toLowerCase();
      const idNorm = String(cliente.id ?? '').toLowerCase();
      const matchesSearch =
        cliente.nombre?.toLowerCase().includes(searchLower) ||
        (cliente.razonSocial || cliente.empresa || '').toLowerCase().includes(searchLower) ||
        (cliente.nif || '').toLowerCase().includes(searchLower) ||
        (cliente.poblacion || '').toLowerCase().includes(searchLower) ||
        (cliente.localidad || '').toLowerCase().includes(searchLower) ||
        (cliente.provincia || '').toLowerCase().includes(searchLower) ||
        (cliente.direccion || '').toLowerCase().includes(searchLower) ||
        (searchLower.length > 0 && (codigoNorm.includes(searchLower) || idNorm.includes(searchLower)));

      const matchesFilter =
        filterBy === 'todos' ||
        (filterBy === 'cobros' && cliente.cobrosPendientes > 0) ||
        (filterBy === 'sin-cobros' && cliente.cobrosPendientes === 0);

      return matchesSearch && matchesFilter;
    });

    const total = clientes.length;
    const conCobros = clientesData.filter(c => c.cobrosPendientes > 0).length;
    const totalCobros = clientesData.reduce((sum, c) => sum + c.cobrosPendientes, 0);

    return {
      filteredClientes: filtered,
      totalClientes: total,
      clientesConCobros: conCobros,
      totalCobrosPendientes: totalCobros
    };
  }, [clientesData, clientes, debouncedSearchTerm, filterBy]);


  const handleNuevaVenta = useCallback((cliente?: any) => {
    if (!currentVendor?.id) {
      return;
    }

    const params: any = { vendorId: currentVendor.id };
    if (cliente) params.clienteSeleccionado = cliente;

    navigation.navigate('NuevaVenta', params);
  }, [currentVendor?.id, navigation]);

  const abrirNotaPendiente = useCallback(
    (nota: NotaVenta) => {
      if (nota.estado === 'abierta') {
        navigation.navigate('NuevaVenta', {
          ventaData: nota,
          vendorId: currentVendor?.id
        });
      } else {
        navigation.navigate('VerNota', { ventaData: nota });
      }
    },
    [navigation, currentVendor?.id]
  );

  const salirListaPendientes = useCallback(() => {
    navigation.navigate('Ventas', {});
  }, [navigation]);

  const renderNotaPendienteCard = useCallback(
    ({ item: nota }: { item: NotaVenta }) => {
      const esBorrador = nota.estado === 'abierta';
      return (
        <TouchableOpacity
          style={styles.notaPendienteCard}
          activeOpacity={0.75}
          onPress={() => abrirNotaPendiente(nota)}
        >
          <View style={styles.notaPendienteTop}>
            <View
              style={[
                styles.notaEstadoBadge,
                { backgroundColor: esBorrador ? '#fde68a' : '#bae6fd' }
              ]}
            >
              <Text
                style={[
                  styles.notaEstadoBadgeText,
                  { color: esBorrador ? '#92400e' : '#0369a1' }
                ]}
              >
                {esBorrador ? 'Borrador abierto' : 'Pendiente (por cobrar)'}
              </Text>
            </View>
            <Text style={styles.notaRefText}>Ref. {nota.id}</Text>
          </View>
          <Text style={styles.notaClienteTitulo} numberOfLines={2}>
            {nota.cliente}
          </Text>
          <View style={styles.notaBottomRow}>
            <Text style={styles.notaFechaMuted}>{nota.fecha || '—'}</Text>
            <Text style={styles.notaTotal}>{nota.precio}</Text>
          </View>
          <Text style={styles.notaTapHint}>Pulsa para abrir · {nota.tipoNota || 'Serie'} ·{' '}
            {nota.formaPago || '—'}
          </Text>
        </TouchableOpacity>
      );
    },
    [abrirNotaPendiente]
  );

  const renderClienteCard = useCallback(({ item: cliente }: { item: any }) => (
    <View style={styles.clienteCard}>
      <View style={styles.clienteHeader}>
        <View style={styles.clienteIdBadge}>
          <Text style={styles.clienteIdText}>{cliente.codigo || cliente.id}</Text>
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
            value={cliente.direccion || '-'}
          />
          {cliente.poblacion ? (
            <InfoField label="Localidad:" value={cliente.poblacion} />
          ) : null}
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
  ), [handleNuevaVenta]);

  const listData = modoNotasPendientes
    ? isScreenReady && currentVendor?.id
      ? filteredNotasPendientes
      : []
    : isScreenReady && currentVendor?.id
      ? filteredClientes
      : [];

  const renderItem = modoNotasPendientes ? renderNotaPendienteCard : renderClienteCard;

  return (
    <ScreenWithSidebar currentScreen="Ventas" scrollable={false}>
      <View style={styles.container}>
        <FlatList
          data={listData}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderItem as any}
          initialNumToRender={12}
          maxToRenderPerBatch={16}
          windowSize={8}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.35}
          onEndReached={() => {
            if (useClientPool && clientPoolLimit < clientes.length) {
              setClientPoolLimit((prev) => Math.min(prev + 300, clientes.length));
            }
          }}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={(
            <React.Fragment>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTop}>
                  <View style={styles.headerTitleRow}>
                    <Text style={styles.headerIcon}>📋</Text>
                    <Text style={styles.headerTitle}>
                      {modoNotasPendientes ? 'Notas pendientes / sin cerrar' : 'Crear Nota de Venta'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => handleNuevaVenta()}
                    activeOpacity={0.8}
                    disabled={!currentVendor?.id}
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
                  {modoNotasPendientes
                    ? 'Solo aparecen tus notas a crédito sin cobrar y borradores abiertos. Pulsa una fila para abrirlas.'
                    : 'Selecciona un cliente para crear una nueva nota de venta'}
                </Text>
              </View>

              {modoNotasPendientes ? (
                <View style={styles.filtroPendientesBanner}>
                  <Text style={styles.filtroPendientesBannerText}>
                    Mostrando {filteredNotasPendientes.length} nota(s) pendiente(s) o abierta(s) de tu rutero.
                  </Text>
                  <TouchableOpacity style={styles.filtroSalirBtn} onPress={salirListaPendientes}>
                    <Text style={styles.filtroSalirBtnText}>Ver todos los clientes</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Stats */}
              {!modoNotasPendientes ? (
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
              ) : (
                <View style={styles.statsContainer}>
                  <View style={[styles.statCard, { minWidth: 240 }]}>
                    <Text style={styles.statLabel}>Pendientes (crédito)</Text>
                    <Text style={[styles.statValue, { color: '#0369a1' }]}>
                      {
                        filteredNotasPendientes.filter(n => n.estado === 'pendiente')
                          .length
                      }
                    </Text>
                  </View>
                  <View style={[styles.statCard, { minWidth: 240 }]}>
                    <Text style={styles.statLabel}>Abiertos (borrador)</Text>
                    <Text style={[styles.statValue, { color: '#b45309' }]}>
                      {filteredNotasPendientes.filter(n => n.estado === 'abierta').length}
                    </Text>
                  </View>
                </View>
              )}

              {/* Search bar and filter */}
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder={
                      modoNotasPendientes
                        ? 'Buscar por ref. nota, cliente o código...'
                        : 'Buscar por código, nombre, NIF, localidad...'
                    }
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
                  {!modoNotasPendientes ? (
                    <TouchableOpacity
                      onPress={() => setShowFilterMenu(!showFilterMenu)}
                      style={styles.filterButton}
                    >
                      <Text style={styles.filterIcon}>⚙️</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {showFilterMenu && !modoNotasPendientes && (
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

                {filterBy !== 'todos' && !modoNotasPendientes && (
                  <TouchableOpacity
                    style={styles.clearFilterButton}
                    onPress={() => setFilterBy('todos')}
                  >
                    <Text style={styles.clearFilterText}>Limpiar filtros ✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {currentVendor?.id ? (
                <Text style={styles.resultsCount}>
                  {modoNotasPendientes
                    ? `Mostrando ${filteredNotasPendientes.length} notas`
                    : `Mostrando ${filteredClientes.length} de ${totalClientes} clientes`}
                </Text>
              ) : null}
            </React.Fragment>
          )}
          ListEmptyComponent={!isScreenReady ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#0C2ABF" />
              <Text style={styles.loadingText}>
                {modoNotasPendientes ? 'Preparando listado…' : 'Cargando clientes...'}
              </Text>
            </View>
          ) : currentVendor?.id ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {modoNotasPendientes
                  ? debouncedSearchTerm.length > 0
                    ? 'Ninguna nota coincide con la búsqueda.'
                    : 'No hay notas pendientes ni borradores abiertos en tu rutero.'
                  : 'No se encontraron clientes'}
              </Text>
              {modoNotasPendientes && !debouncedSearchTerm.length ? (
                <TouchableOpacity style={styles.clearSearchButton} onPress={salirListaPendientes}>
                  <LinearGradient
                    colors={['#092090', '#0C2ABF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.clearSearchButtonGradient}
                  >
                    <Text style={styles.clearSearchButtonText}>Ver todos los clientes</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}
              {!modoNotasPendientes && searchTerm ? (
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
              ) : null}
              {modoNotasPendientes && searchTerm ? (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchTerm('')}
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
              ) : null}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Inicia sesión con un vendedor para crear ventas.</Text>
            </View>
          )}
          ListFooterComponent={useClientPool && currentVendor?.id && clientPoolLimit < clientes.length ? (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => setClientPoolLimit((prev) => Math.min(prev + 300, clientes.length))}
              activeOpacity={0.8}
            >
              <Text style={styles.loadMoreButtonText}>
                Cargar más clientes ({clientes.length - clientPoolLimit} restantes)
              </Text>
            </TouchableOpacity>
          ) : null}
        />
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
  filtroPendientesBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    marginBottom: 20,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12
  },
  filtroPendientesBannerText: {
    flex: 1,
    minWidth: 200,
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e'
  },
  filtroSalirBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#ffffff',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#eab308'
  },
  filtroSalirBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#854d0e'
  },
  notaPendienteCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 22,
    marginBottom: 14,
    borderLeftWidth: 5,
    borderLeftColor: '#0C2ABF'
  },
  notaPendienteTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8
  },
  notaEstadoBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20
  },
  notaEstadoBadgeText: {
    fontSize: 13,
    fontWeight: '700'
  },
  notaRefText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#092090'
  },
  notaClienteTitulo: {
    fontSize: 19,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10
  },
  notaBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  notaFechaMuted: {
    fontSize: 15,
    color: '#94a3b8'
  },
  notaTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  notaTapHint: {
    fontSize: 14,
    color: '#64748b'
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
  loadingState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
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
  },
  loadMoreButton: {
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: '#f0f4ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  loadMoreButtonText: {
    color: '#0C2ABF',
    fontWeight: '700',
    fontSize: 14,
  }
});
