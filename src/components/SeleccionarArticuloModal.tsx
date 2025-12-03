/**
 * Modal de Selección de Artículos - React Native
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  // Limpiar búsqueda cuando se cierra el modal
  useEffect(() => {
    if (!visible) {
      setSearchText('');
      searchInputRef.current?.blur();
    }
  }, [visible]);

  const articulosFiltrados = articulos.filter(art => {
    const searchLower = searchText.toLowerCase();
    return (
      art.nombre.toLowerCase().includes(searchLower) ||
      art.categoria.toLowerCase().includes(searchLower) ||
      (art.codigoCorto && art.codigoCorto.toLowerCase().includes(searchLower)) ||
      art.id.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
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

          {/* Lista de artículos */}
          <ScrollView style={styles.listContainer}>
            {articulosFiltrados.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {articulos.length === 0 
                    ? 'No hay artículos disponibles'
                    : 'No se encontraron artículos'}
                </Text>
              </View>
            ) : (
              articulosFiltrados.map((articulo) => (
                <TouchableOpacity
                  key={articulo.id}
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
                  
                  {/* Stock indicator */}
                  {articulo.cantidad <= (articulo.stockMinimo || 0) && (
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockBadgeText}>⚠️ Bajo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
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
  listContainer: {
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
  }
});

