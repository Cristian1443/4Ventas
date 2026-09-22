/**
 * Resumen Stock Screen - VERSIÓN CORREGIDA
 * - Resuelve nombres de categoría reales del ERP
 * - Filtro "Con Stock" para mostrar solo artículos con stock > 0
 * - Filtrado por categoría usando categoriaId del artículo
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { catalogosService } from '../../services/erp/catalogos.service';
import { getStockLocalCheckpointMs, resetStockLocalAhora, calcularStockLocalPorArticulo } from '../../services/stock-local.service';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

export default function ResumenStockScreen() {
  const navigation = useNavigation<any>();
  const { articulos, notasAlmacen, notasVenta, currentVendor } = useApp();

  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [soloConStock, setSoloConStock] = useState(true);
  const [categoriasErp, setCategoriasErp] = useState<{ id: string; nombre: string }[]>([]);
  const [visibleRows, setVisibleRows] = useState(120);
  const [checkpointMs, setCheckpointMs] = useState<number | undefined>(undefined);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    getStockLocalCheckpointMs(currentVendor?.id).then(setCheckpointMs);
  }, [currentVendor?.id]);

  const stockLocalPorArticulo = useMemo(
    () => calcularStockLocalPorArticulo(notasAlmacen, notasVenta, checkpointMs),
    [notasAlmacen, notasVenta, checkpointMs]
  );

  const handleResetStock = () => {
    if (!currentVendor?.id) return;
    Alert.alert(
      'Borrar existencias y poner stock a cero',
      'Esto pone a cero el stock local del furgón de este vendedor (no afecta al ERP). Las próximas cargas empiezan desde cero. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Poner a cero',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              const ts = await resetStockLocalAhora(currentVendor.id);
              setCheckpointMs(ts);
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  const normalizar = (v: string) =>
    (v || '')
      .trim()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const data = await catalogosService.getCategorias();
        const parsed = (data || [])
          .map((c: any, idx: number) => ({
            id: (c.id_categoria || c.IdCategoria || c.ID_Categoria || c.id || c.ID || `cat_${idx}`).toString(),
            nombre: (c.nombre || c.Nombre || c.Name || '').toString().trim()
          }))
          .filter(c => c.nombre);
        // Unicos por id
        const uniq: Record<string, { id: string; nombre: string }> = {};
        parsed.forEach(c => {
          if (!uniq[c.id]) uniq[c.id] = c;
        });
        setCategoriasErp(Object.values(uniq));
      } catch {
        setCategoriasErp([]);
      }
    };
    loadCategorias();
  }, []);

  // Mapa de categoriaId -> nombre real del ERP
  const categoriasById = useMemo(() => {
    const map: Record<string, string> = {};
    categoriasErp.forEach(c => {
      if (c.id) map[c.id] = c.nombre;
    });
    return map;
  }, [categoriasErp]);

  // Datos stock con resolución de nombre de categoría — solo artículos con stock local
  // registrado en esta tablet (cargas/descargas/ventas), no el stock general del ERP.
  const stockData = useMemo(() => {
    return Object.entries(stockLocalPorArticulo)
      .filter(([, cantidad]) => cantidad !== 0)
      .map(([articuloId, cantidad]) => {
        const art = articulos.find(a => a.id === articuloId);
        const fallbackCode = art?.nombre
          ? `${art.nombre.substring(0, 3).toUpperCase()}-${articuloId.slice(-3)}`
          : articuloId || 'N/D';

        // Resolver nombre real de categoría desde el catálogo ERP
        let categoriaResuelta = art?.categoria || '';
        if (art?.categoriaId && categoriasById[art.categoriaId]) {
          categoriaResuelta = categoriasById[art.categoriaId];
        }

        return {
          id: articuloId,
          codigoCorto: art?.codigoCorto || fallbackCode,
          nombre: art?.nombre || articuloId,
          categoria: categoriaResuelta,
          categoriaId: art?.categoriaId ? art.categoriaId.toString() : undefined,
          stock: Math.max(0, cantidad),
          stockMinimo: art?.stockMinimo || 0,
          ultimaEntrada: '-',
          ultimaSalida: '-'
        };
      });
  }, [stockLocalPorArticulo, articulos, categoriasById]);

  // Categorías: Todos + Con Stock + Stock Bajo + ERP
  const categorias = useMemo(() => {
    const base = [
      { id: 'todos', nombre: 'Todos' },
      { id: 'stock', nombre: 'Stock Bajo' }
    ];

    if (categoriasErp.length > 0) {
      // Filtrar categorías que no tienen ningún artículo local, para "quitar las que no hay"
      const catActivas = categoriasErp.filter(cat => {
        const catNorm = normalizar(cat.id);
        const nameNorm = normalizar(cat.nombre);
        
        // Omitir categorías que empiezan por WEB según petición del usuario
        if (nameNorm.startsWith('web')) return false;

        // Dejar también por si acaso una categoría que explícitamente se llame "más vendidos"
        // aunque no tenga cruce directo, por si el backend lo inyecta luego, a petición del usuario
        if (nameNorm.includes('mas vendidos')) return true;

        return stockData.some(art => 
          (art.categoriaId && normalizar(art.categoriaId) === catNorm) ||
          normalizar(art.categoria || '') === catNorm ||
          normalizar(art.categoria || '') === nameNorm ||
          normalizar(art.categoria || '').includes(nameNorm)
        );
      });

      return [...base, ...catActivas];
    }

    const fallback = Array.from(
      new Set(
        stockData
          .map(a => a.categoria)
          .filter(c => c && c !== 'null' && c !== 'undefined')
      )
    ).map((c, idx) => ({
      id: normalizar(c) || `cat_${idx}`,
      nombre: c
    }));

    return [...base, ...fallback];
  }, [categoriasErp, stockData]);

  const filteredData = useMemo(() => {
    let data = stockData;
    if (soloConStock) {
      data = data.filter(a => a.stock > 0);
    }

    if (filtroCategoria === 'todos') return data;
    if (filtroCategoria === 'stock') return data.filter(a => a.stock <= (a.stockMinimo || 0));

    return data.filter(a => {
      const artId = a.categoriaId;
      const artNameNorm = normalizar(a.categoria || '');
      const filtroNorm = normalizar(filtroCategoria);
      
      const isMasVendidos = filtroNorm.includes('vendido') || 
         categorias.find(c => c.id === filtroCategoria && normalizar(c.nombre).includes('vendido'));
         
      if (isMasVendidos) {
         // Si es un filtro tipo 'Más vendidos' pero los artículos no tienen esta categoría
         // explícitamente asignada del ERP, entonces traemos los de mayor stock como top ventas
         return true; // Todos pasan y luego los ordenamos y trunco
      }

      return (artId && artId === filtroCategoria) ||
        normalizar(artId || '') === filtroNorm ||
        artNameNorm === filtroNorm ||
        artNameNorm.includes(filtroNorm);
    });
  }, [filtroCategoria, stockData, soloConStock, categorias]);

  // Aplicar límite y sort para el caso de "Más Vendidos"
  const finalSortedData = useMemo(() => {
     const filtroNorm = normalizar(filtroCategoria);
     const isMasVendidos = filtroNorm.includes('vendido') || 
         categorias.find(c => c.id === filtroCategoria && normalizar(c.nombre).includes('vendido'));
         
     if (isMasVendidos) {
        return [...filteredData].sort((a, b) => b.stock - a.stock).slice(0, 40);
     }
     return filteredData;
  }, [filteredData, filtroCategoria, categorias]);

  useEffect(() => {
    setVisibleRows(120);
  }, [filtroCategoria, stockData.length, soloConStock]);

  const visibleData = useMemo(
    () => finalSortedData.slice(0, visibleRows),
    [finalSortedData, visibleRows]
  );

  const stockBajo = finalSortedData.filter(a => a.stock <= (a.stockMinimo || 0));
  const totalStock = finalSortedData.reduce((acc, a) => acc + a.stock, 0);

  return (
    <ScreenWithSidebar currentScreen="ResumenStock" scrollable={false}>
      <View style={styles.container}>
        {/* Header Sticky */}
        <View style={styles.header}>
          <View style={{ width: 26, height: 26 }} />
          <Text style={styles.headerTitle}>Resumen Stock</Text>
          <TouchableOpacity
            style={styles.backButtonHeader}
            onPress={() => navigation.navigate('Almacen')}
          >
            <Text style={styles.backIconHeader}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.almacenHintRow}>
          <Text style={styles.almacenHint}>
            Stock del furgón (local, calculado en esta tablet desde las Notas de Almacén y las ventas
            {checkpointMs ? ' — desde el último reinicio' : ''})
          </Text>
          <TouchableOpacity
            style={[styles.resetStockBtn, resetting && { opacity: 0.6 }]}
            onPress={handleResetStock}
            disabled={resetting}
          >
            <Text style={styles.resetStockBtnText}>Borrar existencias y poner stock a cero</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Estadísticas */}
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['#092090', '#0C2ABF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <Text style={styles.statLabelGradient}>Total Artículos</Text>
              <Text style={styles.statValueGradient}>{finalSortedData.length}</Text>
            </LinearGradient>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Stock Total</Text>
              <Text style={styles.statValue}>{totalStock}</Text>
            </View>

            <View style={styles.statCardWarning}>
              <Text style={styles.statLabelWarning}>Stock Bajo</Text>
              <Text style={styles.statValueWarning}>{stockBajo.length}</Text>
            </View>
          </View>

          {/* Filtros */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
            {categorias.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterButton,
                  filtroCategoria === cat.id && styles.filterButtonActive,
                  cat.id === 'constock' && filtroCategoria === 'constock' && { backgroundColor: '#059669', borderColor: '#059669' }
                ]}
                onPress={() => setFiltroCategoria(cat.id)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filtroCategoria === cat.id && styles.filterButtonTextActive
                ]}>
                  {cat.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Toggle dedicado para "Con Stock" encima de la tabla */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12, paddingHorizontal: 4 }}>
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                soloConStock ? { backgroundColor: '#10b981', borderColor: '#10b981' } : { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
                { borderRadius: 20, paddingHorizontal: 16 }
              ]} 
              onPress={() => setSoloConStock(!soloConStock)}
            >
              <Text style={{ fontWeight: 'bold', fontSize: 13, color: soloConStock ? '#fff' : '#64748b' }}>
                {soloConStock ? '📦 Mostrando: Sólo con stock' : '📦 Mostrando: Todos (incluye agotados)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tabla de stock */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: 60 }]}>ID</Text>
              <Text style={[styles.tableHeaderText, { width: 100 }]}>Código</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Nombre</Text>
              <Text style={[styles.tableHeaderText, { width: 150 }]}>Categoría</Text>
              <Text style={[styles.tableHeaderText, { width: 100, textAlign: 'center' }]}>Stock</Text>
              <Text style={[styles.tableHeaderText, { width: 100, textAlign: 'center' }]}>Mínimo</Text>
              <Text style={[styles.tableHeaderText, { width: 120 }]}>Últ. Mov</Text>
            </View>

            {/* Rows */}
            {visibleData.map((articulo, index) => {
              const isBajoStock = articulo.stock < articulo.stockMinimo;
              return (
                <View
                  key={articulo.id}
                  style={[
                    styles.tableRow,
                    isBajoStock && styles.tableRowBajo,
                    index < visibleData.length - 1 && styles.tableRowBorder
                  ]}
                >
                  <Text style={[styles.tableCell, { width: 60 }]}>{articulo.id}</Text>
                  <Text style={[styles.tableCell, styles.tableCellBold, { width: 100 }]}>{articulo.codigoCorto}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{articulo.nombre}</Text>
                  <Text style={[styles.tableCell, styles.tableCellGray, { width: 150 }]}>{articulo.categoria}</Text>
                  <Text style={[
                    styles.tableCell,
                    styles.tableCellBold,
                    { width: 100, textAlign: 'center', color: isBajoStock ? '#f59e0b' : '#10b981' }
                  ]}>
                    {articulo.stock}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellGray, { width: 100, textAlign: 'center' }]}>
                    {articulo.stockMinimo}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellGray, { width: 120 }]}>{articulo.ultimaEntrada}</Text>
                </View>
              );
            })}
          </View>
          {filteredData.length > visibleData.length && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => setVisibleRows((prev) => prev + 120)}
              activeOpacity={0.8}
            >
              <Text style={styles.loadMoreBtnText}>
                Cargar más ({filteredData.length - visibleData.length} restantes)
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 62,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    position: 'relative',
    zIndex: 10
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    flex: 1
  },
  almacenHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  almacenHint: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  resetStockBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  resetStockBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  backButtonHeader: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backIconHeader: {
    fontSize: 24,
    color: '#697B92'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 60,
    paddingBottom: 60
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40
  },
  statCardGradient: {
    flex: 1,
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  statLabelGradient: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8
  },
  statValueGradient: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff'
  },
  statCard: {
    flex: 1,
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  statLabel: {
    fontSize: 18,
    color: '#697b92',
    marginBottom: 8
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  statCardWarning: {
    flex: 1,
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fbbf24',
    backgroundColor: '#fffbeb'
  },
  statLabelWarning: {
    fontSize: 18,
    color: '#92400e',
    marginBottom: 8
  },
  statValueWarning: {
    fontSize: 36,
    fontWeight: '700',
    color: '#f59e0b'
  },
  filters: {
    marginBottom: 24
  },
  filterButton: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#092090',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8
  },
  filterButtonActive: {
    backgroundColor: '#0C2ABF',
    borderColor: '#0C2ABF'
  },
  filterButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#092090'
  },
  filterButtonTextActive: {
    color: '#ffffff'
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden'
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 16,
    opacity: 0.5
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 16,
    color: '#697b92'
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  tableHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b'
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff'
  },
  tableRowBajo: {
    backgroundColor: '#fffbeb'
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  tableCell: {
    fontSize: 18,
    color: '#1a1a1a'
  },
  tableCellGray: {
    color: '#697b92'
  },
  tableCellBold: {
    fontWeight: '600'
  },
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loadMoreBtnText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 15,
  },
});
