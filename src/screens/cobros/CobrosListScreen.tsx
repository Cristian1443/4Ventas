/**
 * Cobros List Screen - CORREGIDO Y ROBUSTO
 * - Muestra deudas pendientes agrupadas por cliente.
 * - Soluciona problemas de coincidencia de ID (String vs Number).
 * - Scroll arreglado para Web.
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

  // 2. Agrupar Cobros Pendientes por Cliente (LÓGICA MEJORADA)
  const clientesPendientes = useMemo(() => {
    // A. Filtramos solo los cobros pendientes
    const cobrosPendientesRaw = cobros.filter(c => c.estado === 'pendiente');

    // B. Mapeamos los clientes y buscamos sus deudas
    const listaAgrupada = clientes
      .map(cliente => {
        // Buscar notas asociadas a este cliente (Comparación flexible de IDs)
        const susCobros = cobrosPendientesRaw.filter(cobro => {
          const idMatch = String(cobro.clienteId) === String(cliente.id);
          const nameMatch = cobro.cliente && cliente.nombre && cobro.cliente.toLowerCase().includes(cliente.nombre.toLowerCase());
          
          return idMatch || nameMatch;
        });

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
      .filter(c => c !== null) as any[];

    return listaAgrupada;
  }, [cobros, clientes]);

  // 3. Filtrar y Ordenar la lista
  const clientesFiltrados = clientesPendientes
    .filter(cliente =>
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.empresa && cliente.empresa.toLowerCase().includes(searchTerm.toLowerCase())) ||
      String(cliente.id).includes(searchTerm)
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

  const handlePrintOptions = () => {
    Alert.alert('Imprimir', 'Opciones de impresión próximamente...');
  };

  return (
    <ScreenWithSidebar currentScreen="CobrosList" scrollable={false}>
      <View style={styles.container}>
        {/* Header Fijo */}
        <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIcon}>📄</Text>
              <Text style={styles.headerTitle}>Cobros Pendientes</Text>
            </View>
            
            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.printButtonHeader} onPress={handlePrintOptions}>
                  <Text style={styles.printIcon}>🖨️</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.newCobranzaButton} onPress={() => setShowModal(true)}>
                  <LinearGradient colors={['#092090', '#0C2ABF']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.newCobranzaGradient}>
                    <Text style={styles.newCobranzaIcon}>+</Text>
                    <Text style={styles.newCobranzaText}>Nueva Cobranza</Text>
                  </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>

        {/* ScrollView Principal */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.subtitle}>
            Clientes con facturas pendientes de cobro.
          </Text>

          {/* Barra de Progreso */}
          <View style={styles.totalBar}>
            <Text style={styles.totalText}>
              <Text style={styles.totalTextGradient}>Cobrado: {cobradoTotal.toFixed(2).replace('.', ',')} €</Text>
              {' '}<Text style={styles.totalTextSecondary}>de {totalGeneral.toFixed(2).replace('.', ',')} €</Text>
              {' '}<Text style={styles.totalTextGradient}>({porcentaje}%)</Text>
            </Text>
            <View style={styles.progressBar}>
              <LinearGradient colors={['#092090', '#0C2ABF']} style={[styles.progressFill, { width: `${porcentaje}%` }]} />
            </View>
          </View>

          {/* Buscador */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar cliente..."
              placeholderTextColor="#697b92"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {/* Botones de orden */}
            <View style={styles.sortButtons}>
              <TouchableOpacity onPress={() => { setSortBy('nombre'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                <Text style={[styles.sortIcon, sortBy === 'nombre' && styles.sortIconActive]}>A-Z</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setSortBy('monto'); setSortOrder('desc'); }}>
                <Text style={[styles.sortIcon, sortBy === 'monto' && styles.sortIconActive]}>€</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Debug Info (Visible solo si no hay datos para entender qué pasa) */}
          {clientesPendientes.length === 0 && cobros.length > 0 && (
             <View style={{padding: 10, backgroundColor: '#fff7ed', marginBottom: 20, borderRadius: 8}}>
                <Text style={{color: '#c2410c', fontSize: 12}}>
                   Info Depuración: Hay {cobros.length} cobros en el sistema, pero ninguno coincide con los clientes actuales o no están en estado 'pendiente'.
                   Crea una NUEVA venta para probar.
                </Text>
             </View>
          )}

          {/* Lista de Clientes */}
          {clientesFiltrados.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>Todo al día</Text>
              <Text style={styles.emptyText}>
                No hay cobros pendientes para mostrar.
              </Text>
            </View>
          ) : (
            <View style={styles.cobrosList}>
              {clientesFiltrados.map((cliente) => (
                <TouchableOpacity
                  key={cliente.id}
                  style={styles.cobroCard}
                  onPress={() => navigation.navigate('Cobros', { clienteSeleccionado: cliente })}
                  activeOpacity={0.7}
                >
                  <View style={styles.cobroHeader}>
                    <View style={styles.iconBadge}><Text style={styles.cobroIcon}>👤</Text></View>
                    <View style={styles.cobroInfo}>
                        <View style={styles.titleRow}>
                            <Text style={styles.clienteCodigo}>{cliente.codigo || cliente.id}</Text>
                            <Text style={styles.cobroTitle} numberOfLines={1}>{cliente.empresa || cliente.nombre}</Text>
                        </View>
                        <Text style={styles.clienteNombreReal}>{cliente.nombre}</Text>
                    </View>
                  </View>

                  <View style={styles.cobroRight}>
                    <Text style={styles.cobroMonto}>{cliente.deudaTotal.toFixed(2).replace('.', ',')} €</Text>
                    <View style={styles.badgeContainer}>
                        <View style={styles.estadoBadgePendiente}>
                           <View style={styles.estadoDot} />
                           <Text style={styles.estadoText}>{cliente.notasPendientesCount} Nota{cliente.notasPendientesCount > 1 ? 's' : ''}</Text>
                        </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Modal Manual */}
      <SeleccionarClienteModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSelect={(cliente) => {
          setShowModal(false);
          navigation.navigate('Cobros', { clienteSeleccionado: cliente });
        }}
        clientes={clientes}
      />
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { fontSize: 20 },
  headerTitle: { fontSize: 24, fontWeight: '600', color: '#1a1a1a' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  
  printButtonHeader: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  printIcon: { fontSize: 18 },
  newCobranzaButton: { borderRadius: 30, overflow: 'hidden' },
  newCobranzaGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 20 },
  newCobranzaIcon: { fontSize: 16, color: '#ffffff' },
  newCobranzaText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  
  subtitle: { fontSize: 16, color: '#697b92', marginBottom: 24 },
  totalBar: { marginBottom: 32 },
  totalText: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  totalTextGradient: { color: '#092090' },
  totalTextSecondary: { color: '#697b92' },
  progressBar: { width: '100%', height: 10, backgroundColor: '#e2e8f0', borderRadius: 15, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 15 },
  
  searchBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, height: 50, alignItems: 'center', paddingHorizontal: 18, gap: 14, marginBottom: 24 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#697b92' },
  sortButtons: { flexDirection: 'row', gap: 12 },
  sortIcon: { fontSize: 14, color: '#697B92', fontWeight: '600' },
  sortIconActive: { color: '#0C2ABF' },
  
  cobrosList: { gap: 12 },
  cobroCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity:0.05, shadowRadius:2, elevation:1 },
  cobroHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f4ff', alignItems: 'center', justifyContent: 'center' },
  cobroIcon: { fontSize: 18 },
  cobroInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  clienteCodigo: { fontSize: 11, fontWeight: '700', color: '#092090', backgroundColor: '#e0e7ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cobroTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  clienteNombreReal: { fontSize: 13, color: '#697b92' },
  
  cobroRight: { alignItems: 'flex-end' },
  cobroMonto: { fontSize: 18, fontWeight: '700', color: '#092090', marginBottom: 4 },
  badgeContainer: { flexDirection: 'row', gap: 8 },
  estadoBadgePendiente: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20, backgroundColor: '#FEF3C7' },
  estadoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59F0A' },
  estadoText: { fontSize: 11, fontWeight: '700', color: '#F59F0A' },
  
  emptyState: { padding: 60, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 12, borderStyle: 'dashed' },
  emptyIcon: { fontSize: 40, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#697b92', textAlign: 'center' }
});