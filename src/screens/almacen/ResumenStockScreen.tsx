/**
 * Resumen Stock Screen - EXACTAMENTE IGUAL A LA WEB
 * Tabla de stock con filtros por categoría, stats y resaltado de stock bajo
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

export default function ResumenStockScreen() {
  const navigation = useNavigation<any>();
  const { articulos } = useApp();

  const [filtroCategoria, setFiltroCategoria] = useState('Todos');

  // Usar datos reales del contexto
  const stockData = articulos.map(art => {
    const fallbackCode = art.nombre
      ? `${art.nombre.substring(0, 3).toUpperCase()}-${art.id.slice(-3)}`
      : art.id || 'N/D';
    return {
      id: art.id,
      codigoCorto: art.codigoCorto || fallbackCode,
      nombre: art.nombre,
      categoria: art.categoria,
      stock: art.cantidad,
      stockMinimo: art.stockMinimo || 0,
      // Eliminado hardcodeo de fechas, se puede extender Articulo interface si el ERP provee este dato
      ultimaEntrada: '-', 
      ultimaSalida: '-'
    };
  });

  const categorias = ['Todos', ...Array.from(new Set(stockData.map(a => a.categoria)))];

  const filteredData = filtroCategoria === 'Todos' 
    ? stockData 
    : stockData.filter(a => a.categoria === filtroCategoria);

  const stockBajo = filteredData.filter(a => a.stock < a.stockMinimo);
  const totalStock = filteredData.reduce((acc, a) => acc + a.stock, 0);

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
              <Text style={styles.statValueGradient}>{filteredData.length}</Text>
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
                key={cat}
                style={[
                  styles.filterButton,
                  filtroCategoria === cat && styles.filterButtonActive
                ]}
                onPress={() => setFiltroCategoria(cat)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filtroCategoria === cat && styles.filterButtonTextActive
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

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
            {filteredData.map((articulo, index) => {
              const isBajoStock = articulo.stock < articulo.stockMinimo;
              return (
                <View
                  key={articulo.id}
                  style={[
                    styles.tableRow,
                    isBajoStock && styles.tableRowBajo,
                    index < filteredData.length - 1 && styles.tableRowBorder
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
  }
});
