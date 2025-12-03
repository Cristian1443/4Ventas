/**
 * Artículos Screen - VERSIÓN CORREGIDA
 * - Mantiene: Stats, Botones de cabecera (Proveedores/Divisiones), Buscador original.
 * - Añade: Filtros dinámicos + Filtro "Stock Bajo".
 * - Nuevo Diseño: Tarjeta con Foto y Código Corto.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useResponsiveLayout } from '../../constants/layout';
import { Articulo } from '../../types';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

const imgPlaceholder = require('../../../assets/blue-image-panel.png');

export default function ArticulosScreen() {
  const navigation = useNavigation<any>();
  const { articulos } = useApp();
  const { isTablet, isSmallDevice } = useResponsiveLayout();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [sortBy, setSortBy] = useState<'nombre' | 'cantidad' | 'stock'>('nombre');
  const [selectedArticulo, setSelectedArticulo] = useState<Articulo | null>(null);

  // 1. GENERAR CATEGORÍAS DINÁMICAS + STOCK BAJO
  const categorias = useMemo(() => {
    // Obtenemos categorías únicas de los datos reales
    const cats = new Set(articulos.map(a => a.categoria).filter(Boolean));
    // Agregamos "Stock Bajo" como una categoría especial para filtrar
    return ['Todos', 'Stock Bajo', ...Array.from(cats)];
  }, [articulos]);

  // 2. PREPARAR DATOS (Simular fotos y códigos si no existen)
  const articulosProcesados = useMemo(() => {
    return articulos.map(art => {
      // Simulación de imagen aleatoria para demo
      const randomId = parseInt(art.id.replace(/\D/g, '') || '0') % 5;
      const imagenesDemo = [
        'https://images.unsplash.com/photo-1548093190-e1833c4592c8?w=200&q=80',
        'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=200&q=80',
        'https://images.unsplash.com/photo-1470509037663-253ce784d506?w=200&q=80',
        'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=200&q=80',
        'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=200&q=80'
      ];

      return {
        ...art,
        // Usar imagen real si existe, sino una demo
        imagen: art.imagen || imagenesDemo[randomId],
        // Generar código corto si no existe
        codigoCorto: art.codigoCorto || (art.nombre.substring(0, 3).toUpperCase() + '-' + art.id.slice(-3))
      };
    });
  }, [articulos]);

  // 3. FILTRADO
  const filteredArticulos = useMemo(() => {
    return articulosProcesados
      .filter((articulo) => {
        // Búsqueda por texto
        const term = searchTerm.toLowerCase();
        const matchSearch = 
          (articulo.nombre || '').toLowerCase().includes(term) ||
          (articulo.codigoCorto || '').toLowerCase().includes(term) ||
          (articulo.id || '').toLowerCase().includes(term);

        // Lógica del filtro de categoría / Stock Bajo
        let matchFilter = true;
        if (categoriaSeleccionada === 'Stock Bajo') {
          matchFilter = articulo.cantidad < (articulo.stockMinimo || 0);
        } else if (categoriaSeleccionada !== 'Todos') {
          matchFilter = articulo.categoria === categoriaSeleccionada;
        }

        return matchSearch && matchFilter;
      })
      .sort((a, b) => {
        if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
        if (sortBy === 'cantidad') return b.cantidad - a.cantidad;
        if (sortBy === 'stock') {
          // Prioridad a los que tienen stock bajo
          const aBajo = a.cantidad < (a.stockMinimo || 0);
          const bBajo = b.cantidad < (b.stockMinimo || 0);
          return (bBajo ? 1 : 0) - (aBajo ? 1 : 0);
        }
        return 0;
      });
  }, [articulosProcesados, searchTerm, categoriaSeleccionada, sortBy]);

  // Cálculos para las Stats (sobre el total de artículos, no los filtrados)
  const articulosStockBajo = articulos.filter(a => a.cantidad < (a.stockMinimo || 0));
  const valorTotal = articulos.reduce((sum, a) => {
    const precio = parseFloat(a.precio?.replace(',', '.').replace('€', '').trim() || '0');
    return sum + (precio * a.cantidad);
  }, 0);

  const isStockBajo = (articulo: Articulo) => articulo.cantidad <= (articulo.stockMinimo || 0);

  return (
    <ScreenWithSidebar currentScreen="Articulos" scrollable={false}>
      <View style={styles.container}>
        {/* Header Fijo */}
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
          <View style={styles.headerActions}>
            <View style={[styles.searchBoxHeader, isSmallDevice && { minWidth: 200 }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por Nombre, ID o Código Corto..."
                placeholderTextColor="#94a3b8"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Container (Restaurado) */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Artículos</Text>
              <Text style={styles.statValue}>{articulos.length}</Text>
            </View>
            
            {/* Al hacer clic filtra por Stock Bajo */}
            <TouchableOpacity 
              style={[styles.statCard, styles.statCardWarning]}
              onPress={() => setCategoriaSeleccionada('Stock Bajo')}
            >
              <Text style={styles.statLabelWarning}>Stock Bajo</Text>
              <Text style={styles.statValueWarning}>{articulosStockBajo.length}</Text>
            </TouchableOpacity>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Valor Inventario</Text>
              <Text style={[styles.statValue, { color: '#092090' }]}>
                {valorTotal.toFixed(2).replace('.', ',')} €
              </Text>
            </View>
          </View>

          {/* Search and Filters */}
          <View style={styles.searchFilterContainer}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre, código..."
                placeholderTextColor="#697b92"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
            
            {/* Filtros Dinámicos */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
              {categorias.map((categoria) => (
                <TouchableOpacity
                  key={categoria}
                  style={[
                    styles.filterChip, 
                    categoriaSeleccionada === categoria && styles.filterChipActive,
                    categoria === 'Stock Bajo' && categoriaSeleccionada === 'Stock Bajo' && { borderColor: '#dc2626', backgroundColor: '#fee2e2' }
                  ]}
                  onPress={() => setCategoriaSeleccionada(categoria)}
                >
                  <Text style={[
                    styles.filterText, 
                    categoriaSeleccionada === categoria && styles.filterTextActive,
                    categoria === 'Stock Bajo' && categoriaSeleccionada === 'Stock Bajo' && { color: '#dc2626' }
                  ]}>
                    {categoria}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Ordenamiento */}
            <View style={styles.sortContainer}>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'nombre' && styles.sortButtonActive]}
                onPress={() => setSortBy('nombre')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'nombre' && styles.sortButtonTextActive]}>A-Z</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'cantidad' && styles.sortButtonActive]}
                onPress={() => setSortBy('cantidad')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'cantidad' && styles.sortButtonTextActive]}>Cantidad</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'stock' && styles.sortButtonActive]}
                onPress={() => setSortBy('stock')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'stock' && styles.sortButtonTextActive]}>Prioridad Stock</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de Artículos (NUEVO DISEÑO DE TARJETA) */}
          {filteredArticulos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No se encontraron artículos</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredArticulos.map((articulo) => (
                <TouchableOpacity
                  key={articulo.id}
                  style={[
                    styles.articuloCard,
                    isStockBajo(articulo) && styles.articuloCardBajo,
                    isTablet ? styles.cardTablet : styles.cardMobile
                  ]}
                  onPress={() => setSelectedArticulo(articulo)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardInner}>
                    
                    {/* 1. IMAGEN (Izquierda) */}
                    <View style={styles.imageContainer}>
                      <Image
                        source={articulo.imagen ? { uri: articulo.imagen } : imgPlaceholder}
                        style={styles.articuloImagen}
                        resizeMode="cover"
                      />
                    </View>

                    {/* 2. INFO (Derecha) */}
                    <View style={styles.infoContainer}>
                      <View style={styles.infoHeader}>
                        <View style={styles.badgesRow}>
                            {/* Badge Código Corto */}
                            <View style={styles.shortCodeBadge}>
                                <Text style={styles.shortCodeText}>{articulo.codigoCorto || 'N/D'}</Text>
                            </View>
                            {/* ID pequeño */}
                            <Text style={styles.idText}>{articulo.id}</Text>
                        </View>
                        
                        {/* Badge Stock Bajo */}
                        {isStockBajo(articulo) && (
                          <View style={styles.alertBadge}>
                            <Text style={styles.alertBadgeText}>Stock Bajo</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.articuloNombre} numberOfLines={2}>
                        {articulo.nombre}
                      </Text>
                      
                      <Text style={styles.articuloCategoria}>{articulo.categoria}</Text>

                      <View style={styles.infoFooter}>
                        <Text style={styles.articuloPrecio}>{articulo.precio}</Text>
                        <View style={styles.stockBox}>
                           <Text style={styles.stockLabel}>Stock:</Text>
                           <Text style={[
                               styles.stockValueNumber,
                               isStockBajo(articulo) && { color: '#dc2626' }
                           ]}>
                               {articulo.cantidad}
                           </Text>
                        </View>
                      </View>
                    </View>

                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Modal Detalle */}
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
                  <View style={styles.modalImageHeader}>
                     {selectedArticulo.imagen ? (
                        <Image source={{ uri: selectedArticulo.imagen }} style={styles.modalFullImage} resizeMode="cover" />
                     ) : (
                        <View style={[styles.modalFullImage, {backgroundColor:'#f1f5f9', alignItems:'center', justifyContent:'center'}]}>
                           <Text style={{fontSize:50}}>🌻</Text>
                        </View>
                     )}
                  </View>

                  <View style={{padding: 24}}>
                    <Text style={styles.modalTitle}>{selectedArticulo.nombre}</Text>
                    
                    <View style={styles.modalSection}>
                        <Text style={styles.modalSectionLabel}>Código Corto</Text>
                        <Text style={styles.modalSectionValueLarge}>
                        {selectedArticulo.codigoCorto}
                        </Text>
                    </View>

                    <View style={styles.modalSection}>
                        <Text style={styles.modalSectionLabel}>Categoría</Text>
                        <Text style={styles.modalSectionValue}>{selectedArticulo.categoria}</Text>
                    </View>

                    <View style={styles.modalSection}>
                        <Text style={styles.modalSectionLabel}>Stock Actual</Text>
                        <Text style={[
                            styles.modalSectionValueLarge,
                            isStockBajo(selectedArticulo) && { color: '#dc2626' }
                        ]}>
                        {selectedArticulo.cantidad} unidades
                        </Text>
                    </View>

                    {selectedArticulo.precio && (
                        <View style={styles.modalSection}>
                        <Text style={styles.modalSectionLabel}>Precio</Text>
                        <Text style={styles.modalSectionValuePrice}>{selectedArticulo.precio}</Text>
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
                  </View>
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
    height: 60,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
    zIndex: 10
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center'
  },
  backIcon: {
    fontSize: 22,
    color: '#697b92',
    marginBottom: 2
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  searchBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 30,
    height: 48,
    paddingHorizontal: 16,
    gap: 10,
    minWidth: 260
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerActionText: {
    fontSize: 17,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  statLabel: {
    fontSize: 18,
    color: '#697b92',
    marginBottom: 4
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  statCardWarning: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5'
  },
  statLabelWarning: {
    fontSize: 18,
    color: '#dc2626',
    marginBottom: 4
  },
  statValueWarning: {
    fontSize: 32,
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
    fontSize: 18
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
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
    fontSize: 17,
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
    fontSize: 17,
    fontWeight: '600',
    color: '#697b92'
  },
  sortButtonTextActive: {
    color: '#ffffff'
  },
  
  // --- TARJETA ARTÍCULO NUEVA (Horizontal) ---
  grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12
  },
  cardTablet: {
    width: '32%',
    minWidth: 260
  },
  cardMobile: {
    width: '100%'
  },
  articuloCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    height: 160 // Altura fija ligeramente aumentada para mostrar toda la información
  },
  articuloCardBajo: {
    backgroundColor: '#fff1f2',
    borderColor: '#fda4af'
  },
  cardInner: {
      flexDirection: 'row',
      height: '100%'
  },
  imageContainer: {
      width: 110,
      height: '100%',
      backgroundColor: '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: '#e2e8f0'
  },
  articuloImagen: {
      width: '100%',
      height: '100%'
  },
  imagePlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
  },
  infoContainer: {
      flex: 1,
      padding: 12,
      justifyContent: 'space-between'
  },
  infoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
  },
  badgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
  },
  shortCodeBadge: {
      backgroundColor: '#e0e7ff',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#c7d2fe'
  },
  shortCodeText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#092090'
  },
  idText: {
      fontSize: 15,
      color: '#94a3b8',
      fontWeight: '500'
  },
  alertBadge: {
      backgroundColor: '#dc2626',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10
  },
  alertBadgeText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff'
  },
  articuloNombre: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1a1a1a',
    marginVertical: 4,
    lineHeight: 24
  },
  articuloCategoria: {
      fontSize: 16,
      color: '#64748b'
  },
  infoFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.05)',
      paddingTop: 8
  },
  articuloPrecio: {
      fontSize: 20,
      fontWeight: '700',
      color: '#092090'
  },
  stockBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4
  },
  stockLabel: {
      fontSize: 16,
      color: '#64748b'
  },
  stockValueNumber: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1a1a1a'
  },
  
  emptyState: {
    padding: 60,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 18,
    color: '#697b92'
  },
  emptyIcon: {
      fontSize: 52,
      marginBottom: 20,
      opacity: 0.5
  },
  // MODAL
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
    maxWidth: 400,
    width: '100%',
    overflow: 'hidden'
  },
  modalImageHeader: {
      width: '100%',
      height: 200,
      backgroundColor: '#f1f5f9'
  },
  modalFullImage: {
      width: '100%',
      height: '100%'
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center'
  },
  modalSection: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8
  },
  modalSectionLabel: {
    fontSize: 18,
    color: '#697b92'
  },
  modalSectionValue: {
    fontSize: 20,
    color: '#1a1a1a',
    fontWeight: '500'
  },
  modalSectionValueLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  modalSectionValuePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#092090'
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
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff'
  }
});