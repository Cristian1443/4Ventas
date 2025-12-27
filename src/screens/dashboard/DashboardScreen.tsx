import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useResponsiveLayout } from '../../constants/layout';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
// El vendedor actual se obtiene desde el contexto; no necesitamos leer AsyncStorage aquí.

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const layout = useResponsiveLayout();
  const {
    notasVenta,
    gastos,
    cobros,
    clientes,
    syncStatus,
    modoOffline,
    sincronizar,
    currentVendor
  } = useApp();

  const [refreshing, setRefreshing] = React.useState(false);
  const [vendedorActualId, setVendedorActualId] = useState<string | null>(null);

  // Sincronizar vendedor con el contexto (cambia al cambiar de cuenta)
  useEffect(() => {
    setVendedorActualId(currentVendor?.id || null);
  }, [currentVendor?.id]);

  // Función de refresco manual (fuerza sincronización con ERP)
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await sincronizar();
    setRefreshing(false);
  }, [sincronizar]);

  // --- CÁLCULOS DE NEGOCIO (Datos Reales) ---

  // Helper para limpiar precios (maneja múltiples formatos)
  // Ejemplos: "75,63 €" -> 75.63, "7.563,00 €" -> 7563.00, "75.63 €" -> 75.63
  const parsePrecio = (valor: string) => {
    if (!valor) return 0;
    
    // Eliminar símbolos de moneda y espacios
    let sanitized = valor.replace(/[€\s]/g, '').trim();
    
    // Detectar formato: si hay coma Y punto, el punto es separador de miles
    const tieneComa = sanitized.includes(',');
    const tienePunto = sanitized.includes('.');
    
    if (tieneComa && tienePunto) {
      // Formato: "7.563,00" -> punto es miles, coma es decimal
      sanitized = sanitized.replace(/\./g, '').replace(',', '.');
    } else if (tieneComa) {
      // Formato: "75,63" -> coma es decimal
      sanitized = sanitized.replace(',', '.');
    } else if (tienePunto) {
      // Formato: "75.63" -> punto es decimal (ya está bien)
      // No hacer nada
    }
    
    const parsed = parseFloat(sanitized);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper para fecha de HOY en formato DD/MM/YYYY consistente
  const getTodayString = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper para parsear fechas (similar a ResumenDiaScreen)
  const parseDateString = (dateStr: string): number => {
    if (!dateStr) return 0;
    try {
      const part = dateStr.split(',')[0].trim();
      const parts = part.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (day && month && year && year > 1900 && year < 2100) {
          return new Date(year, month - 1, day).getTime();
        }
      }
      const fallbackDate = new Date(dateStr);
      if (!isNaN(fallbackDate.getTime())) {
        return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate()).getTime();
      }
    } catch (error) {
      console.warn('Error parseando fecha:', dateStr, error);
    }
    return 0;
  };

  const hoyString = getTodayString();

  // 1. Ventas (filtradas por vendedor)
  // IMPORTANTE: Solo mostrar ventas del vendedor actual
  const ventasActivas = notasVenta.filter(n => {
    // Si hay vendedor actual, SOLO mostrar ventas de ese vendedor
    // Si no hay vendedorId en la nota, no mostrarla (es una nota antigua)
    const perteneceVendedor = vendedorActualId ? (n.vendedorId === vendedorActualId) : false;
    return n.estado !== 'anulada' && perteneceVendedor;
  });
  const ventasHoy = ventasActivas.filter(n => {
    if (!n.fecha) return false;
    const fechaNota = n.fecha.split(',')[0].trim();
    return fechaNota.startsWith(hoyString);
  });
  
  const totalVentasDia = ventasHoy.reduce((sum, nota) => sum + parsePrecio(nota.precio), 0);
  const numeroVentasHoy = ventasHoy.length;

  // 2. Gastos (filtrados por vendedor)
  const gastosHoy = gastos.filter(g => {
    if (!g.fecha) return false;
    if (!vendedorActualId) return false;
    if (g.vendedorId && g.vendedorId !== vendedorActualId) return false;
    const fechaGasto = g.fecha.split(',')[0].trim();
    return fechaGasto.startsWith(hoyString);
  });
  // Usar solo gastos de hoy para el total
  const totalGastos = gastosHoy.reduce((sum, gasto) => sum + parsePrecio(gasto.precio), 0);

  // 3. Cobros Pendientes (filtrados por vendedor)
  const cobrosPendientes = cobros.filter(c => {
    if (c.estado !== 'pendiente') return false;
    if (!vendedorActualId) return false;
    if (c.vendedorId && c.vendedorId !== vendedorActualId) return false;
    return true;
  });
  const totalCobrosPendientes = cobrosPendientes.reduce((sum, cobro) => sum + parsePrecio(cobro.monto), 0);

  // 4. Clientes (Cartera vs Atendidos)
  // Contamos clientes únicos que han comprado hoy
  const clientesAtendidosHoyIds = new Set(ventasHoy.map(v => v.clienteId || v.cliente));
  const clientesAtendidosCount = clientesAtendidosHoyIds.size;
  const totalClientesCartera = clientes.length;

  // Formateador de moneda
  const formatMoney = (amount: number) => {
    return amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  };

  // --- LAYOUT DINÁMICO ---
  const cardWidth = layout.isTablet && layout.isLandscape
    ? (layout.maxContentWidth - 52) / 4
    : layout.isTablet
    ? (layout.window.width - 52) / 3
    : (layout.window.width - 52) / 2;

  const quickAccessWidth = layout.isTablet && layout.isLandscape
    ? (layout.maxContentWidth - 72) / 6
    : layout.isTablet
    ? (layout.window.width - 62) / 4
    : (layout.window.width - 52) / 3;

  const contentStyle = [
    styles.content,
    { padding: layout.padding, paddingBottom: layout.paddingLarge * 2 }
  ];

  return (
    <ScreenWithSidebar currentScreen="Dashboard" scrollable={false}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={contentStyle}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status de Sincronización */}
        <View style={styles.syncStatus}>
          <View style={[styles.syncDot, modoOffline ? styles.syncDotOffline : styles.syncDotOnline]} />
          <Text style={styles.syncText}>
            {modoOffline ? '🔴 Modo Offline' : '🟢 Conectado ERP'}
          </Text>
          {syncStatus.operacionesPendientes ? (
            syncStatus.operacionesPendientes > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>{syncStatus.operacionesPendientes} Pendientes</Text>
              </View>
            )
          ) : null}
        </View>

        {/* Hero Section */}
        <LinearGradient
          colors={['#092090', '#0C2ABF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.heroSection}
        >
          <View>
            <Text style={styles.welcomeText}>Resumen Comercial</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
          </View>

          <View style={styles.heroButtons}>
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => navigation.navigate('VentasList')}
            activeOpacity={0.8}
          >
              <Text style={styles.heroButtonText}>+ Nueva Venta</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => navigation.navigate('ResumenDia')}
              activeOpacity={0.8}
            >
              <Text style={styles.heroButtonText}>Ver Cierre</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Alertas Importantes */}
        <View style={styles.alertsGrid}>
          {cobrosPendientes.length > 0 && (
            <TouchableOpacity
              style={styles.alertCard}
              onPress={() => navigation.navigate('CobrosList')}
              activeOpacity={0.7}
            >
              <Text style={styles.alertEmoji}>⚠️</Text>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>
                  {cobrosPendientes.length} Cobros Pendientes
                </Text>
                <Text style={styles.alertSubtitle}>
                  Total deuda: {formatMoney(totalCobrosPendientes)}
                </Text>
              </View>
              <View style={styles.alertButton}>
                <Text style={styles.alertButtonText}>Gestionar</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Alerta Stock (Ejemplo: Navega a Resumen Stock) */}
          <TouchableOpacity
            style={[styles.alertCard, styles.alertCardInfo]}
            onPress={() => navigation.navigate('ResumenStock')}
            activeOpacity={0.7}
          >
            <Text style={styles.alertEmoji}>📦</Text>
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: '#1e40af' }]}>
                Control de Stock
              </Text>
              <Text style={[styles.alertSubtitle, { color: '#1e40af' }]}>
                Revisar inventario actual
              </Text>
            </View>
            <View style={[styles.alertButton, { backgroundColor: '#3b82f6' }]}>
              <Text style={styles.alertButtonText}>Ver Stock</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* KPIs / Estadísticas */}
        <View style={styles.statsGrid}>
          {/* Ventas Hoy */}
          <TouchableOpacity
            style={[styles.statCard, { width: cardWidth }]}
            onPress={() => navigation.navigate('ResumenDia')}
            activeOpacity={0.7}
          >
            <Text style={styles.statLabel}>Ventas (Hoy)</Text>
            <Text style={styles.statValue}>{formatMoney(totalVentasDia)}</Text>
            <Text style={styles.statChange}>{numeroVentasHoy} operaciones</Text>
          </TouchableOpacity>

          {/* Gastos Hoy */}
          <TouchableOpacity
            style={[styles.statCard, { width: cardWidth }]}
            onPress={() => navigation.navigate('Gastos')}
            activeOpacity={0.7}
          >
            <Text style={styles.statLabel}>Gastos (Hoy)</Text>
            <Text style={styles.statValue}>{formatMoney(totalGastos)}</Text>
            <Text style={[styles.statChange, styles.statChangeWarning]}>
              {gastosHoy.length} registros hoy
            </Text>
          </TouchableOpacity>

          {/* Clientes Atendidos */}
          <TouchableOpacity
            style={[styles.statCard, { width: cardWidth }]}
            onPress={() => navigation.navigate('Clientes')}
            activeOpacity={0.7}
          >
            <Text style={styles.statLabel}>Clientes Atendidos</Text>
            <Text style={styles.statValue}>
              {clientesAtendidosCount} <Text style={{fontSize: 16, color: '#94a3b8'}}>/ {totalClientesCartera}</Text>
            </Text>
            <Text style={styles.statChange}>Hoy</Text>
          </TouchableOpacity>

          {/* Notas Pendientes (Total Cartera, incluye abiertas/borradores) */}
          <TouchableOpacity
            style={[styles.statCard, { width: cardWidth }]}
            onPress={() => navigation.navigate('Ventas')}
            activeOpacity={0.7}
          >
            <Text style={styles.statLabel}>Notas Pendientes</Text>
            <Text style={styles.statValue}>
              {notasVenta.filter(n => n.estado === 'pendiente' || n.estado === 'abierta').length}
            </Text>
            <Text style={[styles.statChange, { color: '#f59e0b' }]}>
              Por cobrar / sin cerrar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Accesos Rápidos */}
        <View style={styles.quickAccessContainer}>
          <Text style={styles.sectionTitle}>Menú Rápido</Text>
          <View style={styles.quickAccessGrid}>
            <QuickAccessButton
              label="Notas Venta"
              icon="📋"
              onPress={() => navigation.navigate('Ventas')}
              gradient={true}
              width={quickAccessWidth}
            />
            <QuickAccessButton
              label="Resumen Día"
              icon="📊"
              onPress={() => navigation.navigate('ResumenDia')}
              width={quickAccessWidth}
            />
            <QuickAccessButton
              label="Cobros"
              icon="💰"
              onPress={() => navigation.navigate('CobrosList')}
              width={quickAccessWidth}
            />
            <QuickAccessButton
              label="Gastos"
              icon="📈"
              onPress={() => navigation.navigate('Gastos')}
              width={quickAccessWidth}
            />
            <QuickAccessButton
              label="Clientes"
              icon="👥"
              onPress={() => navigation.navigate('Clientes')}
              width={quickAccessWidth}
            />
            <QuickAccessButton
              label="Artículos"
              icon="📦"
              onPress={() => navigation.navigate('Articulos')}
              width={quickAccessWidth}
            />
          </View>
        </View>

        {/* Últimas Ventas */}
        <View style={styles.recentSalesContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Últimas Operaciones</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Ventas')}>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {ventasHoy.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No hay ventas registradas hoy.</Text>
            </View>
          ) : (
            // Mostrar solo las ventas de hoy, ordenadas por fecha (más recientes primero)
            [...ventasHoy]
              .sort((a, b) => {
                // Parsear fechas para ordenar correctamente
                const fechaA = parseDateString(a.fecha || '');
                const fechaB = parseDateString(b.fecha || '');
                return fechaB - fechaA; // Más recientes primero
              })
              .slice(0, 5)
              .map((nota) => (
              <TouchableOpacity
                key={nota.id}
                style={[
                  styles.saleItem,
                  nota.estado === 'anulada' && styles.saleItemCancelled
                ]}
                onPress={() => navigation.navigate('VerNota', { ventaData: nota })}
              >
                <View style={[styles.saleIcon, nota.estado === 'anulada' && styles.saleIconCancelled]}>
                  <Text style={styles.saleIconText}>
                    {nota.estado === 'anulada' ? 'X' : 'P'}
                  </Text>
                </View>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleClient} numberOfLines={1}>
                    {nota.cliente}
                  </Text>
                  <Text style={styles.saleTime}>{nota.fecha} • {nota.id}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text
                    style={[
                      styles.saleAmount,
                      nota.estado === 'anulada' && styles.saleAmountCancelled
                    ]}
                  >
                    {nota.precio}
                  </Text>
                  <Text
                    style={[
                      styles.saleStatus,
                      nota.estado === 'anulada'
                        ? { color: '#dc2626' }
                        : nota.estado === 'pendiente'
                        ? { color: '#f59e0b' }
                        : nota.estado === 'abierta'
                        ? { color: '#3b82f6' }
                        : { color: '#10b981' }
                    ]}
                  >
                    {nota.estado === 'anulada'
                      ? 'Anulada'
                      : nota.estado === 'pendiente'
                      ? 'Pendiente'
                      : nota.estado === 'abierta'
                      ? 'Borrador'
                      : 'Pagado'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenWithSidebar>
  );
}

// Componente auxiliar para botones
const QuickAccessButton = ({
  label,
  icon,
  onPress,
  gradient = false,
  width
}: {
  label: string;
  icon: string;
  onPress: () => void;
  gradient?: boolean;
  width: number;
}) => {
  if (gradient) {
    return (
      <TouchableOpacity
        style={[styles.quickAccessButton, { width }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#092090', '#0C2ABF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quickAccessGradient}
        >
          <Text style={styles.quickAccessIconGradient}>{icon}</Text>
          <Text style={styles.quickAccessLabelGradient}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.quickAccessButton, { width }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.quickAccessButtonInner}>
        <Text style={styles.quickAccessIcon}>{icon}</Text>
        <Text style={styles.quickAccessLabel}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  content: {
    width: '100%',
    paddingBottom: 40
  },
  // Sync Status
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  syncDotOnline: {
    backgroundColor: '#10b981'
  },
  syncDotOffline: {
    backgroundColor: '#ef4444'
  },
  syncText: {
    fontSize: 16,
    color: '#697b92',
    fontWeight: '600'
  },
  pendingBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8
  },
  pendingText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700'
  },
  // Hero
  heroSection: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#092090',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4
  },
  dateText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 24,
    textTransform: 'capitalize'
  },
  heroButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  heroButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  heroButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#092090'
  },
  // Alerts
  alertsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 30,
  },
  alertCard: {
    flex: 1,
    minWidth: 300,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  alertCardInfo: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  alertEmoji: {
    fontSize: 26,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 2,
  },
  alertSubtitle: {
    fontSize: 16,
    color: '#92400e',
    opacity: 0.9,
  },
  alertButton: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: '#f59e0b',
    borderRadius: 20,
  },
  alertButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 30
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 20,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  statLabel: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4
  },
  statChange: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '500'
  },
  statChangeWarning: {
    color: '#f59e0b'
  },
  // Quick Access
  quickAccessContainer: {
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6
  },
  quickAccessButton: {
    margin: 6,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  quickAccessGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90
  },
  quickAccessButtonInner: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90
  },
  quickAccessIconGradient: {
    fontSize: 28,
    marginBottom: 8
  },
  quickAccessIcon: {
    fontSize: 28,
    marginBottom: 8
  },
  quickAccessLabelGradient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center'
  },
  quickAccessLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center'
  },
  // Recent Sales
  recentSalesContainer: {
    marginBottom: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  seeAllText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0C2ABF'
  },
  saleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10
  },
  saleItemCancelled: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  saleIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  saleIconCancelled: {
    backgroundColor: '#fee2e2'
  },
  saleIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#092090'
  },
  saleInfo: {
    flex: 1
  },
  saleClient: {
    fontSize: 19,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4
  },
  saleTime: {
    fontSize: 16,
    color: '#64748b'
  },
  saleAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#092090',
    marginBottom: 2
  },
  saleAmountCancelled: {
    color: '#dc2626',
    textDecorationLine: 'line-through'
  },
  saleStatus: {
    fontSize: 15,
    fontWeight: '600'
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed'
  },
  emptyStateText: {
    color: '#94a3b8',
    fontSize: 18
  }
});