import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

export default function NotasAlmacenScreen() {
  const navigation = useNavigation<any>();
  const { notasAlmacen, articulos } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('Todas');
  const [showModal, setShowModal] = useState(false);
  const [selectedNota, setSelectedNota] = useState<any>(null);

  const tiposNota = ['Todas', 'Carga Camion', 'Descarga Camion', 'Inventario Camion', 'Intercambio Entrada', 'Intercambio Salida'];

  // Helper para obtener datos del artículo del catálogo ERP
  const getArticuloInfo = (articuloId: string) => {
    const art = articulos.find(a => a.id === articuloId || a.codigoCorto === articuloId);
    return art ? { nombre: art.nombre, codigo: art.codigoCorto || articuloId } : { nombre: articuloId, codigo: articuloId };
  };

  const filteredNotas = notasAlmacen.filter((nota) => {
    const matchesSearch = nota.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         nota.usuario.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = selectedTipo === 'Todas' || nota.tipo === selectedTipo;
    return matchesSearch && matchesTipo;
  });

  // Calcular el total real de unidades de una nota
  const getTotalUnidades = (nota: any): number => {
    if (nota.items && Array.isArray(nota.items) && nota.items.length > 0) {
      return nota.items.reduce((sum: number, i: any) => sum + (Number(i.cantidad) || 0), 0);
    }
    return nota.articulos || 0;
  };

  // HELPER FECHAS
  const isToday = (dateString: string) => {
      try {
        const part = dateString.split(',')[0].trim();
        const [d, m, y] = part.split('/').map(Number);
        const noteDate = new Date(y, m - 1, d);
        const today = new Date();
        return noteDate.setHours(0,0,0,0) === today.setHours(0,0,0,0);
      } catch { return false; }
  };

  const isThisWeek = (dateString: string) => {
      try {
        const part = dateString.split(',')[0].trim();
        const [d, m, y] = part.split('/').map(Number);
        const noteDate = new Date(y, m - 1, d);
        const today = new Date();
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return noteDate >= oneWeekAgo && noteDate <= today;
      } catch { return false; }
  };

  const handleVerDetalle = (nota: any) => {
    setSelectedNota(nota);
    setShowModal(true);
  };

  const getIconForTipo = (tipo: string) => {
    switch (tipo) {
      case 'Carga Camion': return '📦';
      case 'Descarga Camion': return '📥';
      case 'Inventario Camion': return '📋';
      case 'Intercambio Entrada': return '⬇️';
      case 'Intercambio Salida': return '⬆️';
      default: return '📄';
    }
  };

  const getColorForTipo = (tipo: string) => {
    switch (tipo) {
      case 'Carga Camion': return '#0C2ABF';
      case 'Descarga Camion': return '#f59e0b';
      case 'Inventario Camion': return '#6366f1';
      case 'Intercambio Entrada': return '#10b981';
      case 'Intercambio Salida': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <ScreenWithSidebar currentScreen="NotasAlmacen" scrollable={false}>
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
                onPress={() => navigation.navigate('Almacen')}
              >
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Notas de Almacén</Text>
            </View>
            <TouchableOpacity
              style={styles.dashboardButton}
              onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dashboardGradient}
              >
                <Text style={styles.dashboardText}>Ver Dashboard</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Notas</Text>
              <Text style={styles.statValue}>{notasAlmacen.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Hoy</Text>
              <Text style={[styles.statValue, { color: '#092090' }]}>
                {notasAlmacen.filter(n => isToday(n.fecha)).length}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Esta Semana</Text>
              <Text style={styles.statValue}>
                {notasAlmacen.filter(n => isThisWeek(n.fecha)).length}
              </Text>
            </View>
          </View>

          {/* Search and filters */}
          <View style={styles.searchFilterContainer}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar notas..."
                placeholderTextColor="#697b92"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
              {tiposNota.map(tipo => (
                <TouchableOpacity
                  key={tipo}
                  style={[styles.filterChip, selectedTipo === tipo && styles.filterChipActive]}
                  onPress={() => setSelectedTipo(tipo)}
                >
                  <Text style={[styles.filterText, selectedTipo === tipo && styles.filterTextActive]}>
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Lista de notas */}
          {filteredNotas.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={styles.emptyText}>No se encontraron notas de almacén</Text>
            </View>
          ) : (
            filteredNotas.map((nota) => {
              const totalUnidades = getTotalUnidades(nota);
              const numArticulosDistintos = nota.items?.length ?? nota.articulos ?? 0;
              const tipoColor = getColorForTipo(nota.tipo);
              return (
                <TouchableOpacity
                  key={nota.id}
                  style={styles.notaCard}
                  onPress={() => handleVerDetalle(nota)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.notaTipoBar, { backgroundColor: tipoColor }]} />
                  <View style={styles.notaMain}>
                    <View style={styles.notaInfo}>
                      <View style={styles.notaHeader}>
                        <Text style={styles.notaIcon}>{getIconForTipo(nota.tipo)}</Text>
                        <Text style={[styles.notaTipo, { color: tipoColor }]}>{nota.tipo}</Text>
                        {isToday(nota.fecha) && (
                          <View style={styles.hoyBadge}>
                            <Text style={styles.hoyBadgeText}>Hoy</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.notaDetalles}>
                        <Text style={styles.notaDetalle}>🕐 {nota.fecha}</Text>
                        <Text style={styles.notaDetalle}>👤 {nota.usuario}</Text>
                      </View>

                      <View style={styles.statsRow}>
                        <View style={styles.statPill}>
                          <Text style={styles.statPillLabel}>Artículos</Text>
                          <Text style={[styles.statPillValue, { color: tipoColor }]}>{numArticulosDistintos}</Text>
                        </View>
                        <View style={styles.statPill}>
                          <Text style={styles.statPillLabel}>Total Uds</Text>
                          <Text style={[styles.statPillValue, { color: tipoColor }]}>{totalUnidades}</Text>
                        </View>
                      </View>

                      {nota.observaciones ? (
                        <View style={styles.observacionesBox}>
                          <Text style={styles.observacionesText} numberOfLines={1}>{nota.observaciones}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.notaActions}>
                      <TouchableOpacity style={styles.detalleButton} onPress={() => handleVerDetalle(nota)}>
                        <LinearGradient colors={['#092090', '#0C2ABF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.detalleGradient}>
                          <Text style={styles.detalleText}>Ver Detalle</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity 
           style={styles.fab}
           onPress={() => navigation.navigate('NuevaNotaAlmacen')}
        >
          <Text style={{ fontSize: 32, color: 'white', lineHeight: 36}}>+</Text>
        </TouchableOpacity>

        {/* Modal Detalle Mejorado */}
        <Modal visible={showModal} animationType="slide" transparent={true} onRequestClose={() => setShowModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setShowModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalle de Nota</Text>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setShowModal(false)}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
              {selectedNota && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={[styles.modalTipoBanner, { backgroundColor: getColorForTipo(selectedNota.tipo) }]}>
                    <Text style={styles.modalTipoBannerText}>{getIconForTipo(selectedNota.tipo)}  {selectedNota.tipo}</Text>
                  </View>

                  <View style={styles.modalMetaRow}>
                    <View style={styles.modalMetaItem}>
                      <Text style={styles.modalSectionLabel}>ID</Text>
                      <Text style={styles.modalSectionValue}>{selectedNota.id}</Text>
                    </View>
                    <View style={styles.modalMetaItem}>
                      <Text style={styles.modalSectionLabel}>Fecha</Text>
                      <Text style={styles.modalSectionValue}>{selectedNota.fecha}</Text>
                    </View>
                    <View style={styles.modalMetaItem}>
                      <Text style={styles.modalSectionLabel}>Usuario</Text>
                      <Text style={styles.modalSectionValue}>{selectedNota.usuario}</Text>
                    </View>
                  </View>

                  {selectedNota.observaciones ? (
                    <View style={styles.observacionesBoxModal}>
                      <Text style={styles.modalSectionLabel}>Observaciones</Text>
                      <Text style={styles.observacionesTextModal}>{selectedNota.observaciones}</Text>
                    </View>
                  ) : null}

                  {/* Lista de artículos de la nota */}
                  <Text style={[styles.modalSectionLabel, { marginTop: 16, marginBottom: 8 }]}>
                    Artículos ({selectedNota.items?.length ?? 0} referencias · {getTotalUnidades(selectedNota)} uds totales)
                  </Text>
                  {selectedNota.items && selectedNota.items.length > 0 ? (
                    selectedNota.items.map((item: any, index: number) => {
                      const info = getArticuloInfo(item.articuloId);
                      return (
                        <View key={`${item.articuloId}-${index}`} style={styles.itemRow}>
                          <View style={styles.itemBadge}>
                            <Text style={styles.itemBadgeText}>{info.codigo}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemNombre}>{item.nombre || info.nombre}</Text>
                            <Text style={styles.itemId}>ID: {item.articuloId}</Text>
                          </View>
                          <View style={styles.itemCantBadge}>
                            <Text style={styles.itemCant}>{item.cantidad}</Text>
                            <Text style={styles.itemUds}>uds</Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyItems}>
                      <Text style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin detalle de artículos registrado</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowModal(false)}>
                    <LinearGradient colors={['#092090', '#0C2ABF']} style={styles.modalCloseButtonGradient}>
                      <Text style={styles.modalCloseButtonText}>Cerrar</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 20, paddingBottom: 80 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#697b92' },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a' },
  dashboardButton: { borderRadius: 30, overflow: 'hidden' },
  dashboardGradient: { paddingVertical: 12, paddingHorizontal: 24 },
  dashboardText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, minWidth: 120, padding: 20, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { fontSize: 14, color: '#697b92', marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: '700', color: '#1a1a1a' },
  searchFilterContainer: { marginBottom: 24 },
  searchBox: { flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 30, height: 50, alignItems: 'center', paddingHorizontal: 18, gap: 14, marginBottom: 16 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, color: '#1a1a1a' },
  filters: { marginBottom: 8 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 30, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', marginRight: 8 },
  filterChipActive: { backgroundColor: '#0C2ABF', borderColor: '#0C2ABF' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#697b92' },
  filterTextActive: { color: '#ffffff' },
  emptyState: { padding: 60, alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#697b92', marginTop: 8 },
  notaCard: { backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14, overflow: 'hidden', flexDirection: 'row' },
  notaTipoBar: { width: 6 },
  notaMain: { flex: 1, padding: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' },
  notaInfo: { flex: 1, minWidth: 220 },
  notaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 10 },
  notaIcon: { fontSize: 24 },
  notaTipo: { fontSize: 18, fontWeight: '700', marginRight: 6 },
  hoyBadge: { backgroundColor: '#91e600', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  hoyBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  notaDetalles: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, gap: 12 },
  notaDetalle: { fontSize: 13, color: '#697b92' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  statPill: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center' },
  statPillLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', textTransform: 'uppercase' },
  statPillValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  observacionesBox: { padding: 10, backgroundColor: '#f8fafc', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#092090', marginTop: 6 },
  observacionesText: { fontSize: 13, color: '#697b92' },
  notaActions: { alignItems: 'center' },
  detalleButton: { borderRadius: 8, overflow: 'hidden' },
  detalleGradient: { paddingVertical: 10, paddingHorizontal: 18 },
  detalleText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  fab: { position: 'absolute', bottom: 28, right: 28, width: 60, height: 60, borderRadius: 30, backgroundColor: '#092090', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 20, padding: 24, maxWidth: 650, width: '95%', maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  modalClose: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 20, color: '#697b92' },
  modalTipoBanner: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, marginBottom: 16 },
  modalTipoBannerText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  modalMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  modalMetaItem: { flex: 1, minWidth: 120, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12 },
  modalSectionLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
  modalSectionValue: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  observacionesBoxModal: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#092090', marginBottom: 14 },
  observacionesTextModal: { fontSize: 15, color: '#1a1a1a', marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 8 },
  itemBadge: { backgroundColor: '#e0e7ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 60, alignItems: 'center' },
  itemBadgeText: { fontSize: 12, fontWeight: '700', color: '#4338ca' },
  itemNombre: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  itemId: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  itemCantBadge: { backgroundColor: '#0C2ABF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center' },
  itemCant: { fontSize: 18, fontWeight: '700', color: '#fff' },
  itemUds: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  emptyItems: { padding: 20, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, marginBottom: 8 },
  modalCloseButton: { borderRadius: 10, overflow: 'hidden', marginTop: 20 },
  modalCloseButtonGradient: { paddingVertical: 14, alignItems: 'center' },
  modalCloseButtonText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});