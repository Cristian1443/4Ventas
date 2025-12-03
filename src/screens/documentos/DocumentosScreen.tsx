import React, { useState } from 'react';
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

export default function DocumentosScreen() {
  const navigation = useNavigation<any>();
  const { documentos, addDocumento, deleteDocumento } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('Todos');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const categorias = ['Todos', 'Catálogos', 'Contratos', 'Facturas', 'Informes', 'Otros'];

  // Helper fecha
  const getFechaHoy = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const handleUploadDocument = async () => {
    Alert.alert(
      'Subir Documento',
      'Selecciona el tipo de archivo (Simulación)',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'PDF (Ejemplo)',
          onPress: async () => {
            const nuevoDoc = {
              id: `DOC${Date.now()}`, // ID único temporal
              nombre: `Contrato_Cliente_${Math.floor(Math.random()*100)}.pdf`,
              categoria: 'Contratos',
              fecha: getFechaHoy(),
              tamano: '1.2 MB',
              tipo: 'pdf' as const
            };
            await addDocumento(nuevoDoc);
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
          }
        },
        {
          text: 'Imagen (Cámara)',
          onPress: async () => {
            // Aquí iría la lógica de ImagePicker real
            const nuevoDoc = {
              id: `DOC${Date.now()}`,
              nombre: `Foto_Visita_${Date.now()}.jpg`,
              categoria: 'Otros',
              fecha: getFechaHoy(),
              tamano: '2.5 MB',
              tipo: 'image' as const
            };
            await addDocumento(nuevoDoc);
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
          }
        }
      ]
    );
  };

  const handleDeleteDocument = (id: string) => {
    Alert.alert(
      'Eliminar Documento',
      '¿Estás seguro de eliminar este documento del sistema?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteDocumento(id) }
      ]
    );
  };

  const handleDownloadDocument = async (doc: any) => {
    Alert.alert('Descargar', `Descargando archivo: ${doc.nombre}\n(Simulación de descarga offline)`);
  };

  const filteredDocumentos = documentos.filter(doc => {
    const matchesSearch = doc.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = selectedCategoria === 'Todos' || doc.categoria === selectedCategoria;
    return matchesSearch && matchesCategoria;
  });

  const getIconForType = (tipo: 'pdf' | 'image' | 'doc') => {
    switch (tipo) {
      case 'pdf':
        return <View style={[styles.docTypeIcon, { backgroundColor: '#dc2626' }]}><Text style={styles.docTypeIconText}>PDF</Text></View>;
      case 'image':
        return <View style={[styles.docTypeIcon, { backgroundColor: '#10b981' }]}><Text style={styles.docTypeIconText}>IMG</Text></View>;
      case 'doc':
      default:
        return <View style={[styles.docTypeIcon, { backgroundColor: '#2563eb' }]}><Text style={styles.docTypeIconText}>DOC</Text></View>;
    }
  };

  return (
    <ScreenWithSidebar currentScreen="Documentos" scrollable={false}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Main')}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Documentos</Text>
            </View>
            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadDocument}>
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.uploadGradient}
              >
                <Text style={styles.uploadIcon}>📤</Text>
                <Text style={styles.uploadText}>Subir Documento</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Success message */}
          {showSuccessMessage && (
            <View style={styles.successMessage}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>¡Documento subido y encolado para sincronización!</Text>
            </View>
          )}

          {/* Search and filters */}
          <View style={styles.searchFiltersContainer}>
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar documentos..."
                placeholderTextColor="#697b92"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
              {categorias.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, selectedCategoria === cat && styles.filterChipActive]}
                  onPress={() => setSelectedCategoria(cat)}
                >
                  <Text style={[styles.filterText, selectedCategoria === cat && styles.filterTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Stats */}
          <View style={styles.statsCard}>
            <View>
              <Text style={styles.statsLabel}>
                Total Documentos {selectedCategoria !== 'Todos' ? `(${selectedCategoria})` : ''}
              </Text>
              <Text style={styles.statsValue}>{filteredDocumentos.length}</Text>
            </View>
            <View style={styles.statsRight}>
              <Text style={styles.statsLabel}>Categorías</Text>
              <Text style={styles.statsCount}>{categorias.length - 1}</Text>
            </View>
          </View>

          {/* Documents grid */}
          {filteredDocumentos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>No se encontraron documentos</Text>
            </View>
          ) : (
            <View style={styles.documentsGrid}>
              {filteredDocumentos.map((doc) => (
                <View key={doc.id} style={styles.docCard}>
                  <View style={styles.docHeader}>
                    <View style={styles.docIconContainer}>
                      {getIconForType(doc.tipo)}
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docNombre} numberOfLines={1}>
                        {doc.nombre}
                      </Text>
                      <View style={styles.docMeta}>
                        <View style={styles.categoriaBadge}>
                          <Text style={styles.categoriaBadgeText}>{doc.categoria}</Text>
                        </View>
                      </View>
                      <View style={styles.docDetails}>
                        <Text style={styles.docDetail}>{doc.fecha}</Text>
                        <Text style={styles.docSeparator}>•</Text>
                        <Text style={styles.docDetail}>{doc.tamano}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.docActions}>
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={() => handleDownloadDocument(doc)}
                    >
                      <Text style={styles.downloadIcon}>⬇</Text>
                      <Text style={styles.downloadText}>Descargar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteDocument(doc.id)}
                    >
                      <Text style={styles.deleteIcon}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 40, paddingHorizontal: 60, maxWidth: 1400, alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: '#697b92' },
  title: { fontSize: 32, fontWeight: '700', color: '#1a1a1a' },
  uploadButton: { borderRadius: 30, overflow: 'hidden' },
  uploadGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24 },
  uploadIcon: { fontSize: 20 },
  uploadText: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  successMessage: { backgroundColor: '#91e600', borderRadius: 8, padding: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  successIcon: { fontSize: 24, color: '#ffffff' },
  successText: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  searchFiltersContainer: { gap: 16, marginBottom: 24 },
  searchBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 30, height: 50, alignItems: 'center', paddingHorizontal: 18, gap: 14, minWidth: 300 },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: 18, color: '#1a1a1a' },
  filters: { flexDirection: 'row' },
  filterChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 30, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', marginRight: 8 },
  filterChipActive: { backgroundColor: '#0C2ABF', borderColor: '#0C2ABF' },
  filterText: { fontSize: 17, fontWeight: '600', color: '#697b92' },
  filterTextActive: { color: '#ffffff' },
  statsCard: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  statsLabel: { fontSize: 18, color: '#697b92', marginBottom: 4 },
  statsValue: { fontSize: 32, fontWeight: '700', color: '#092090' },
  statsRight: { alignItems: 'flex-end' },
  statsCount: { fontSize: 32, fontWeight: '700', color: '#1a1a1a' },
  documentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  docCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 22, width: '100%', minWidth: 300, maxWidth: 400, flex: 1 },
  docHeader: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  docIconContainer: { flexShrink: 0 },
  docInfo: { flex: 1, minWidth: 0 },
  docNombre: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  docMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
  categoriaBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  categoriaBadgeText: { fontSize: 15, color: '#697b92' },
  docDetails: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  docDetail: { fontSize: 16, color: '#697b92' },
  docSeparator: { fontSize: 16, color: '#697b92' },
  docActions: { flexDirection: 'row', gap: 8 },
  downloadButton: { flex: 1, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  downloadIcon: { fontSize: 16 },
  downloadText: { fontSize: 16, fontWeight: '600', color: '#092090' },
  deleteButton: { paddingVertical: 9, paddingHorizontal: 14, backgroundColor: '#fee2e2', borderRadius: 8 },
  deleteIcon: { fontSize: 16 },
  emptyState: { padding: 60, alignItems: 'center', width: '100%' },
  emptyIcon: { fontSize: 76, marginBottom: 20 },
  emptyText: { fontSize: 20, color: '#697b92' },
  docTypeIcon: { width: 36, height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  docTypeIconText: { fontSize: 14, fontWeight: 'bold', color: '#ffffff' }
});