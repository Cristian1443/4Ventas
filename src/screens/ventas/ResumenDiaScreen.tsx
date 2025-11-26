/**
 * Resumen del Día Screen - FIX DE FECHAS
 * Se asegura que las fechas manuales (DD/MM/YYYY) se comparen correctamente.
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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useResponsiveLayout } from '../../constants/layout';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import { Cobro, NotaVenta } from '../../types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const imgRectangle26 = require('../../../assets/blue-image-panel.png');

// --- HELPERS ---

// FIX: Parseo robusto de fechas que maneja múltiples formatos
const parseDateString = (dateStr: string): number => {
    if (!dateStr) return 0;
    
    try {
        // Intentar parsear como Date ISO string primero
        if (dateStr.includes('T') || dateStr.includes('Z')) {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
                return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
            }
        }
        
        // Formato "DD/MM/YYYY, HH:MM:SS" o "DD/MM/YYYY, HH:MM" o "DD/MM/YYYY"
        const part = dateStr.split(',')[0].trim();
        const parts = part.split('/');
        
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            
            if (day && month && year && year > 1900 && year < 2100) {
                // Crear fecha a medianoche local
                return new Date(year, month - 1, day).getTime();
            }
        }
        
        // Intentar parsear como fecha estándar de JavaScript
        const fallbackDate = new Date(dateStr);
        if (!isNaN(fallbackDate.getTime())) {
            return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate()).getTime();
        }
    } catch (error) {
        console.warn('Error parseando fecha:', dateStr, error);
    }
    
    return 0;
};

const isDateInPeriod = (itemDateString: string, period: string, start: Date, end: Date): boolean => {
    const itemTime = parseDateString(itemDateString);
    if (itemTime === 0) {
        // Si no se puede parsear, intentar incluir el item por defecto para no perder datos
        console.warn('No se pudo parsear fecha:', itemDateString);
        return true; // Incluir por defecto para no perder datos
    }

    const now = new Date();
    const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (period === 'Hoy') {
        return itemTime === todayTime;
    }
    if (period === 'Ayer') {
        const yesterday = new Date(todayTime);
        yesterday.setDate(yesterday.getDate() - 1);
        return itemTime === yesterday.getTime();
    }
    if (period === 'Semana') {
        const weekAgo = new Date(todayTime);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return itemTime >= weekAgo.getTime() && itemTime <= todayTime;
    }
    if (period === 'Mes') {
        const monthAgo = new Date(todayTime);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return itemTime >= monthAgo.getTime() && itemTime <= todayTime;
    }
    if (period === 'Rango') {
        const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
        const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
        return itemTime >= startTime && itemTime <= endTime;
    }
    
    return true;
};

const DateInput = ({ label, date, onChange }: { label: string, date: Date, onChange: (date: Date) => void }) => (
    <View style={styles.dateInputContainer}>
        <Text style={styles.labelDateInput}>{label}</Text>
        <TouchableOpacity 
            style={styles.dateInput} 
            onPress={() => {/* Aquí iría un DateTimePicker real, simplificado por ahora */}}
        >
            <Text style={{color:'#333'}}>{date.toLocaleDateString('es-ES')}</Text>
        </TouchableOpacity>
    </View>
);

const LiquidacionCard = ({ label, value, color, icon, signOverride = false }: any) => {
    const numericValue = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
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

// Componentes Auxiliares (Restaurados)
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

function ContentPanel({ title, children, onAdd }: any) {
  const navigation = useNavigation<any>();
  const handleAdd = () => {
    if (title.includes('Ventas')) navigation.navigate('NuevaVenta');
    else if (title.includes('Gastos')) navigation.navigate('Gastos');
    else if (onAdd) onAdd();
  };
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
            <Text style={styles.panelIcon}>📊</Text>
            <Text style={styles.panelTitle}>{title}</Text>
        </View>
        <TouchableOpacity style={styles.panelAddButton} onPress={handleAdd}>
          <Text style={styles.panelAddText}>+ Añadir</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.panelContent}>{children}</View>
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

function CobroItem({ cobro }: { cobro: Cobro }) {
    return (
        <View style={styles.cobroItem}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                <Text style={styles.cobroItemIcon}>💰</Text>
                <View style={{flex: 1}}>
                    <Text style={styles.cobroItemCliente}>{cobro.cliente}</Text>
                    <Text style={styles.cobroItemNota}>{cobro.notaVentaId ? `Ref. ${cobro.notaVentaId}` : 'Directo'}</Text>
                </View>
            </View>
            <Text style={styles.cobroItemMonto}>{cobro.monto}</Text>
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
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const layout = useResponsiveLayout();

  const { 
    totalVentas, totalGastos, numeroVentas, ventasPendientes, clientesVisitadosHoy,
    filteredNotasVenta, filteredGastos, liquidacionData, cobrosDelDia, notasAbiertas, historialCambios
  } = useMemo(() => {
    // Usar el período seleccionado directamente, o 'Rango' si es necesario
    const periodToFilter = (selectedPeriod === 'Hoy' || selectedPeriod === 'Ayer' || selectedPeriod === 'Semana' || selectedPeriod === 'Mes') 
      ? selectedPeriod 
      : 'Rango';

    // Filtros
    const filteredVentas = notasVenta.filter(n => {
        const matchesSearch = n.cliente.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPeriod = isDateInPeriod(n.fecha || '', periodToFilter, startDate, endDate);
        return n.estado !== 'anulada' && matchesSearch && matchesPeriod;
    });

    const filteredGastosCalc = gastos.filter(g => {
        const matchesSearch = g.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPeriod = isDateInPeriod(g.fecha || '', periodToFilter, startDate, endDate);
        return matchesSearch && matchesPeriod;
    });
    
    const filteredCobros = cobros.filter(c => {
        const matchesPeriod = isDateInPeriod(c.fecha || '', periodToFilter, startDate, endDate);
        return c.estado === 'pagado' && matchesPeriod;
    });

    // Helper para parsear precios correctamente
    const parsePrecio = (valor: string): number => {
        if (!valor) return 0;
        let sanitized = valor.replace(/[€\s]/g, '').trim();
        const tieneComa = sanitized.includes(',');
        const tienePunto = sanitized.includes('.');
        
        if (tieneComa && tienePunto) {
            // Formato: "7.563,00" -> punto es miles, coma es decimal
            sanitized = sanitized.replace(/\./g, '').replace(',', '.');
        } else if (tieneComa) {
            // Formato: "75,63" -> coma es decimal
            sanitized = sanitized.replace(',', '.');
        }
        // Si solo tiene punto, ya está bien
        
        const parsed = parseFloat(sanitized);
        return isNaN(parsed) ? 0 : parsed;
    };

    // Totales
    let ventasEfectivo = 0;
    let cobrosEfectivo = 0;
    
    filteredVentas.forEach(n => {
        const monto = parsePrecio(n.precio || '0');
        if (n.formaPago === 'Efectivo') ventasEfectivo += monto;
    });

    filteredCobros.forEach(c => {
        const monto = parsePrecio(c.monto || '0');
        if (c.formaPago === 'Efectivo') cobrosEfectivo += monto;
    });

    const totalGastosMonto = filteredGastosCalc.reduce((sum, g) => sum + parsePrecio(g.precio || '0'), 0);
    const liquidacionEfectivo = ventasEfectivo + cobrosEfectivo - totalGastosMonto;

    const totalVentasMonto = filteredVentas.reduce((sum, n) => sum + parsePrecio(n.precio || '0'), 0);

    return {
        totalVentas: totalVentasMonto,
        totalGastos: totalGastosMonto,
        numeroVentas: filteredVentas.length,
        ventasPendientes: filteredVentas.filter(n => n.estado === 'pendiente').length,
        clientesVisitadosHoy: new Set(filteredVentas.map(n => n.clienteId || n.cliente)).size,
        filteredNotasVenta: filteredVentas,
        filteredGastos: filteredGastosCalc,
        liquidacionData: { ventasEfectivo, cobrosEfectivo, totalGastos: totalGastosMonto, liquidacionEfectivo },
        cobrosDelDia: filteredCobros,
        notasAbiertas: notasVenta.filter(n => n.estado === 'abierta'),
        historialCambios: [] // Simplificado para ejemplo
    };
  }, [notasVenta, gastos, cobros, searchTerm, selectedPeriod, startDate, endDate]);

  // Función para generar HTML del informe del día
  const generarHTMLInforme = () => {
    const fechaInforme = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const notasHTML = filteredNotasVenta.map(n => `
      <tr>
        <td style="padding: 4px 0;">${n.id}</td>
        <td style="padding: 4px 0;">${n.cliente}</td>
        <td style="text-align: right; padding: 4px 0;">${n.precio}</td>
        <td style="text-align: center; padding: 4px 0;">${n.estado || 'cerrada'}</td>
      </tr>
    `).join('');

    const gastosHTML = filteredGastos.map(g => `
      <tr>
        <td style="padding: 4px 0;">${g.nombre}</td>
        <td style="padding: 4px 0;">${g.categoria}</td>
        <td style="text-align: right; padding: 4px 0;">${g.precio}</td>
      </tr>
    `).join('');

    const cobrosHTML = cobrosDelDia.map(c => `
      <tr>
        <td style="padding: 4px 0;">${c.cliente}</td>
        <td style="text-align: right; padding: 4px 0;">${c.monto}</td>
        <td style="text-align: center; padding: 4px 0;">${c.formaPago || 'Efectivo'}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Arial', sans-serif; font-size: 11px; line-height: 1.4; margin: 0; padding: 0; color: #000; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #0C2ABF; padding-bottom: 10px; }
            .header h1 { margin: 0; font-size: 20px; font-weight: bold; color: #0C2ABF; }
            .header h2 { margin: 5px 0 0 0; font-size: 14px; color: #697b92; }
            .section { margin: 20px 0; }
            .section-title { font-size: 16px; font-weight: bold; color: #0C2ABF; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
            .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 15px 0; }
            .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .stat-label { font-size: 11px; color: #697b92; margin-bottom: 5px; }
            .stat-value { font-size: 18px; font-weight: bold; color: #0C2ABF; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            table th { background: #0C2ABF; color: #fff; padding: 8px; text-align: left; font-size: 10px; font-weight: bold; }
            table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
            table tr:nth-child(even) { background: #f8fafc; }
            .total-box { background: #e0e7ff; border: 2px solid #0C2ABF; border-radius: 8px; padding: 15px; margin: 15px 0; }
            .total-label { font-size: 14px; font-weight: bold; color: #092090; }
            .total-value { font-size: 24px; font-weight: bold; color: #092090; margin-top: 5px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #697b92; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INFORME DEL DÍA</h1>
            <h2>${fechaInforme}</h2>
            <p style="margin: 5px 0; color: #697b92;">Período: ${selectedPeriod}</p>
          </div>

          <div class="section">
            <div class="section-title">📊 Resumen General</div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Total Ventas</div>
                <div class="stat-value">${totalVentas.toFixed(2).replace('.', ',')} €</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Gastos</div>
                <div class="stat-value">${totalGastos.toFixed(2).replace('.', ',')} €</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Número de Ventas</div>
                <div class="stat-value">${numeroVentas}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Clientes Visitados</div>
                <div class="stat-value">${clientesVisitadosHoy}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">💰 Liquidación de Efectivo</div>
            <div style="margin: 10px 0;">
              <p><strong>Ventas en Efectivo:</strong> ${liquidacionData.ventasEfectivo.toFixed(2).replace('.', ',')} €</p>
              <p><strong>Cobros en Efectivo:</strong> ${liquidacionData.cobrosEfectivo.toFixed(2).replace('.', ',')} €</p>
              <p><strong>Gastos del Período:</strong> ${liquidacionData.totalGastos.toFixed(2).replace('.', ',')} €</p>
            </div>
            <div class="total-box">
              <div class="total-label">Total a Liquidar (Neto)</div>
              <div class="total-value">${liquidacionData.liquidacionEfectivo.toFixed(2).replace('.', ',')} €</div>
            </div>
          </div>

          ${filteredNotasVenta.length > 0 ? `
          <div class="section">
            <div class="section-title">📋 Notas de Venta (${filteredNotasVenta.length})</div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th style="text-align: right;">Importe</th>
                  <th style="text-align: center;">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${notasHTML}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${cobrosDelDia.length > 0 ? `
          <div class="section">
            <div class="section-title">💵 Cobros (${cobrosDelDia.length})</div>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th style="text-align: right;">Monto</th>
                  <th style="text-align: center;">Forma de Pago</th>
                </tr>
              </thead>
              <tbody>
                ${cobrosHTML}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${filteredGastos.length > 0 ? `
          <div class="section">
            <div class="section-title">📉 Gastos (${filteredGastos.length})</div>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th style="text-align: right;">Importe</th>
                </tr>
              </thead>
              <tbody>
                ${gastosHTML}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="footer">
            Generado el ${new Date().toLocaleString('es-ES')}<br>
            4VENTAS - Sistema de Gestión
          </div>
        </body>
      </html>
    `;
  };

  // Función para imprimir el informe
  const handleImprimirInforme = async () => {
    try {
      const html = generarHTMLInforme();
      const { uri } = await Print.printToFileAsync({ html });
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Informe del Día - ${selectedPeriod}`
        });
        Alert.alert('Éxito', 'Informe generado y listo para compartir/imprimir');
      } else {
        await Print.printAsync({ uri });
        Alert.alert('Éxito', 'Informe enviado para impresión');
      }
    } catch (error: any) {
      console.error('Error imprimiendo informe:', error);
      Alert.alert('Error', `No se pudo generar el informe: ${error?.message || 'Error desconocido'}`);
    }
  };

  return (
    <ScreenWithSidebar currentScreen="ResumenDia" scrollable={true}>
      <View style={{ paddingHorizontal: layout.padding }}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Resumen del Día</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.printButton} onPress={handleImprimirInforme}>
            <Text style={styles.printButtonIcon}>🖨️</Text>
            <Text style={styles.printButtonText}>Imprimir Informe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('NuevaVenta')}>
            <Text style={styles.actionButtonText}>+ Nueva Venta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Gastos')}>
            <Text style={styles.actionButtonText}>+ Gasto</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTROS */}
      <View style={[styles.filtersRow, isSmallDevice && styles.filtersRowMobile]}>
        <View style={styles.periodButtons}>
          {['Hoy', 'Ayer', 'Semana', 'Mes'].map((periodo) => (
            <TouchableOpacity key={periodo} onPress={() => setSelectedPeriod(periodo)}>
              {selectedPeriod === periodo ? (
                <LinearGradient colors={['#092090', '#0C2ABF']} style={styles.periodButtonActive}>
                  <Text style={styles.periodTextActive}>{periodo}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.periodButton}><Text style={styles.periodText}>{periodo}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.searchBox, isSmallDevice && { width: '100%', marginTop: 10 }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput style={styles.searchInput} placeholder="Buscar..." value={searchTerm} onChangeText={setSearchTerm} />
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['Totales del Día', 'Efectivo (Liquidación)', 'Notas de Venta', 'Cobros', 'Gastos'].map((tab, index) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabButton, index > 0 && styles.tabButtonSpacing]}>
              {activeTab === tab ? (
                <LinearGradient colors={['#092090', '#0C2ABF']} style={styles.filterTabActive}>
                  <Text style={styles.filterTabTextActive}>{tab}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.filterTab}><Text style={styles.filterTabText}>{tab}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* VISTAS SEGÚN TAB */}
      {activeTab === 'Totales del Día' && (
        <View style={styles.statsGrid}>
           <TouchableOpacity style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]} onPress={() => setActiveTab('Notas de Venta')}>
              <StatsCard title="Ventas" value={`${totalVentas.toFixed(2).replace('.', ',')} €`} change="Total Facturado" changeColor="#91e600" bgGradient={true} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]} onPress={() => setActiveTab('Gastos')}>
              <StatsCard title="Gastos" value={`${totalGastos.toFixed(2).replace('.', ',')} €`} change="Total Gastos" changeColor="#f59f0a" titleBg="#0C2ABF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]}>
              <StatsCard title="Nº Ventas" value={numeroVentas.toString()} change={ventasPendientes > 0 ? `${ventasPendientes} pendientes` : 'Cerrado'} changeColor="#91e600" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]}>
              <StatsCard title="Clientes" value={clientesVisitadosHoy.toString()} change="Visitados hoy" changeColor="#697b92" />
            </TouchableOpacity>
        </View>
      )}

      {activeTab === 'Efectivo (Liquidación)' && (
        <View style={styles.fullWidthPanel}>
            <ContentPanel title="Resumen de Liquidación en Efectivo">
                <LiquidacionCard label="Ventas (Efectivo)" value={liquidacionData.ventasEfectivo.toFixed(2)} color="#0C2ABF" icon="📈" />
                <LiquidacionCard label="Cobros Notas (Efectivo)" value={liquidacionData.cobrosEfectivo.toFixed(2)} color="#10b981" icon="💰" />
                <LiquidacionCard label="Gastos del Período" value={liquidacionData.totalGastos.toFixed(2)} color="#dc2626" icon="📉" signOverride={true} />
                <View style={styles.liquidacionTotalCard}>
                    <Text style={styles.liquidacionTotalLabel}>Total a Liquidar (Neto)</Text>
                    <Text style={styles.liquidacionTotalValue}>{liquidacionData.liquidacionEfectivo.toFixed(2).replace('.', ',')} €</Text>
                </View>
            </ContentPanel>
        </View>
      )}
      
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

      {/* Resto de tabs (Notas, Cobros) igual que antes... */}
      {activeTab === 'Notas de Venta' && (
          <View style={styles.fullWidthPanel}>
              <ContentPanel title={`Notas de Venta (${selectedPeriod})`}>
                  {filteredNotasVenta.length === 0 ? <Text style={styles.emptyText}>No hay notas.</Text> : filteredNotasVenta.map((n, i) => <NotaVentaItem key={i} {...n} />)}
              </ContentPanel>
          </View>
      )}
      {activeTab === 'Cobros' && (
          <View style={styles.fullWidthPanel}>
              <ContentPanel title={`Cobros (${selectedPeriod})`}>
                  {cobrosDelDia.length === 0 ? <Text style={styles.emptyText}>No hay cobros.</Text> : cobrosDelDia.map((c, i) => <CobroItem key={i} cobro={c} />)}
              </ContentPanel>
          </View>
      )}

      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  // Estilos base iguales al anterior
  header: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 16 },
  backButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: '#697b92' },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  printButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#0C2ABF', borderRadius: 30 },
  printButtonIcon: { fontSize: 16 },
  printButtonText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  actionButton: { paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#092090', borderRadius: 30 },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: '#092090' },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginVertical: 24, alignItems: 'center' },
  filtersRowMobile: { flexDirection: 'column', gap: 10 },
  periodButtons: { flexDirection: 'row', gap: 8 },
  periodButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 30, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', minWidth: 60, alignItems: 'center' },
  periodButtonActive: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 30, minWidth: 60, alignItems: 'center' },
  periodText: { fontSize: 13, fontWeight: '600', color: '#697b92' },
  periodTextActive: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  searchBox: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 30, height: 40, paddingHorizontal: 16, gap: 12 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a', padding: 0 },
  tabsWrapper: { marginBottom: 20, width: '100%' },
  tabButton: { flexShrink: 0, marginRight: 12 },
  tabButtonSpacing: { marginLeft: 0 },
  filterTab: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 30, borderWidth: 1, borderColor: '#092090' },
  filterTabActive: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 30 },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#092090' },
  filterTabTextActive: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 24 },
  statWrapper: { marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, minHeight: 130, justifyContent: 'space-between' },
  statCardGradient: { borderWidth: 0, overflow: 'hidden' },
  statBadge: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20, marginBottom: 8 },
  statBadgeText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  statChange: { fontSize: 12, fontWeight: '500' },
  fullWidthPanel: { width: '100%', marginBottom: 20 },
  panel: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 20 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  panelIcon: { fontSize: 18, marginRight: 8 },
  panelTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  panelAddButton: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#0C2ABF', borderRadius: 20 },
  panelAddText: { fontSize: 11, fontWeight: '600', color: '#ffffff' },
  panelContent: { gap: 12 },
  notaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, marginBottom: 8 },
  notaId: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  notaCliente: { fontSize: 13, color: '#64748b' },
  notaPrecio: { fontSize: 15, fontWeight: '700', color: '#0C2ABF' },
  gastoItem: { flexDirection: 'row', gap: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8, alignItems: 'center' },
  gastoImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#e2e8f0' },
  gastoInfo: { flex: 1 },
  gastoNombre: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  gastoCategoria: { fontSize: 12, color: '#64748b' },
  gastoPrecio: { fontSize: 15, fontWeight: '700', color: '#f59e0b' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginVertical: 20, fontStyle: 'italic' },
  liquidacionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 8 },
  liquidacionIcon: { fontSize: 24, marginRight: 10 },
  liquidacionLabel: { fontSize: 12, color: '#697b92' },
  liquidacionValue: { fontSize: 18, fontWeight: '700' },
  liquidacionTotalCard: { backgroundColor: '#e0e7ff', padding: 20, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: '#0C2ABF' },
  liquidacionTotalLabel: { fontSize: 16, fontWeight: '600', color: '#092090' },
  liquidacionTotalValue: { fontSize: 28, fontWeight: '800', color: '#092090', marginTop: 5 },
  dateInputContainer: { paddingHorizontal: 0, width: 110 },
  labelDateInput: { fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: '600', textTransform: 'uppercase' },
  dateInput: { height: 38, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 8, backgroundColor: '#ffffff', justifyContent: 'center' },
  cobroItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 8 },
  cobroItemIcon: { fontSize: 18, marginRight: 10 },
  cobroItemCliente: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  cobroItemNota: { fontSize: 12, color: '#697b92' },
  cobroItemMonto: { fontSize: 15, fontWeight: '700', color: '#092090' }
});