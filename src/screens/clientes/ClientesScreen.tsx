/**
 * Clientes Screen - CORREGIDO
 * - Solución Scroll: Contenedores con flex: 1 explícito.
 * - Solución Código: Badge más visible y lógica de respaldo.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Linking,
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import { Cliente } from '../../types';

// Interfaz extendida para uso interno en la pantalla
interface ClienteExtendido extends Cliente {
  cobrosPendientes: number;
  codigoVisual: string; // Campo calculado para asegurar que siempre haya código
}

export default function ClientesScreen() {
  const navigation = useNavigation<any>();
  const { clientes, cobros } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<ClienteExtendido | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvincia, setSelectedProvincia] = useState('Todas');
  const [sortBy, setSortBy] = useState<'nombre' | 'ultimaVisita' | 'cobros'>('nombre');

  // 1. PREPARAR DATOS (Calculamos cobros y aseguramos el código)
  const clientesData: ClienteExtendido[] = useMemo(() => {
    return clientes.map(cliente => {
      // Calcular cobros pendientes
      const pendientes = cobros.filter(c => 
        c.estado === 'pendiente' && 
        (c.clienteId === cliente.id || c.cliente.includes(cliente.nombre))
      ).length;

      return {
        ...cliente,
        cobrosPendientes: pendientes,
        // LÓGICA VISUAL DEL CÓDIGO:
        // Si existe cliente.codigo úsalo, si no, usa cliente.id, si no, "S/C"
        codigoVisual: cliente.codigo || cliente.id || 'S/C'
      };
    });
  }, [clientes, cobros]);

  // Obtener provincias únicas para el filtro
  const provincias = useMemo(() => 
    ['Todas', ...Array.from(new Set(clientesData.map(c => c.provincia || 'N/A').filter(Boolean)))],
    [clientesData]
  );

  // 2. FILTRADO Y ORDENAMIENTO
  const filteredClientes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    
    return clientesData
      .filter(cliente => {
        const matchesSearch = 
          cliente.nombre.toLowerCase().includes(term) ||
          (cliente.empresa || '').toLowerCase().includes(term) ||
          cliente.codigoVisual.toLowerCase().includes(term) || // Buscar por el código visual
          (cliente.direccion || '').toLowerCase().includes(term) ||
          (cliente.provincia || '').toLowerCase().includes(term);
          
        const matchesProvincia = selectedProvincia === 'Todas' || cliente.provincia === selectedProvincia;
        return matchesSearch && matchesProvincia;
      })
      .sort((a, b) => {
        if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
        if (sortBy === 'cobros') return b.cobrosPendientes - a.cobrosPendientes;
        // Lógica simple para visita (mejorar si es fecha real)
        return (a.ultimaVisita || '').localeCompare(b.ultimaVisita || '');
      });
  }, [clientesData, searchTerm, selectedProvincia, sortBy]);

  // --- HANDLERS ---
  const handleVerDetalles = (cliente: ClienteExtendido) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
  };

  const handleLlamar = (telefono: string) => {
    if (telefono) Linking.openURL(`tel:${telefono}`);
    else Alert.alert('Aviso', 'Este cliente no tiene teléfono registrado');
  };

  const handleEmail = (email: string) => {
    if (email) Linking.openURL(`mailto:${email}`);
    else Alert.alert('Aviso', 'Este cliente no tiene email registrado');
  };

  // --- RENDER ITEM (Tarjeta Cliente) ---
  const renderClienteItem = ({ item }: { item: ClienteExtendido }) => {
    // Inicial para el avatar
    const inicial = item.nombre.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleVerDetalles(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* 1. Avatar */}
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{inicial}</Text>
          </View>

          {/* 2. Información Central */}
          <View style={styles.infoColumn}>
            <View style={styles.headerRow}>
              {/* CÓDIGO VISIBLE Y DESTACADO */}
              <View style={styles.codeBadge}>
                 <Text style={styles.codeText}>Cód. {item.codigoVisual}</Text>
              </View>
              
              {/* Nombre Principal */}
              <Text style={styles.nameText} numberOfLines={1}>
                {item.nombre}
              </Text>
            </View>

            {/* Empresa / Razón Social */}
            {item.empresa && (
                <Text style={styles.empresaText} numberOfLines={1}>{item.empresa}</Text>
            )}

            {/* Dirección y NIF */}
            <Text style={styles.addressText} numberOfLines={1}>
                NIF: {item.nif || '-'} • {item.direccion || 'Sin dirección'}
            </Text>

            {/* Badge de Cobros (si tiene) */}
            {item.cobrosPendientes > 0 && (
               <View style={styles.debtBadge}>
                  <Text style={styles.debtText}>⚠️ {item.cobrosPendientes} pagos pendientes</Text>
               </View>
            )}
          </View>

          {/* 3. Botón Llamada */}
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => handleLlamar(item.telefono || '')}
          >
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    // IMPORTANTE: scrollable={false} porque usamos FlatList adentro
    <ScreenWithSidebar currentScreen="Clientes" scrollable={false}>
      <View style={styles.container}>
        
        {/* Header Fijo */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
             <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backBtn}>
               <Text style={styles.backIcon}>←</Text>
             </TouchableOpacity>
             <Text style={styles.title}>Clientes</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('NuevaVenta')}
          >
            <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addGradient}
            >
                <Text style={styles.addText}>+ Nueva Venta</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Controles: Buscador y Filtros */}
        <View style={styles.controlsWrapper}>
            {/* Buscador */}
            <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar cliente, código, NIF..."
                    placeholderTextColor="#94a3b8"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                />
            </View>

            {/* Filtros Horizontales */}
            <View style={styles.filtersRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollFilters}>
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
            </View>
            
            {/* Stats rápidas */}
            <Text style={styles.resultsText}>
                {filteredClientes.length} clientes encontrados
            </Text>
        </View>

        {/* LISTA DE CLIENTES (FLEX: 1 ES CRÍTICO PARA EL SCROLL) */}
        <FlatList
          data={filteredClientes}
          keyExtractor={(item) => item.id}
          renderItem={renderClienteItem}
          contentContainerStyle={styles.listContent}
          style={styles.flatList} // Estilo crucial
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>No se encontraron clientes.</Text>
            </View>
          }
        />

        {/* Modal de Detalles */}
        <Modal visible={isModalOpen} animationType="slide" transparent={true} onRequestClose={() => setIsModalOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setIsModalOpen(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
               <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedCliente?.nombre}</Text>
                  <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                     <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
               </View>
               
               <ScrollView style={styles.modalBody}>
                  {selectedCliente && (
                      <>
                        <View style={styles.modalRow}>
                            <Text style={styles.modalLabel}>Código:</Text>
                            <View style={styles.codeBadge}>
                                <Text style={styles.codeText}>{selectedCliente.codigoVisual}</Text>
                            </View>
                        </View>
                        <View style={styles.modalDivider}/>
                        <View style={styles.modalRow}><Text style={styles.modalLabel}>Razón Social:</Text><Text style={styles.modalValue}>{selectedCliente.empresa || '-'}</Text></View>
                        <View style={styles.modalRow}><Text style={styles.modalLabel}>NIF:</Text><Text style={styles.modalValue}>{selectedCliente.nif}</Text></View>
                        <View style={styles.modalRow}><Text style={styles.modalLabel}>Dirección:</Text><Text style={styles.modalValue}>{selectedCliente.direccion}</Text></View>
                        <View style={styles.modalRow}><Text style={styles.modalLabel}>Teléfono:</Text><Text style={styles.modalValue}>{selectedCliente.telefono}</Text></View>
                        <View style={styles.modalRow}><Text style={styles.modalLabel}>Email:</Text><Text style={styles.modalValue}>{selectedCliente.email}</Text></View>
                        <View style={styles.modalRow}><Text style={styles.modalLabel}>Última Visita:</Text><Text style={styles.modalValue}>{selectedCliente.ultimaVisita || 'N/A'}</Text></View>
                        
                        {/* Acciones Modal */}
                        <View style={styles.modalActions}>
                           <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => {setIsModalOpen(false); navigation.navigate('NuevaVenta', {clienteSeleccionado: selectedCliente});}}>
                              <Text style={styles.modalBtnText}>+ Nueva Venta</Text>
                           </TouchableOpacity>
                           <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => {setIsModalOpen(false); navigation.navigate('CobrosList');}}>
                              <Text style={[styles.modalBtnText, {color: '#092090'}]}>Ver Cobros</Text>
                           </TouchableOpacity>
                        </View>
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
  // Layout Principal
  container: {
    flex: 1, // Ocupa todo el alto
    backgroundColor: '#f8fafc'
  },
  flatList: {
    flex: 1 // Permite que la lista crezca y haga scroll
  },
  listContent: {
    padding: 20,
    paddingBottom: 100 // Espacio extra al final
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20, // Ajuste safe area
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 5 },
  backIcon: { fontSize: 28, color: '#64748b' },
  title: { fontSize: 28, fontWeight: '700', color: '#1e293b' },
  
  addButton: { borderRadius: 30, overflow: 'hidden' },
  addGradient: { paddingVertical: 10, paddingHorizontal: 20 },
  addText: { fontSize: 18, fontWeight: '600', color: '#ffffff' },

  // Controles (Search + Filter)
  controlsWrapper: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12
  },
  searchIcon: { fontSize: 18, marginRight: 10, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 17, color: '#1e293b' },
  
  filtersRow: { flexDirection: 'row', marginBottom: 8 },
  scrollFilters: { flexGrow: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  filterChipActive: { backgroundColor: '#092090', borderColor: '#092090' },
  filterText: { fontSize: 17, color: '#64748b', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  
  resultsText: { fontSize: 16, color: '#94a3b8', marginTop: 4 },

  // Tarjeta Cliente
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12, // Espacio entre tarjetas
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  
  avatarContainer: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#bfdbfe'
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#1d4ed8' },
  
  infoColumn: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  
  // ESTILOS DEL CÓDIGO (Más visible)
  codeBadge: {
    backgroundColor: '#092090', // Azul oscuro fuerte
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  
  nameText: { fontSize: 20, fontWeight: '700', color: '#1e293b', flex: 1 },
  empresaText: { fontSize: 17, color: '#64748b', marginBottom: 4 },
  addressText: { fontSize: 16, color: '#94a3b8' },
  
  debtBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#fed7aa' },
  debtText: { fontSize: 15, color: '#c2410c', fontWeight: '600' },

  callButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#bbf7d0'
  },
  callIcon: { fontSize: 20 },

  // Empty State
  emptyState: { padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 44, marginBottom: 10, opacity: 0.5 },
  emptyText: { color: '#94a3b8', fontSize: 18 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', maxWidth: 400, borderRadius: 16, maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
  modalCloseText: { fontSize: 26, color: '#94a3b8' },
  modalBody: { padding: 20 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalLabel: { fontSize: 18, color: '#64748b' },
  modalValue: { fontSize: 18, color: '#1e293b', fontWeight: '500', flex: 1, textAlign: 'right' },
  modalDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  modalActions: { marginTop: 20, gap: 10 },
  modalBtnPrimary: { backgroundColor: '#092090', padding: 14, borderRadius: 8, alignItems: 'center' },
  modalBtnSecondary: { backgroundColor: '#f1f5f9', padding: 14, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '600', fontSize: 19 }
}); 