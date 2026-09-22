/**
 * Modal de Selección de Artículos - React Native
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  FlatList,
  TextInput,
  Modal
} from 'react-native';

interface Articulo {
  id: string;
  nombre: string;
  cantidad: number;
  categoria: string;
  precio?: string;
  stockMinimo?: number;
  proveedor?: string;
  codigoCorto?: string;
}

interface SeleccionarArticuloModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (articulo: Articulo) => void;
  articulos: Articulo[];
}

export default function SeleccionarArticuloModal({
  visible,
  onClose,
  onSelect,
  articulos
}: SeleccionarArticuloModalProps) {
  const normalizeText = (value: any): string =>
    String(value || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();

  const [searchText, setSearchText] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  // Limpiar búsqueda cuando se cierra el modal
  useEffect(() => {
    if (!visible) {
      setSearchText('');
      setSearchDebounced('');
      searchInputRef.current?.blur();
    }
  }, [visible]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchText.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [searchText]);

  const articulosFiltrados = useMemo(() => {
    if (!visible) return [];
    if (!searchDebounced) return articulos.slice(0, 220);
    const query = normalizeText(searchDebounced);
    return articulos.filter((art) => {
      const searchable = [
        art.nombre,
        art.categoria,
        art.codigoCorto,
        art.id,
        art.proveedor,
      ].map(normalizeText).join(' ');
      return searchable.includes(query);
    });
  }, [articulos, searchDebounced, visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Seleccionar Artículo</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <TouchableOpacity 
            style={styles.searchContainer}
            onPress={() => searchInputRef.current?.focus()}
            activeOpacity={1}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Buscar artículo..."
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
              autoFocus={false}
              showSoftInputOnFocus={true}
              blurOnSubmit={false}
            />
          </TouchableOpacity>
          <View style={styles.searchMetaRow}>
            <Text style={styles.searchMetaText}>{articulosFiltrados.length} resultado(s)</Text>
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchChip}>
                <Text style={styles.clearSearchChipText}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Lista de artículos */}
          <View style={styles.listContainer}>
            {articulosFiltrados.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {articulos.length === 0 
                    ? 'No hay artículos disponibles'
                    : 'No se encontraron artículos'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={articulosFiltrados}
                keyExtractor={(item) => String(item.id)}
                style={{ flex: 1 }}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                maxToRenderPerBatch={24}
                windowSize={8}
                removeClippedSubviews
                keyboardDismissMode="on-drag"
                renderItem={({ item: articulo }) => (
                  <TouchableOpacity
                    style={styles.articuloCard}
                    onPress={() => {
                      onSelect(articulo);
                      setSearchText('');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.articuloInfo}>
                      <Text style={styles.articuloNombre}>{articulo.nombre}</Text>
                      <Text style={styles.articuloCodigo}>
                        Código: {articulo.codigoCorto || 'Sin código'}
                      </Text>
                      <Text style={styles.articuloCategoria}>{articulo.categoria}</Text>
                      <View style={styles.articuloMeta}>
                        <Text style={styles.articuloStock}>
                          Stock: {articulo.cantidad}
                        </Text>
                        {articulo.precio && (
                          <Text style={styles.articuloPrecio}>
                            {articulo.precio}
                          </Text>
                        )}
                      </View>
                    </View>

                    {articulo.cantidad <= (articulo.stockMinimo || 0) && (
                      <View style={styles.stockBadge}>
                        <Text style={styles.stockBadgeText}>⚠️ Bajo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '88%',
    maxHeight: '90%',
    paddingTop: 24
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  closeButton: {
    fontSize: 32,
    color: '#697b92',
    fontWeight: '300'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginHorizontal: 24,
    marginBottom: 20,
    paddingHorizontal: 14,
    height: 52
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    height: 52,
    fontSize: 18,
    color: '#1a1a1a'
  },
  searchMetaRow: {
    marginTop: -8,
    marginBottom: 10,
    marginHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchMetaText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  clearSearchChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  clearSearchChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    minHeight: 220
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24
  },
  articuloCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  articuloInfo: {
    flex: 1
  },
  articuloNombre: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6
  },
  articuloCodigo: {
    fontSize: 14,
    color: '#0C2ABF',
    marginBottom: 4,
    fontWeight: '600'
  },
  articuloCategoria: {
    fontSize: 15,
    color: '#697b92',
    marginBottom: 8
  },
  articuloMeta: {
    flexDirection: 'row'
  },
  articuloStock: {
    fontSize: 15,
    color: '#697b92',
    marginRight: 12
  },
  articuloPrecio: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0C2ABF'
  },
  stockBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  stockBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626'
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#697b92',
    textAlign: 'center'
  },
  footerActions: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 12,
    alignItems: 'flex-end',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: '#334155',
    fontWeight: '700',
  },
});

