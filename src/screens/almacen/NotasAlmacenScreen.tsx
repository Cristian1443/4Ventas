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
  const { notasAlmacen } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('Todas');
  const [showModal, setShowModal] = useState(false);
  const [selectedNota, setSelectedNota] = useState<any>(null);

  const tiposNota = ['Todas', 'Carga Camion', 'Descarga Camion', 'Inventario Camion', 'Intercambio Entrada', 'Intercambio Salida'];

  const filteredNotas = notasAlmacen.filter((nota) => {
    const matchesSearch = nota.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         nota.usuario.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = selectedTipo === 'Todas' || nota.tipo === selectedTipo;
    return matchesSearch && matchesTipo;
  });

  // HELPER FECHAS
  const isToday = (dateString: string) => {
      const part = dateString.split(',')[0].trim(); // DD/MM/YYYY
      const [d, m, y] = part.split('/').map(Number);
      const noteDate = new Date(y, m - 1, d);
      const today = new Date();
      return noteDate.setHours(0,0,0,0) === today.setHours(0,0,0,0);
  };

  const isThisWeek = (dateString: string) => {
      const part = dateString.split(',')[0].trim();
      const [d, m, y] = part.split('/').map(Number);
      const noteDate = new Date(y, m - 1, d);
      const today = new Date();
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return noteDate >= oneWeekAgo && noteDate <= today;
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
              <Text style={styles.statValue}>{filteredNotas.length}</Text>
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
              <Text style={styles.emptyText}>No se encontraron notas de almacén</Text>
            </View>
          ) : (
            filteredNotas.map((nota) => (
              <TouchableOpacity
                key={nota.id}
                style={styles.notaCard}
                onPress={() => handleVerDetalle(nota)}
                activeOpacity={0.7}
              >
                <View style={styles.notaMain}>
                  <View style={styles.notaInfo}>
                    <View style={styles.notaHeader}>
                      <Text style={styles.notaIcon}>{getIconForTipo(nota.tipo)}</Text>
                      <Text style={styles.notaTipo}>{nota.tipo}</Text>
                      {isToday(nota.fecha) && (
                        <View style={styles.hoyBadge}>
                          <Text style={styles.hoyBadgeText}>Hoy</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.notaDetalles}>
                      <Text style={styles.notaDetalle}>🕐 {nota.fecha}</Text>
                      <Text style={styles.notaDetalle}>👤 {nota.usuario}</Text>
                      <Text style={[styles.notaDetalle, { color: '#092090', fontWeight: '600' }]}>
                        📅 {nota.articulos} artículos
                      </Text>
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
            ))
          )}
        </ScrollView>

        {/* Modal */}
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
                  <>
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>Tipo de Operación</Text>
                      <Text style={styles.modalSectionValue}>{getIconForTipo(selectedNota.tipo)} {selectedNota.tipo}</Text>
                    </View>
                    <View style={styles.modalSection}><Text style={styles.modalSectionLabel}>ID</Text><Text style={styles.modalSectionValue}>{selectedNota.id}</Text></View>
                    <View style={styles.modalSection}><Text style={styles.modalSectionLabel}>Fecha</Text><Text style={styles.modalSectionValue}>{selectedNota.fecha}</Text></View>
                    <View style={styles.modalSection}><Text style={styles.modalSectionLabel}>Usuario</Text><Text style={styles.modalSectionValue}>{selectedNota.usuario}</Text></View>
                    <View style={styles.modalSection}><Text style={styles.modalSectionLabel}>Artículos</Text><Text style={styles.modalSectionValueLarge}>{selectedNota.articulos}</Text></View>
                    {selectedNota.observaciones ? (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionLabel}>Observaciones</Text>
                        <View style={styles.observacionesBoxModal}><Text style={styles.observacionesTextModal}>{selectedNota.observaciones}</Text></View>
                      </View>
                    ) : null}
                  </>
                )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#697b92' },
  title: { fontSize: 30, fontWeight: '700', color: '#1a1a1a' },
  dashboardButton: { borderRadius: 30, overflow: 'hidden' },
  dashboardGradient: { paddingVertical: 12, paddingHorizontal: 24 },
  dashboardText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, minWidth: 150, padding: 20, backgroundColor: '#f8fafc', borderRadius: 10 },
  statLabel: { fontSize: 16, color: '#697b92', marginBottom: 4 },
  statValue: { fontSize: 30, fontWeight: '700', color: '#1a1a1a' },
  searchFilterContainer: { marginBottom: 24 },
  searchBox: { flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 30, height: 50, alignItems: 'center', paddingHorizontal: 18, gap: 14, marginBottom: 16 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, color: '#1a1a1a' },
  filters: { marginBottom: 16 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 30, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', marginRight: 8 },
  filterChipActive: { backgroundColor: '#0C2ABF', borderColor: '#0C2ABF' },
  filterText: { fontSize: 15, fontWeight: '600', color: '#697b92' },
  filterTextActive: { color: '#ffffff' },
  emptyState: { padding: 60, alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#697b92' },
  notaCard: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 22, marginBottom: 16 },
  notaMain: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'center' },
  notaInfo: { flex: 1, minWidth: 250 },
  notaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 },
  notaIcon: { fontSize: 26 },
  notaTipo: { fontSize: 20, fontWeight: '600', color: '#1a1a1a', marginRight: 10 },
  hoyBadge: { backgroundColor: '#91e600', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  hoyBadgeText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  notaDetalles: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, gap: 16 },
  notaDetalle: { fontSize: 15, color: '#697b92' },
  observacionesBox: { padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#092090', marginTop: 8 },
  observacionesText: { fontSize: 14, color: '#697b92' },
  notaActions: { display: 'flex', alignItems: 'center', gap: 8 },
  detalleButton: { borderRadius: 8, overflow: 'hidden' },
  detalleGradient: { paddingVertical: 9, paddingHorizontal: 18 },
  detalleText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 32, maxWidth: 600, width: '90%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 26, fontWeight: '700', color: '#1a1a1a' },
  modalClose: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 22, color: '#697b92' },
  modalSection: { marginBottom: 16 },
  modalSectionLabel: { fontSize: 16, color: '#697b92', marginBottom: 4 },
  modalSectionValue: { fontSize: 20, fontWeight: '600', color: '#1a1a1a', marginTop: 4 },
  modalSectionValueLarge: { fontSize: 26, fontWeight: '700', color: '#092090', marginTop: 4 },
  observacionesBoxModal: { padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#092090', marginTop: 8 },
  observacionesTextModal: { fontSize: 16, color: '#1a1a1a' },
  modalCloseButton: { borderRadius: 8, overflow: 'hidden', marginTop: 24 },
  modalCloseButtonGradient: { paddingVertical: 12, alignItems: 'center' },
  modalCloseButtonText: { fontSize: 14, fontWeight: '600', color: '#ffffff' }
});