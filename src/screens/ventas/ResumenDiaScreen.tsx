/**
 * Resumen del Día Screen - OPTIMIZADO TABLET/MÓVIL
 * - Corregido desbordamiento en móviles (minWidth excesivo).
 * - Adaptación de columnas dinámica (Grid System).
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useResponsiveLayout, layout } from '../../constants/layout';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

const imgRectangle26 = require('../../../assets/blue-image-panel.png');

export default function ResumenDiaScreen() {
  const navigation = useNavigation<any>();
  const { isTablet, isSmallDevice } = useResponsiveLayout(); // Hook de layout
  const { notasVenta, gastos } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Totales del Día');
  const [selectedPeriod, setSelectedPeriod] = useState('Hoy');

  // --- CÁLCULOS ---
  const calcularTotalVentas = () => {
    return notasVenta
      .filter(n => n.estado !== 'anulada')
      .reduce((sum, nota) => {
        const precio = parseFloat(nota.precio.replace(/[^\d,.-]/g, '').replace(',', '.') || '0');
        return sum + precio;
      }, 0);
  };

  const calcularTotalGastos = () => {
    return gastos.reduce((sum, gasto) => {
      const precio = parseFloat(gasto.precio.replace(/[^\d,.-]/g, '').replace(',', '.') || '0');
      return sum + precio;
    }, 0);
  };

  const totalVentas = calcularTotalVentas();
  const totalGastos = calcularTotalGastos();
  const numeroVentas = notasVenta.filter(n => n.estado !== 'anulada').length;
  const ventasPendientes = notasVenta.filter(n => n.estado === 'pendiente').length;
  
  // --- FILTRAR NOTAS ABIERTAS (BORRADORES) ---
  const notasAbiertas = useMemo(() => 
    notasVenta.filter(n => n.estado === 'abierta'), 
    [notasVenta]);
  
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

  // --- MODIFICAR EXPORTAR/IMPRIMIR PARA ADVERTIR ---
  const handleExport = () => {
    if (notasAbiertas.length > 0) {
      Alert.alert(
        'Advertencia', 
        `Tienes ${notasAbiertas.length} nota(s) abierta(s) temporalmente. Estas no se incluirán en el cierre final. ¿Deseas continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => alert('Exportando...') }
        ]
      );
    } else {
      alert('Exportando...');
    }
  };

  const layout = useResponsiveLayout();
  
  return (
    <ScreenWithSidebar currentScreen="ResumenDia" scrollable={true}>
      <View style={[styles.contentWrapper, { paddingHorizontal: layout.padding }]}>
      {/* --- HEADER --- */}
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
            onPress={() => navigation.navigate('Ventas')}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.actionButtonText}>+ Nueva Venta</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Gastos')}
          >
            <Text style={styles.actionButtonText}>+ Gasto</Text>
          </TouchableOpacity>
          {!isSmallDevice && (
            <TouchableOpacity 
              style={styles.exportButton}
              onPress={handleExport}
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
          )}
        </View>
      </View>

      {/* --- SECCIÓN DE ALERTAS DE NOTAS ABIERTAS (NUEVO) --- */}
      {notasAbiertas.length > 0 && (
        <View style={styles.alertContainer}>
          <Text style={styles.alertTitle}>⚠️ Tienes {notasAbiertas.length} nota(s) abierta(s)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 10}}>
            {notasAbiertas.map(nota => (
              <TouchableOpacity 
                key={nota.id} 
                style={styles.openNoteCard}
                onPress={() => navigation.navigate('NuevaVenta', { ventaData: nota })} // REANUDAR
              >
                <Text style={styles.openNoteClient}>{nota.cliente}</Text>
                <Text style={styles.openNoteTotal}>{nota.precio}</Text>
                <Text style={styles.openNoteLabel}>Clic para continuar</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* --- FILTROS --- */}
      <View style={[styles.filtersRow, isSmallDevice && styles.filtersRowMobile]}>
        <View style={styles.periodButtons}>
          {['Hoy', 'Ayer', 'Semana', 'Mes'].map((periodo) => (
            <TouchableOpacity
              key={periodo}
              onPress={() => setSelectedPeriod(periodo)}
              style={{flex: isSmallDevice ? 1 : 0}}
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
        
        <View style={[styles.searchBox, isSmallDevice && { width: '100%', marginTop: 10 }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {/* --- TABS --- */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsContainer}>
          {['Totales del Día', 'Notas de Venta', 'Cobros', 'Gastos'].map((tab, index) => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, index > 0 && styles.tabButtonSpacing]}
              activeOpacity={0.7}
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
        </View>
      </View>

      {/* --- STATS CARDS --- */}
      <View style={styles.statsGrid}>
        <TouchableOpacity 
          style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]} 
          onPress={() => setActiveTab('Notas de Venta')}
        >
          <StatsCard 
            title="Ventas Hoy"
            value={`${totalVentas.toFixed(2).replace('.', ',')} €`}
            change="+12% vs ayer"
            changeColor="#91e600"
            bgGradient={true}
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]} 
          onPress={() => setActiveTab('Gastos')}
        >
          <StatsCard 
            title="Gastos Hoy"
            value={`${totalGastos.toFixed(2).replace('.', ',')} €`}
            change="-8% vs ayer"
            changeColor="#f59f0a"
            titleBg="#0C2ABF"
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]} 
          onPress={() => setActiveTab('Notas de Venta')}
        >
          <StatsCard 
            title="Nº de Ventas"
            value={numeroVentas.toString()}
            change={ventasPendientes > 0 ? `${ventasPendientes} pendientes` : '+2 vs ayer'}
            changeColor="#91e600"
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]} 
          onPress={() => navigation.navigate('Clientes')}
        >
          <StatsCard 
            title="Clientes"
            value={clientesVisitadosHoy.toString()}
            change="Objetivo: 15"
            changeColor="#697b92"
          />
        </TouchableOpacity>
      </View>

      {/* --- CONTENT PANELS --- */}
      {activeTab === 'Totales del Día' && (
        <View style={styles.contentGrid}>
          {/* Panel Izquierdo */}
          <View style={[styles.panelWrapper, isTablet ? { flex: 1 } : { width: '100%' }]}>
            <ContentPanel title="Notas de Venta">
              {filteredNotasVenta.length === 0 ? (
                 <Text style={styles.emptyText}>No hay ventas hoy</Text>
              ) : (
                filteredNotasVenta.slice(0, 5).map((nota) => (
                  <TouchableOpacity 
                    key={nota.id} 
                    onPress={() => navigation.navigate('VerNota', { notaId: nota.id })}
                  >
                    <NotaVentaItem {...nota} />
                  </TouchableOpacity>
                ))
              )}
              {filteredNotasVenta.length > 5 && (
                <TouchableOpacity 
                  style={styles.seeAllButton}
                  onPress={() => setActiveTab('Notas de Venta')}
                >
                  <Text style={styles.seeAllText}>Ver todas ({filteredNotasVenta.length})</Text>
                </TouchableOpacity>
              )}
            </ContentPanel>
          </View>

          {/* Panel Derecho */}
          <View style={[styles.panelWrapper, isTablet ? { flex: 1 } : { width: '100%' }]}>
            <ContentPanel title="Gastos">
              {filteredGastos.length === 0 ? (
                 <Text style={styles.emptyText}>No hay gastos hoy</Text>
              ) : (
                filteredGastos.slice(0, 5).map((gasto) => (
                  <TouchableOpacity 
                    key={gasto.id}
                    onPress={() => navigation.navigate('Gastos')}
                  >
                    <GastoItem {...gasto} imagen={imgRectangle26} />
                  </TouchableOpacity>
                ))
              )}
            </ContentPanel>
          </View>
        </View>
      )}

      {activeTab === 'Notas de Venta' && (
        <View style={styles.fullWidthPanel}>
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
        </View>
      )}

      {activeTab === 'Gastos' && (
        <View style={styles.fullWidthPanel}>
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
        </View>
      )}
      </View>
    </ScreenWithSidebar>
  );
}

// --- COMPONENTES AUXILIARES ---

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
        <Text style={styles.statBadgeText} numberOfLines={1}>{title}</Text>
      </View>
      <Text style={[styles.statValue, bgGradient && { color: '#ffffff' }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statChange, { color: changeColor }]} numberOfLines={1}>{change}</Text>
    </View>
  );
}

function ContentPanel({ title, children, onAdd }: { title: string; children: React.ReactNode; onAdd?: () => void }) {
  const navigation = useNavigation<any>();
  
  const handleAdd = () => {
    console.log('handleAdd llamado, title:', title);
    const titleLower = title.toLowerCase();
    if (titleLower.includes('venta')) {
      console.log('Navegando a Ventas');
      try {
        navigation.navigate('Ventas');
      } catch (error) {
        console.error('Error al navegar:', error);
      }
    } else if (titleLower.includes('gasto')) {
      console.log('Navegando a Gastos');
      try {
        navigation.navigate('Gastos');
      } catch (error) {
        console.error('Error al navegar:', error);
      }
    } else if (onAdd) {
      onAdd();
    }
  };
  
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
            <Text style={styles.panelIcon}>📊</Text>
            <Text style={styles.panelTitle}>{title}</Text>
        </View>
        <TouchableOpacity 
          style={styles.panelAddButton} 
          onPress={handleAdd}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
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
      <View style={{flex:1}}>
        <Text style={styles.notaId}>{id}</Text>
        <Text style={styles.notaCliente} numberOfLines={1}>{cliente}</Text>
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
        <Text style={styles.gastoNombre} numberOfLines={1}>{nombre}</Text>
        <Text style={styles.gastoCategoria}>{categoria}</Text>
      </View>
      <Text style={styles.gastoPrecio}>{precio}</Text>
    </View>
  );
}

// --- ESTILOS ---

const styles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
    width: '100%',
  },
  header: {
    paddingVertical: 20,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#092090',
    borderRadius: 30,
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 13,
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
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  exportIcon: {
    fontSize: 14,
  },
  exportText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  // CORRECCIÓN PARA FILTROS SUPERPUESTOS
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Permite que el buscador baje si no hay espacio
    gap: 16,
    marginVertical: 24,
    alignItems: 'center',
  },
  filtersRowMobile: {
    flexDirection: 'column',
    gap: 10
  },
  periodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Permite que los botones de fecha se acomoden en varias líneas
    gap: 8,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    minWidth: 60, // Ancho mínimo para evitar colapsos
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    paddingVertical: 8, // Igualar padding para evitar saltos
    paddingHorizontal: 16,
    borderRadius: 30,
    minWidth: 60,
    alignItems: 'center'
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#697b92',
  },
  periodTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  // CORRECCIÓN PARA EL BUSCADOR (para que no aplaste los filtros)
  searchBox: {
    flex: 1, // Toma el espacio restante
    minWidth: 200, // Pero no menos de 200px
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
    padding: 0,
  },
  tabsWrapper: {
    marginBottom: 20,
    marginTop: 0,
    width: '100%',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tabButton: {
    flexShrink: 0,
    marginRight: 12,
  },
  tabButtonSpacing: {
    marginLeft: 0,
  },
  filterTab: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#092090',
    backgroundColor: 'transparent',
    minWidth: 'auto',
  },
  filterTabActive: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 30,
    minWidth: 'auto',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#092090',
  },
  filterTabTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  // GRID SYSTEM
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12, // Gap funciona en RN >= 0.71
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statWrapper: {
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    minHeight: 130,
    justifyContent: 'space-between'
  },
  statCardGradient: {
    borderWidth: 0,
    overflow: 'hidden',
  },
  statBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // CONTENT LAYOUT
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  panelWrapper: {
    marginBottom: 20,
  },
  fullWidthPanel: {
    width: '100%',
    marginBottom: 20
  },
  panel: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 20,
    // Responsive width handled by wrapper
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  panelIcon: {
    fontSize: 18,
    marginRight: 8
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  panelAddButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0C2ABF',
    borderRadius: 20,
  },
  panelAddText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  panelContent: {
    gap: 12,
  },
  // ITEMS
  notaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  notaId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  notaCliente: {
    fontSize: 13,
    color: '#64748b',
  },
  notaPrecio: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0C2ABF',
  },
  gastoItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  gastoImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  gastoInfo: {
    flex: 1,
  },
  gastoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  gastoCategoria: {
    fontSize: 12,
    color: '#64748b',
  },
  gastoPrecio: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f59e0b',
  },
  seeAllButton: {
    width: '100%',
    padding: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#092090',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginVertical: 20,
    fontStyle: 'italic'
  },
  totalPanel: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalPanelLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4
  },
  totalPanelValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalPanelRight: {
    alignItems: 'flex-end',
  },
  alertContainer: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#f97316',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 0
  },
  alertTitle: {
    color: '#c2410c',
    fontWeight: '700',
    fontSize: 14
  },
  openNoteCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    minWidth: 140
  },
  openNoteClient: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: 13,
    marginBottom: 4
  },
  openNoteTotal: {
    fontWeight: '700',
    color: '#f97316',
    fontSize: 14
  },
  openNoteLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4
  },
});   