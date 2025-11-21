/**
 * Resumen del Día Screen - COPIA COMPLETA DEL WEB
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useResponsiveLayout } from '../../constants/layout';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

const imgRectangle26 = require('../../../assets/blue-image-panel.png');

export default function ResumenDiaScreen() {
  const navigation = useNavigation<any>();
  const layout = useResponsiveLayout();
  const { notasVenta, gastos, cobros } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Totales del Día');
  const [selectedPeriod, setSelectedPeriod] = useState('Hoy');

  // Importar useNavigation para ContentPanel
  const navForPanel = useNavigation();

  // Calcular totales
  const calcularTotalVentas = () => {
    return notasVenta
      .filter(n => n.estado !== 'anulada')
      .reduce((sum, nota) => {
        const precio = parseFloat(nota.precio.replace(',', '.').replace('€', '').trim() || '0');
        return sum + precio;
      }, 0);
  };

  const calcularTotalGastos = () => {
    return gastos.reduce((sum, gasto) => {
      const precio = parseFloat(gasto.precio.replace(',', '.').replace('€', '').trim() || '0');
      return sum + precio;
    }, 0);
  };

  const totalVentas = calcularTotalVentas();
  const totalGastos = calcularTotalGastos();
  const numeroVentas = notasVenta.filter(n => n.estado !== 'anulada').length;
  const ventasPendientes = notasVenta.filter(n => n.estado === 'pendiente').length;
  
  const clientesVisitadosHoy = new Set(
    notasVenta
      .filter(n => n.estado !== 'anulada')
      .map(n => n.clienteId || n.cliente)
  ).size;

  const filteredNotasVenta = notasVenta.filter((nota) =>
    nota.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nota.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGastos = gastos.filter((gasto) =>
    gasto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gasto.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ScreenWithSidebar currentScreen="ResumenDia" scrollable={true}>
      {/* Header con botón volver y acciones */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Resumen del Día</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('NuevaVenta')}
          >
            <Text style={styles.actionButtonText}>+ Nueva Venta</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Gastos')}
          >
            <Text style={styles.actionButtonText}>+ Nuevo Gasto</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => alert('Exportar funcionalidad próximamente')}
          >
            <LinearGradient
              colors={['#092090', '#0C2ABF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.exportGradient}
            >
              <Text style={styles.exportIcon}>🖨️</Text>
              <Text style={styles.exportText}>Exportar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros de fecha y búsqueda */}
      <View style={styles.filtersRow}>
        <View style={styles.periodButtons}>
          {['Hoy', 'Ayer', 'Semana', 'Mes'].map((periodo) => (
            <TouchableOpacity
              key={periodo}
              onPress={() => setSelectedPeriod(periodo)}
            >
              {selectedPeriod === periodo ? (
                <LinearGradient
                  colors={['#092090', '#0C2ABF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.periodButtonActive}
                >
                  <Text style={styles.periodTextActive}>{periodo}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.periodButton}>
                  <Text style={styles.periodText}>{periodo}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente o nota..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {['Totales del Día', 'Notas de Venta', 'Cobros', 'Gastos', 'Incidencias'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
          >
            {activeTab === tab ? (
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterTabActive}
              >
                <Text style={styles.filterTabTextActive}>{tab}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.filterTab}>
                <Text style={styles.filterTabText}>{tab}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats cards - CLICKEABLES */}
      <View style={styles.statsGrid}>
        <TouchableOpacity onPress={() => setActiveTab('Notas de Venta')}>
          <StatsCard 
            title="Ventas Hoy"
            value={`${totalVentas.toFixed(2).replace('.', ',')} €`}
            change="+12% vs ayer"
            changeColor="#91e600"
            bgGradient={true}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('Gastos')}>
          <StatsCard 
            title="Gastos Hoy"
            value={`${totalGastos.toFixed(2).replace('.', ',')} €`}
            change="-8% vs ayer"
            changeColor="#f59f0a"
            titleBg="#0C2ABF"
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('Notas de Venta')}>
          <StatsCard 
            title="Nº de Ventas"
            value={numeroVentas.toString()}
            change={ventasPendientes > 0 ? `${ventasPendientes} pendientes` : '+2 vs ayer'}
            changeColor="#91e600"
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Clientes')}>
          <StatsCard 
            title="Clientes Visitados"
            value={clientesVisitadosHoy.toString()}
            change="Objetivo: 15 clientes"
            changeColor="#697b92"
          />
        </TouchableOpacity>
      </View>

      {/* Content basado en tab activo */}
      {activeTab === 'Totales del Día' && (
        <View style={styles.contentGrid}>
          {/* Notas de Venta */}
          <ContentPanel title="Notas de Venta">
            {filteredNotasVenta.slice(0, 5).map((nota) => (
              <TouchableOpacity 
                key={nota.id} 
                onPress={() => navigation.navigate('VerNota', { notaId: nota.id })}
              >
                <NotaVentaItem {...nota} />
              </TouchableOpacity>
            ))}
            {filteredNotasVenta.length > 5 && (
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => setActiveTab('Notas de Venta')}
              >
                <Text style={styles.seeAllText}>Ver todas ({filteredNotasVenta.length})</Text>
              </TouchableOpacity>
            )}
          </ContentPanel>

          {/* Gastos */}
          <ContentPanel title="Gastos">
            {filteredGastos.slice(0, 5).map((gasto) => (
              <TouchableOpacity 
                key={gasto.id}
                onPress={() => navigation.navigate('Gastos')}
              >
                <GastoItem {...gasto} imagen={imgRectangle26} />
              </TouchableOpacity>
            ))}
          </ContentPanel>
        </View>
      )}

      {activeTab === 'Notas de Venta' && (
        <ContentPanel title="Todas las Notas de Venta">
          {filteredNotasVenta.map((nota) => (
            <TouchableOpacity 
              key={nota.id} 
              onPress={() => navigation.navigate('VerNota', { notaId: nota.id })}
            >
              <NotaVentaItem {...nota} />
            </TouchableOpacity>
          ))}
          
          <View style={styles.totalPanel}>
            <View>
              <Text style={styles.totalPanelLabel}>Total Ventas</Text>
              <Text style={styles.totalPanelValue}>
                {totalVentas.toFixed(2).replace('.', ',')} €
              </Text>
            </View>
            <View style={styles.totalPanelRight}>
              <Text style={styles.totalPanelLabel}>Notas procesadas</Text>
              <Text style={styles.totalPanelValue}>{filteredNotasVenta.length}</Text>
            </View>
          </View>
        </ContentPanel>
      )}

      {activeTab === 'Gastos' && (
        <ContentPanel title="Todos los Gastos">
          {filteredGastos.map((gasto) => (
            <TouchableOpacity 
              key={gasto.id}
              onPress={() => navigation.navigate('Gastos')}
            >
              <GastoItem {...gasto} imagen={imgRectangle26} />
            </TouchableOpacity>
          ))}
          
          <View style={styles.totalPanel}>
            <View>
              <Text style={styles.totalPanelLabel}>Total Gastos</Text>
              <Text style={[styles.totalPanelValue, { color: '#f59e0b' }]}>
                {totalGastos.toFixed(2).replace('.', ',')} €
              </Text>
            </View>
            <View style={styles.totalPanelRight}>
              <Text style={styles.totalPanelLabel}>Gastos registrados</Text>
              <Text style={styles.totalPanelValue}>{filteredGastos.length}</Text>
            </View>
          </View>
        </ContentPanel>
      )}
    </ScreenWithSidebar>
  );
}

// COMPONENTES AUXILIARES (igual al web)

function StatsCard({ title, value, change, changeColor, bgGradient, titleBg }: any) {
  return (
    <View style={[styles.statCard, bgGradient && styles.statCardGradient]}>
      {bgGradient && (
        <LinearGradient
          colors={['#092090', '#0C2ABF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[styles.statBadge, { backgroundColor: titleBg || (bgGradient ? 'rgba(255,255,255,0.2)' : '#0C2ABF') }]}>
        <Text style={styles.statBadgeText}>{title}</Text>
      </View>
      <Text style={[styles.statValue, bgGradient && { color: '#ffffff' }]}>{value}</Text>
      <Text style={[styles.statChange, { color: changeColor }]}>{change}</Text>
    </View>
  );
}

function ContentPanel({ title, children, onAdd }: { title: string; children: React.ReactNode; onAdd?: () => void }) {
  const navigation = useNavigation<any>();
  
  const handleAdd = () => {
    if (title.includes('Ventas')) {
      navigation.navigate('NuevaVenta');
    } else if (title.includes('Gastos')) {
      navigation.navigate('Gastos');
    } else if (onAdd) {
      onAdd();
    }
  };
  
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelIcon}>📊</Text>
        <Text style={styles.panelTitle}>{title}</Text>
        <TouchableOpacity style={styles.panelAddButton} onPress={handleAdd}>
          <Text style={styles.panelAddText}>+ Añadir</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.panelContent}>
        {children}
      </View>
    </View>
  );
}

function NotaVentaItem({ id, cliente, precio }: any) {
  return (
    <View style={styles.notaItem}>
      <View>
        <Text style={styles.notaId}>{id}</Text>
        <Text style={styles.notaCliente}>{cliente}</Text>
      </View>
      <Text style={styles.notaPrecio}>{precio}</Text>
    </View>
  );
}

function GastoItem({ nombre, categoria, precio, imagen }: any) {
  return (
    <View style={styles.gastoItem}>
      <Image source={imagen} style={styles.gastoImage} />
      <View style={styles.gastoInfo}>
        <Text style={styles.gastoNombre}>{nombre}</Text>
        <Text style={styles.gastoCategoria}>{categoria}</Text>
      </View>
      <Text style={styles.gastoPrecio}>{precio}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#697b92',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#092090',
    borderRadius: 30,
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#092090',
  },
  exportButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  exportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  exportIcon: {
    fontSize: 16,
  },
  exportText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 24,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  periodButtonActive: {
    borderWidth: 0,
  },
  periodText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#697b92',
  },
  periodTextActive: {
    color: '#ffffff',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 30,
    height: 40,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
  },
  tabsContainer: {
    marginBottom: 32,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#092090',
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  filterTabActive: {
    borderWidth: 0,
  },
  filterTabText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#092090',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 24,
    position: 'relative',
  },
  statCardGradient: {
    borderWidth: 0,
    overflow: 'hidden',
  },
  statBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  statBadgeText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#ffffff',
  },
  statValue: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  statChange: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 30,
  },
  panel: {
    flex: 1,
    minWidth: 450,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 28,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  panelIcon: {
    fontSize: 18,
  },
  panelTitle: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 10,
  },
  panelAddButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#0C2ABF',
    borderRadius: 20,
  },
  panelAddText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  panelContent: {
    gap: 12,
  },
  notaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
  },
  notaId: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  notaCliente: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#697b92',
  },
  notaPrecio: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#0C2ABF',
  },
  gastoItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  gastoImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  gastoInfo: {
    flex: 1,
  },
  gastoNombre: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  gastoCategoria: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#697b92',
  },
  gastoPrecio: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  seeAllButton: {
    width: '100%',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  seeAllText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#092090',
  },
  totalPanel: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalPanelLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#697b92',
  },
  totalPanelValue: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 4,
  },
  totalPanelRight: {
    alignItems: 'flex-end',
  },
});

