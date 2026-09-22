import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { colors } from '../../constants/colors';

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

interface SeleccionarArticuloSidebarProps {
  onSelect: (articulo: Articulo) => void;
  articulos: Articulo[];
  onClose: () => void;
}

export default function SeleccionarArticuloSidebar({
  onSelect,
  articulos,
  onClose
}: SeleccionarArticuloSidebarProps) {
  const normalizeText = (value: any): string =>
    String(value || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();

  const [searchText, setSearchText] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [showBestSellers, setShowBestSellers] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchText.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [searchText]);

  const articulosFiltrados = useMemo(() => {
    let list = articulos;
    
    // Búsqueda real de Más Vendidos basada en categorías o palabras clave del ERP
    if (showBestSellers) {
        const queryVendidos = ['vendido', 'top', 'mas vendido', 'popular', 'destacado', 'oferta'];
        const masVendidos = list.filter(art => {
            const searchSource = normalizeText(`${art.categoria} ${art.nombre} ${art.id}`);
            return queryVendidos.some(q => searchSource.includes(normalizeText(q)));
        });

        if (masVendidos.length > 0) {
            // Si hay resultados específicos, los mostramos
            list = masVendidos;
        } else {
            // Fallback: Si no hay categoría explícita, tomamos los que tienen más stock (rotación probable)
            list = [...list]
                .sort((a, b) => (b.cantidad || 0) - (a.cantidad || 0))
                .slice(0, 40);
        }
    }

    // Sin búsqueda: mostrar todos (FlatList virtualiza el render)
    if (!searchDebounced) return list;
    
    const query = normalizeText(searchDebounced);
    return list.filter((art) => {
      const searchable = [
        art.nombre,
        art.categoria,
        art.codigoCorto,
        art.id,
        art.proveedor,
      ].map(normalizeText).join(' ');
      return searchable.includes(query);
    });
  }, [articulos, searchDebounced, showBestSellers]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buscador de Artículos</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
         <TouchableOpacity 
            style={[styles.filterChip, showBestSellers && styles.filterChipActive]}
            onPress={() => setShowBestSellers(!showBestSellers)}
         >
             <Text style={[styles.filterText, showBestSellers && styles.filterTextActive]}>⭐ Más vendidos</Text>
         </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Buscar artículo..."
          placeholderTextColor="#94a3b8"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
        />
        {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchChip}>
                <Text style={styles.clearSearchChipText}>Limpiar</Text>
            </TouchableOpacity>
        )}
      </View>

      <View style={styles.listContainer}>
        {articulosFiltrados.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No se encontraron artículos</Text>
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
                }}
                activeOpacity={0.7}
              >
                <View style={styles.articuloInfo}>
                  <Text style={styles.articuloNombre}>{articulo.nombre}</Text>
                  <Text style={styles.articuloCodigo}>Cód: {articulo.codigoCorto || 'N/A'}</Text>
                </View>
                <View style={styles.articuloRight}>
                    {articulo.precio && (
                      <Text style={styles.articuloPrecio}>{articulo.precio}</Text>
                    )}
                    <Text style={styles.articuloStock}>Stock: {articulo.cantidad}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
  },
  closeText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      backgroundColor: '#f8fafc',
  },
  filterChipActive: {
      backgroundColor: '#092090',
      borderColor: '#092090',
  },
  filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#64748b',
  },
  filterTextActive: {
      color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    margin: 12,
    paddingHorizontal: 10,
    height: 42,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#1a1a1a',
  },
  clearSearchChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 10,
  },
  clearSearchChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 10,
  },
  articuloCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  articuloInfo: {
    flex: 2,
    paddingRight: 8,
  },
  articuloNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  articuloCodigo: {
    fontSize: 12,
    color: '#092090',
    fontWeight: '600',
  },
  articuloRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  articuloPrecio: {
    fontSize: 14,
    fontWeight: '700',
    color: '#092090',
  },
  articuloStock: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
});
