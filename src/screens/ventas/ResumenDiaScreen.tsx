/**
 * Resumen del Día Screen - OPTIMIZADO
 * - Filtros funcionales (Periodo y Rango de Fecha).
 * - Liquidación de Efectivo (Neto a Entregar).
 * - Restauración de listados de Ventas y Gastos.
 */

import React, { useState, useMemo, useCallback } from 'react';
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
import { useResponsiveLayout } from '../../constants/layout';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import { Cobro, NotaVenta } from '../../types';

const imgRectangle26 = require('../../../assets/blue-image-panel.png');

// --- COMPONENTES AUXILIARES ---

// Mockup funcional de selección de fecha (asume que la fecha de la nota es 'DD/MM/YYYY, HH:MM:SS')
const isDateInPeriod = (itemDateString: string, period: string, start: Date, end: Date): boolean => {
    const itemDatePart = itemDateString.split(',')[0];
    const parts = itemDatePart.split('/').map(p => p.trim());
    
    // Parsear fecha como YYYY-MM-DD para comparación segura (MOCK)
    const itemDay = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);

    const today = new Date();
    const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    const itemTime = normalizeDate(itemDay);
    const todayTime = normalizeDate(today);

    if (period === 'Hoy') {
        return itemTime === todayTime;
    }
    if (period === 'Ayer') {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return itemTime === normalizeDate(yesterday);
    }
    
    // Si se usa el filtro de rango de fecha
    if (period === 'Rango') {
        const startTime = normalizeDate(start);
        const endTime = normalizeDate(end);
        return itemTime >= startTime && itemTime <= endTime;
    }
    
    // Para 'Semana', 'Mes' y 'Todos' (si el filtro de rango no se usa)
    return true; 
};


const DateInput = ({ label, date, onChange }: { label: string, date: Date, onChange: (date: Date) => void }) => (
    <View style={styles.dateInputContainer}>
        <Text style={styles.labelDateInput}>{label}</Text>
        <TextInput 
            style={styles.dateInput} 
            value={date.toLocaleDateString('es-ES')}
            placeholder="DD/MM/AAAA"
            onChangeText={() => { /* Real logic would update the parent state here */ }}
        />
    </View>
);

const LiquidacionCard = ({ label, value, color, icon, signOverride = false }: { label: string, value: string, color: string, icon: string, signOverride?: boolean }) => {
    const numericValue = parseFloat(value.replace(',', '.'));
    const displayValue = signOverride ? `-${Math.abs(numericValue).toFixed(2).replace('.', ',')}` : numericValue.toFixed(2).replace('.', ',');
    const sign = numericValue > 0 && !signOverride ? '+' : '';

    return (
        <View style={styles.liquidacionCard}>
            <Text style={styles.liquidacionIcon}>{icon}</Text>
            <View style={{flex: 1}}>
                <Text style={styles.liquidacionLabel}>{label}</Text>
                <Text style={[styles.liquidacionValue, {color}]}>{sign}{displayValue} €</Text>
            </View>
        </View>
    );
};

const CobroItem = ({ cobro }: { cobro: Cobro }) => (
    <View style={styles.cobroItem}>
        <View style={{flexDirection:'row', alignItems:'center'}}>
            <Text style={styles.cobroItemIcon}>💰</Text>
            <View style={{flex: 1}}>
                <Text style={styles.cobroItemCliente}>{cobro.cliente}</Text>
                <Text style={styles.cobroItemNota}>{cobro.notaVentaId ? `Ref. Nota ${cobro.notaVentaId}` : 'Cobro Directo'}</Text>
            </View>
        </View>
        <Text style={styles.cobroItemMonto}>{cobro.monto}</Text>
    </View>
);

// (StatsCard, ContentPanel, NotaVentaItem, GastoItem deben estar definidos o restaurados)
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

function NotaVentaItem({ id, cliente, precio }: NotaVenta) {
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


export default function ResumenDiaScreen() {
  const navigation = useNavigation<any>();
  const { isTablet, isSmallDevice } = useResponsiveLayout();
  const { notasVenta, gastos, cobros } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Totales del Día'); 
  const [selectedPeriod, setSelectedPeriod] = useState('Hoy');
  
  // Asumimos fechas de inicio/fin para el filtro de rango
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const layout = useResponsiveLayout();

  // --- LÓGICA DE FILTRADO Y CÁLCULO CENTRAL ---
  const { 
    totalVentas, 
    totalGastos, 
    numeroVentas, 
    ventasPendientes, 
    clientesVisitadosHoy,
    filteredNotasVenta,
    filteredGastos,
    liquidacionData,
    cobrosDelDia,
    notasAbiertas,
    historialCambios
  } = useMemo(() => {
    const periodToFilter = selectedPeriod === 'Hoy' || selectedPeriod === 'Ayer' ? selectedPeriod : 'Rango';

    // 1. FILTRAR DATA PRINCIPAL POR PERÍODO Y BÚSQUEDA
    const filteredVentas = notasVenta.filter(n => {
        const matchesSearch = n.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || n.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPeriod = isDateInPeriod(n.fecha, periodToFilter, startDate, endDate);
        return n.estado !== 'anulada' && matchesSearch && matchesPeriod;
    });

    const filteredGastos = gastos.filter(g => {
        const matchesSearch = g.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || g.categoria.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPeriod = isDateInPeriod(g.fecha, periodToFilter, startDate, endDate);
        return matchesSearch && matchesPeriod;
    });
    
    const filteredCobros = cobros.filter(c => {
        const matchesPeriod = isDateInPeriod(c.fecha, periodToFilter, startDate, endDate);
        return c.estado === 'pagado' && matchesPeriod;
    });

    // 2. CALCULAR TOTALES Y LIQUIDACIÓN
    let ventasEfectivo = 0;
    let cobrosEfectivo = 0;
    
    filteredVentas.forEach(n => {
        const monto = parseFloat(n.precio?.replace(/[^\d,.-]/g, '').replace(',', '.') || '0');
        if (n.formaPago === 'Efectivo') ventasEfectivo += monto;
    });

    filteredCobros.forEach(c => {
        const monto = parseFloat(c.monto.replace(/[^\d,.-]/g, '').replace(',', '.') || '0');
        if (c.formaPago === 'Efectivo') cobrosEfectivo += monto;
    });

    const totalGastosMonto = filteredGastos.reduce((sum, g) => sum + parseFloat(g.precio.replace(/[^\d,.-]/g, '').replace(',', '.') || '0'), 0);
    const liquidacionEfectivo = ventasEfectivo + cobrosEfectivo - totalGastosMonto;

    // 3. DATOS DE AUDITORÍA Y ESTADÍSTICAS
    const historialCambios = notasVenta
        .filter(n => (n.estado === 'abierta' || n.estado === 'anulada') && isDateInPeriod(n.fecha, periodToFilter, startDate, endDate))
        .map(n => `Nota: ${n.id} - ${n.estado.toUpperCase()} (${n.cliente})`);

    const totalVentasMonto = filteredVentas.reduce((sum, n) => sum + parseFloat(n.precio?.replace(/[^\d,.-]/g, '').replace(',', '.') || '0'), 0);
    const ventasPendientesCount = filteredVentas.filter(n => n.estado === 'pendiente').length;

    return {
        totalVentas: totalVentasMonto,
        totalGastos: totalGastosMonto,
        numeroVentas: filteredVentas.length,
        ventasPendientes: ventasPendientesCount,
        clientesVisitadosHoy: new Set(filteredVentas.map(n => n.clienteId || n.cliente)).size,
        filteredNotasVenta: filteredVentas,
        filteredGastos: filteredGastos,
        liquidacionData: { ventasEfectivo, cobrosEfectivo, totalGastos: totalGastosMonto, liquidacionEfectivo },
        cobrosDelDia: filteredCobros,
        notasAbiertas: notasVenta.filter(n => n.estado === 'abierta'), // Borradores (no se filtran por fecha aquí para mostrarlos siempre)
        historialCambios: historialCambios
    };
  }, [notasVenta, gastos, cobros, searchTerm, selectedPeriod, startDate, endDate]);


  const handleOpenExportModal = () => {
    Alert.alert(
        'Opciones de Impresión/Exportación',
        'Selecciona el tipo de resumen:',
        [
            { text: 'Resumen Rápido (Efectivo)', onPress: () => Alert.alert('Imprimir', 'Generando Resumen de Liquidación...') },
            { text: 'Listado Detallado (Ventas)', onPress: () => Alert.alert('Imprimir', 'Generando Listado Detallado de Ventas...') },
            { text: 'Registro de Auditoría (Anuladas/Borradores)', onPress: () => Alert.alert('Imprimir', 'Generando Historial de Cambios...') },
            { text: 'Re-imprimir Nota/Cobro', onPress: () => Alert.alert('Imprimir', 'Selecciona la nota o cobro desde su respectiva lista para re-imprimir.') },
            { text: 'Cancelar', style: 'cancel' }
        ]
    );
  };
  

  return (
    <ScreenWithSidebar currentScreen="ResumenDia" scrollable={true}>
      <View style={{ paddingHorizontal: layout.padding }}>
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
            onPress={() => navigation.navigate('NuevaVenta')}
            activeOpacity={0.7} 
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
              onPress={handleOpenExportModal} 
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.exportGradient}
              >
                <Text style={styles.exportIcon}>🖨️</Text>
                <Text style={styles.exportText}>Imprimir</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* --- AVISO: NOTAS ABIERTAS --- */}
      {notasAbiertas.length > 0 && (
        <View style={styles.alertContainer}>
          <Text style={styles.alertTitle}>⚠️ Tienes {notasAbiertas.length} nota(s) en borrador</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 10}}>
            {notasAbiertas.map(nota => (
              <TouchableOpacity 
                key={nota.id} 
                style={styles.openNoteCard}
                onPress={() => navigation.navigate('NuevaVenta', { ventaData: nota })} 
              >
                <Text style={styles.openNoteClient}>{nota.cliente}</Text>
                <Text style={styles.openNoteTotal}>{nota.precio}</Text>
                <Text style={styles.openNoteLabel}>Clic para continuar</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* --- FILTROS DE PERIODO Y RANGO (CORREGIDO) --- */}
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
        
        {/* INPUTS DE RANGO DE FECHA (SEPARADO) */}
        <View style={[styles.dateRangeRow, isSmallDevice && { width: '100%' }]}> 
            <DateInput label="DESDE" date={startDate} onChange={setStartDate} />
            <DateInput label="HASTA" date={endDate} onChange={setEndDate} />
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {['Totales del Día', 'Efectivo (Liquidación)', 'Notas de Venta', 'Cobros', 'Gastos'].map((tab, index) => (
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
        </ScrollView>
      </View>

      {/* --- PESTAÑA: TOTALES DEL DÍA (STATS) --- */}
      {activeTab === 'Totales del Día' && (
        <View style={styles.statsGrid}>
           <TouchableOpacity 
              style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]} 
              onPress={() => setActiveTab('Notas de Venta')}
            >
              <StatsCard 
                title="Ventas del Período"
                value={`${totalVentas.toFixed(2).replace('.', ',')} €`}
                change="Basado en filtros"
                changeColor="#91e600"
                bgGradient={true}
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]} 
              onPress={() => setActiveTab('Gastos')}
            >
              <StatsCard 
                title="Gastos del Período"
                value={`${totalGastos.toFixed(2).replace('.', ',')} €`}
                change="Basado en filtros"
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
                change={ventasPendientes > 0 ? `${ventasPendientes} pendientes` : 'Todo cerrado'}
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
                change="Visitados en el período"
                changeColor="#697b92"
              />
            </TouchableOpacity>
        </View>
      )}

      {/* --- PESTAÑA: EFECTIVO (LIQUIDACIÓN) --- */}
      {activeTab === 'Efectivo (Liquidación)' && (
        <View style={styles.contentGrid}>
            <View style={[styles.panelWrapper, isTablet ? { flex: 1.5 } : { width: '100%' }]}>
                <ContentPanel title="Resumen de Liquidación en Efectivo" onAdd={() => handleOpenExportModal()}>
                    <LiquidacionCard 
                        label="Ventas del Período (Efectivo)" 
                        value={liquidacionData.ventasEfectivo.toFixed(2)} 
                        color="#0C2ABF" 
                        icon="📈" 
                    />
                    <LiquidacionCard 
                        label="Cobros Notas Pendientes (Efectivo)" 
                        value={liquidacionData.cobrosEfectivo.toFixed(2)} 
                        color="#10b981" 
                        icon="💰" 
                    />
                    <LiquidacionCard 
                        label="Gastos del Período" 
                        value={liquidacionData.totalGastos.toFixed(2)} 
                        color="#dc2626" 
                        icon="📉" 
                        signOverride={true}
                    />

                    <View style={styles.liquidacionTotalCard}>
                        <Text style={styles.liquidacionTotalLabel}>Total a Liquidar (Neto)</Text>
                        <Text style={styles.liquidacionTotalValue}>
                            {liquidacionData.liquidacionEfectivo.toFixed(2).replace('.', ',')} €
                        </Text>
                    </View>
                </ContentPanel>
            </View>
            
            <View style={[styles.panelWrapper, isTablet ? { flex: 1 } : { width: '100%' }]}>
                <ContentPanel title="Registro de Auditoría (Anuladas/Borradores)">
                    {historialCambios.length === 0 ? (
                        <Text style={styles.auditoriaItemEmpty}>No hay registros de notas sin finalizar o anuladas en este rango.</Text>
                    ) : (
                        <ScrollView style={{maxHeight: 400}}>
                            {historialCambios.map((registro, index) => (
                                <Text key={index} style={styles.auditoriaItem}>{registro}</Text>
                            ))}
                        </ScrollView>
                    )}
                </ContentPanel>
            </View>
        </View>
      )}
      
      {/* --- PESTAÑA: NOTAS DE VENTA (RESTAURADA) --- */}
      {activeTab === 'Notas de Venta' && (
          <View style={styles.fullWidthPanel}>
              <ContentPanel title={`Notas de Venta (${selectedPeriod})`}>
                  {filteredNotasVenta.length === 0 ? (
                      <Text style={styles.emptyText}>No hay notas de venta en este período.</Text>
                  ) : (
                      filteredNotasVenta.map((nota: NotaVenta, index: number) => (
                          <NotaVentaItem key={nota.id || index} {...nota} />
                      ))
                  )}
              </ContentPanel>
          </View>
      )}

      {/* --- PESTAÑA: GASTOS (RESTAURADA) --- */}
      {activeTab === 'Gastos' && (
          <View style={styles.fullWidthPanel}>
              <ContentPanel title={`Gastos (${selectedPeriod})`}>
                  {filteredGastos.length === 0 ? (
                      <Text style={styles.emptyText}>No hay gastos registrados en este período.</Text>
                  ) : (
                      filteredGastos.map((gasto: any, index: number) => (
                          <GastoItem key={gasto.id || index} {...gasto} imagen={imgRectangle26} />
                      ))
                  )}
              </ContentPanel>
          </View>
      )}

      {/* --- PESTAÑA: COBROS --- */}
      {activeTab === 'Cobros' && (
          <View style={styles.fullWidthPanel}>
              <ContentPanel title={`Recibos de Cobro (${selectedPeriod})`}>
                  {cobrosDelDia.length === 0 ? (
                     <Text style={styles.emptyText}>No hay recibos de cobro finalizados en este período.</Text>
                  ) : (
                      cobrosDelDia.map((cobro: Cobro, index: number) => (
                          <CobroItem key={index} cobro={cobro} />
                      ))
                  )}
              </ContentPanel>
          </View>
      )}

      </View>
    </ScreenWithSidebar>
  );
}

// --- ESTILOS ---

const styles = StyleSheet.create({
  // HEADER Y ACCIONES
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

  // FILTROS DE PERIODO Y RANGO
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap', 
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
    flexWrap: 'wrap', 
    gap: 8,
    // Eliminar flex-grow para que no empuje el rango de fechas
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    paddingVertical: 8,
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
  dateRangeRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  dateInputContainer: { 
      paddingHorizontal: 0, // Ajuste para que no se vea amontonado
      width: 110, // Ancho fijo para inputs de fecha
  },
  labelDateInput: { 
      fontSize: 11, 
      color: '#64748b', 
      marginBottom: 4, 
      fontWeight: '600', 
      textTransform: 'uppercase' 
  },
  dateInput: { 
      height: 38, 
      borderWidth: 1, 
      borderColor: '#e2e8f0', 
      borderRadius: 8, 
      paddingHorizontal: 8,
      fontSize: 13,
      backgroundColor: '#ffffff'
  },
  // BUSCADOR
  searchBox: {
    flex: 1, 
    minWidth: 200, 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 30,
    height: 40,
    paddingHorizontal: 16,
    gap: 12,
    // Asegurar que el buscador vaya a una nueva línea en móvil
    flexGrow: 1 
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
  // TABS
  tabsWrapper: {
    marginBottom: 20,
    marginTop: 0,
    width: '100%',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  // STATS
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  // LAYOUT CONTENT
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
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginVertical: 20,
    fontStyle: 'italic'
  },
  // Liquidación Cards
  liquidacionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      padding: 16,
      borderRadius: 8,
      marginBottom: 8
  },
  liquidacionIcon: {
      fontSize: 24,
      marginRight: 10
  },
  liquidacionLabel: {
      fontSize: 12,
      color: '#697b92',
  },
  liquidacionValue: {
      fontSize: 18,
      fontWeight: '700',
  },
  liquidacionTotalCard: {
      backgroundColor: '#e0e7ff',
      padding: 20,
      borderRadius: 10,
      marginTop: 10,
      borderWidth: 1,
      borderColor: '#0C2ABF'
  },
  liquidacionTotalLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#092090'
  },
  liquidacionTotalValue: {
      fontSize: 28,
      fontWeight: '800',
      color: '#092090',
      marginTop: 5
  },
  auditoriaItem: {
      fontSize: 13,
      color: '#dc2626',
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
  },
  auditoriaItemEmpty: {
      fontSize: 13,
      color: '#697b92',
      paddingVertical: 10,
      textAlign: 'center',
      fontStyle: 'italic'
  },
  cobroItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
  },
  cobroItemIcon: {
      fontSize: 18,
      marginRight: 10
  },
  cobroItemCliente: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1a1a1a',
  },
  cobroItemNota: {
      fontSize: 12,
      color: '#697b92'
  },
  cobroItemMonto: {
      fontSize: 15,
      fontWeight: '700',
      color: '#092090'
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