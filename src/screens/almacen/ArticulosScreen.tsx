/**
 * Artículos Screen - EXACTAMENTE IGUAL A LA WEB
 * Lista de artículos con búsqueda, filtros, ordenamiento, stats y modal de detalles
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

const categorias = ['Todos', 'Fritos', 'Precocinados', 'Verduras', 'Conservas'];

export default function ArticulosScreen() {
  const navigation = useNavigation<any>();
  const { articulos, updateArticulo } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [sortBy, setSortBy] = useState<'nombre' | 'cantidad' | 'stock'>('nombre');
  const [selectedArticulo, setSelectedArticulo] = useState<any>(null);

  const filteredArticulos = articulos
    .filter((articulo) => {
      const matchSearch = articulo.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategoria = categoriaSeleccionada === 'Todos' || articulo.categoria === categoriaSeleccionada;
      return matchSearch && matchCategoria;
    })
    .sort((a, b) => {
      if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
      if (sortBy === 'cantidad') return b.cantidad - a.cantidad;
      if (sortBy === 'stock') {
        const aStockBajo = a.cantidad < (a.stockMinimo || 0);
        const bStockBajo = b.cantidad < (b.stockMinimo || 0);
        return (bStockBajo ? 1 : 0) - (aStockBajo ? 1 : 0);
      }
      return 0;
    });

  const articulosStockBajo = articulos.filter(a => a.cantidad < (a.stockMinimo || 0));
  const totalArticulos = articulos.length;
  const valorTotal = articulos.reduce((sum, a) => {
    const precio = parseFloat(a.precio?.replace(',', '.').replace('€', '').trim() || '0');
    return sum + (precio * a.cantidad);
  }, 0);

  const handleVerMas = (articulo: any) => {
    setSelectedArticulo(articulo);
  };

  const isStockBajo = (articulo: any) => {
    return articulo.cantidad < (articulo.stockMinimo || 0);
  };

  return (
    <ScreenWithSidebar currentScreen="Articulos" scrollable={false}>
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
                onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}
              >
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Artículos</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => Alert.alert('Proveedores', 'Funcionalidad de Proveedores próximamente')}
              >
                <LinearGradient
                  colors={['#092090', '#0C2ABF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.headerActionGradient}
                >
                  <Text style={styles.headerActionText}>📦 Proveedores</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => Alert.alert('Divisiones', 'Funcionalidad de Divisiones próximamente')}
              >
                <LinearGradient
                  colors={['#092090', '#0C2ABF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.headerActionGradient}
                >
                  <Text style={styles.headerActionText}>📊 Divisiones</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Artículos</Text>
              <Text style={styles.statValue}>{totalArticulos}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardWarning]}>
              <Text style={styles.statLabelWarning}>Stock Bajo</Text>
              <Text style={styles.statValueWarning}>{articulosStockBajo.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Valor Inventario</Text>
              <Text style={[styles.statValue, { color: '#092090' }]}>
                {valorTotal.toFixed(2).replace('.', ',')} €
              </Text>
            </View>
          </View>

          {/* Search and filters */}
          <View style={styles.searchFilterContainer}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar artículos..."
                placeholderTextColor="#697b92"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
            
            {/* Filtro por categoría */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
              {categorias.map((categoria) => (
                <TouchableOpacity
                  key={categoria}
                  style={[styles.filterChip, categoriaSeleccionada === categoria && styles.filterChipActive]}
                  onPress={() => setCategoriaSeleccionada(categoria)}
                >
                  <Text style={[styles.filterText, categoriaSeleccionada === categoria && styles.filterTextActive]}>
                    {categoria}
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
                style={[styles.sortButton, sortBy === 'cantidad' && styles.sortButtonActive]}
                onPress={() => setSortBy('cantidad')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'cantidad' && styles.sortButtonTextActive]}>
                  Cantidad
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'stock' && styles.sortButtonActive]}
                onPress={() => setSortBy('stock')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'stock' && styles.sortButtonTextActive]}>
                  Stock Bajo
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de artículos */}
          {filteredArticulos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No se encontraron artículos</Text>
            </View>
          ) : (
            filteredArticulos.map((articulo) => (
              <View
                key={articulo.id}
                style={[
                  styles.articuloCard,
                  isStockBajo(articulo) && styles.articuloCardBajo
                ]}
              >
                <View style={styles.articuloMain}>
                  {/* Info principal */}
                  <View style={styles.articuloInfo}>
                    <View style={styles.articuloHeader}>
                      <Text style={styles.articuloIcon}>📦</Text>
                      <Text style={styles.articuloNombre}>{articulo.nombre}</Text>
                      {isStockBajo(articulo) && (
                        <View style={styles.stockBajoBadge}>
                          <Text style={styles.stockBajoBadgeText}>Stock Bajo</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.articuloMeta}>
                      <View style={styles.categoriaBadge}>
                        <Text style={styles.categoriaBadgeText}>{articulo.categoria}</Text>
                      </View>
                      {articulo.proveedor && (
                        <Text style={styles.articuloProveedor}>
                          Proveedor: {articulo.proveedor}
                        </Text>
                      )}
                    </View>

                    {articulo.precio && (
                      <Text style={styles.articuloPrecio}>
                        Precio: {articulo.precio}
                      </Text>
                    )}
                  </View>

                  {/* Stock y acciones */}
                  <View style={styles.articuloRight}>
                    <View style={styles.stockContainer}>
                      <Text style={styles.stockLabel}>Stock Actual</Text>
                      <Text style={[
                        styles.stockValue,
                        isStockBajo(articulo) && styles.stockValueBajo
                      ]}>
                        {articulo.cantidad}
                      </Text>
                      {articulo.stockMinimo && (
                        <Text style={styles.stockMinimo}>
                          Mínimo: {articulo.stockMinimo}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.verMasButton}
                      onPress={() => handleVerMas(articulo)}
                    >
                      <LinearGradient
                        colors={['#092090', '#0C2ABF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.verMasGradient}
                      >
                        <Text style={styles.verMasText}>👁️ Ver Más</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Modal de detalles */}
        <Modal
          visible={!!selectedArticulo}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedArticulo(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setSelectedArticulo(null)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              {selectedArticulo && (
                <>
                  <Text style={styles.modalTitle}>{selectedArticulo.nombre}</Text>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Categoría</Text>
                    <Text style={styles.modalSectionValue}>{selectedArticulo.categoria}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Stock Actual</Text>
                    <Text style={styles.modalSectionValueLarge}>
                      {selectedArticulo.cantidad} unidades
                    </Text>
                  </View>

                  {selectedArticulo.precio && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>Precio</Text>
                      <Text style={styles.modalSectionValuePrice}>{selectedArticulo.precio}</Text>
                    </View>
                  )}

                  {selectedArticulo.proveedor && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>Proveedor</Text>
                      <Text style={styles.modalSectionValue}>{selectedArticulo.proveedor}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedArticulo(null)}
                  >
                    <LinearGradient
                      colors={['#092090', '#0C2ABF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.modalCloseButtonGradient}
                    >
                      <Text style={styles.modalCloseButtonText}>Cerrar</Text>
                    </LinearGradient>
                  </TouchableOpacity>
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
  headerButtons: {
    flexDirection: 'row',
    gap: 12
  },
  headerActionButton: {
    borderRadius: 10,
    overflow: 'hidden'
  },
  headerActionGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerActionText: {
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
  statCardWarning: {
    backgroundColor: '#fee2e2'
  },
  statLabelWarning: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 4
  },
  statValueWarning: {
    fontSize: 28,
    fontWeight: '700',
    color: '#dc2626'
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
  articuloCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    marginBottom: 16
  },
  articuloCardBajo: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  articuloMain: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  articuloInfo: {
    flex: 1,
    minWidth: 250
  },
  articuloHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 10
  },
  articuloIcon: {
    fontSize: 18
  },
  articuloNombre: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 10
  },
  stockBajoBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  stockBajoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff'
  },
  articuloMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 16
  },
  categoriaBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  categoriaBadgeText: {
    fontSize: 13,
    color: '#697b92'
  },
  articuloProveedor: {
    fontSize: 13,
    color: '#697b92'
  },
  articuloPrecio: {
    fontSize: 16,
    fontWeight: '600',
    color: '#092090',
    marginTop: 8
  },
  articuloRight: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-end',
    minWidth: 180
  },
  stockContainer: {
    alignItems: 'flex-end'
  },
  stockLabel: {
    fontSize: 14,
    color: '#697b92',
    marginBottom: 4
  },
  stockValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  stockValueBajo: {
    color: '#dc2626'
  },
  stockMinimo: {
    fontSize: 12,
    color: '#697b92',
    marginTop: 4
  },
  verMasButton: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  verMasGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  verMasText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff'
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    maxWidth: 500,
    width: '90%'
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20
  },
  modalSection: {
    marginBottom: 12
  },
  modalSectionLabel: {
    fontSize: 14,
    color: '#697b92',
    marginBottom: 4
  },
  modalSectionValue: {
    fontSize: 16,
    color: '#1a1a1a',
    marginTop: 4
  },
  modalSectionValueLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: '#092090',
    marginTop: 4
  },
  modalSectionValuePrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 4
  },
  modalCloseButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 24
  },
  modalCloseButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff'
  }
});
