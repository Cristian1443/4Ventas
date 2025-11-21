/**
 * Modal de Selección de Artículos - React Native
 */

import React, { useState } from 'react';
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

  const articulosFiltrados = articulos.filter(art => 
    art.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
    art.categoria.toLowerCase().includes(searchText.toLowerCase())
  );

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
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar artículo..."
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
            />
          </View>

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
    maxHeight: '80%',
    paddingTop: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  closeButton: {
    fontSize: 28,
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
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1a1a1a'
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  articuloCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  articuloInfo: {
    flex: 1
  },
  articuloNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4
  },
  articuloCategoria: {
    fontSize: 13,
    color: '#697b92',
    marginBottom: 8
  },
  articuloMeta: {
    flexDirection: 'row'
  },
  articuloStock: {
    fontSize: 13,
    color: '#697b92',
    marginRight: 12
  },
  articuloPrecio: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0C2ABF'
  },
  stockBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626'
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 14,
    color: '#697b92',
    textAlign: 'center'
  }
});

