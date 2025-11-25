/**
 * Dashboard Screen - React Native
 */

import React, { useEffect } from 'react';
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

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const layout = useResponsiveLayout();
  const {
    notasVenta,
    gastos,
    cobros,
    syncStatus,
    modoOffline,
    sincronizar
  } = useApp();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await sincronizar();
    setRefreshing(false);
  }, [sincronizar]);

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
  const cobrosPendientes = cobros.filter(c => c.estado === 'pendiente');
  const totalCobrosPendientes = cobrosPendientes.reduce((sum, cobro) => {
    const monto = parseFloat(cobro.monto.replace(',', '.').replace('€', '').trim() || '0');
    return sum + monto;
  }, 0);

  // Calcular ancho de cards dinámicamente
  const cardWidth = layout.isTablet && layout.isLandscape
    ? (layout.maxContentWidth - 52) / 4  // 4 columnas en tablet horizontal
    : layout.isTablet
    ? (layout.window.width - 52) / 3     // 3 columnas en tablet vertical
    : (layout.window.width - 52) / 2;    // 2 columnas en móvil

  const quickAccessWidth = layout.isTablet && layout.isLandscape
    ? (layout.maxContentWidth - 72) / 6  // 6 columnas en tablet horizontal
    : layout.isTablet
    ? (layout.window.width - 62) / 4     // 4 columnas en tablet vertical
    : (layout.window.width - 52) / 3;    // 3 columnas en móvil

  const containerStyle = [
    styles.container,
    layout.isTablet && layout.isLandscape && styles.containerTabletLandscape
  ];

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
        showsVerticalScrollIndicator={layout.isTablet}
      >
      {/* Status de sincronización (SIEMPRE visible) */}
      <View style={styles.syncStatus}>
        <View style={[styles.syncDot, modoOffline ? styles.syncDotOffline : styles.syncDotOnline]} />
        <Text style={styles.syncText}>
          {modoOffline ? '🔴 Modo Offline' : '🟢 Sincronizado'}
        </Text>
        {syncStatus.operacionesPendientes && syncStatus.operacionesPendientes > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{syncStatus.operacionesPendientes}</Text>
          </View>
        )}
      </View>

      {/* Hero section con imagen de fondo */}
      <LinearGradient
        colors={['#092090', '#0C2ABF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.heroSection}
      >
        <View>
          <Text style={styles.welcomeText}>Bienvenido, Vendedor</Text>
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
            onPress={() => navigation.navigate('Ventas')}
            activeOpacity={0.8}
          >
            <Text style={styles.heroButtonText}>Nueva Venta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => navigation.navigate('ResumenDia')}
            activeOpacity={0.8}
          >
            <Text style={styles.heroButtonText}>Ver Informe</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Alertas importantes (2 cards) */}
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
                Total: {totalCobrosPendientes.toFixed(2).replace('.', ',')} €
              </Text>
            </View>
            <TouchableOpacity style={styles.alertButton}>
              <Text style={styles.alertButtonText}>Ver</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.alertCard, styles.alertCardDanger]}
          onPress={() => navigation.navigate('ResumenStock')}
          activeOpacity={0.7}
        >
          <Text style={styles.alertEmoji}>📦</Text>
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: '#991b1b' }]}>
              Stock bajo en productos
            </Text>
            <Text style={[styles.alertSubtitle, { color: '#991b1b' }]}>
              Requiere atención
            </Text>
          </View>
          <TouchableOpacity style={[styles.alertButton, { backgroundColor: '#ef4444' }]}>
            <Text style={styles.alertButtonText}>Ver</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {/* Stats cards */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statCard, { width: cardWidth }]}
          onPress={() => navigation.navigate('ResumenDia')}
          activeOpacity={0.7}
        >
          <Text style={styles.statLabel}>Ventas Hoy</Text>
          <Text style={styles.statValue}>{totalVentas.toFixed(2).replace('.', ',')} €</Text>
          <Text style={styles.statChange}>{numeroVentas} ventas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { width: cardWidth }]}
          onPress={() => navigation.navigate('Gastos')}
          activeOpacity={0.7}
        >
          <Text style={styles.statLabel}>Gastos Hoy</Text>
          <Text style={styles.statValue}>{totalGastos.toFixed(2).replace('.', ',')} €</Text>
          <Text style={[styles.statChange, styles.statChangeWarning]}>
            {gastos.length} gastos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { width: cardWidth }]}
          onPress={() => navigation.navigate('ResumenDia')}
          activeOpacity={0.7}
        >
          <Text style={styles.statLabel}>Nº de Ventas</Text>
          <Text style={styles.statValue}>{numeroVentas}</Text>
          <Text style={styles.statChange}>Total hoy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { width: cardWidth }]}
          onPress={() => navigation.navigate('Clientes')}
          activeOpacity={0.7}
        >
          <Text style={styles.statLabel}>Clientes</Text>
          <Text style={styles.statValue}>{numeroVentas}/15</Text>
          <Text style={styles.statChange}>Visitados hoy</Text>
        </TouchableOpacity>
      </View>

      {/* Accesos rápidos - MEJORADOS con navegación correcta */}
      <View style={styles.quickAccessContainer}>
        <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
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
            gradient={false}
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

      {/* Ventas recientes */}
      <View style={styles.recentSalesContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ventas Recientes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ResumenDia')}>
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {notasVenta.slice(0, 5).map((nota, index) => (
          <View
            key={nota.id}
            style={[
              styles.saleItem,
              nota.estado === 'anulada' && styles.saleItemCancelled
            ]}
          >
            <View style={[styles.saleIcon, nota.estado === 'anulada' && styles.saleIconCancelled]}>
              <Text style={styles.saleIconText}>
                {nota.estado === 'anulada' ? 'X' : 'P'}
              </Text>
            </View>
            <View style={styles.saleInfo}>
              <Text style={styles.saleClient} numberOfLines={1}>
                {nota.id} - {nota.cliente}
              </Text>
              <Text style={styles.saleTime}>{nota.fecha}</Text>
            </View>
            <Text
              style={[
                styles.saleAmount,
                nota.estado === 'anulada' && styles.saleAmountCancelled
              ]}
            >
              {nota.precio}
            </Text>
          </View>
        ))}
      </View>
      </ScrollView>
    </ScreenWithSidebar>
  );
}

// Componente auxiliar para botones de acceso rápido
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
  containerTabletLandscape: {
    alignItems: 'center',
  },
  content: {
    width: '100%',
    paddingBottom: 40
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignSelf: 'flex-start'
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
    backgroundColor: '#f59e0b'
  },
  syncText: {
    fontSize: 12,
    color: '#697b92',
    fontWeight: '600'
  },
  pendingBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8
  },
  pendingText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600'
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20
  },
  actionButton: {
    backgroundColor: '#092090',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff'
  },
  heroSection: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8
  },
  dateText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 24
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  heroButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#092090'
  },
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
    borderRadius: 10,
    padding: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  alertCardDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  alertEmoji: {
    fontSize: 24,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  alertSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#92400e',
    opacity: 0.8,
  },
  alertButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 20,
  },
  alertButtonText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    margin: 6
  },
  statLabel: {
    fontSize: 12,
    color: '#697b92',
    marginBottom: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4
  },
  statChange: {
    fontSize: 12,
    color: '#10b981'
  },
  statChangeWarning: {
    color: '#f59e0b'
  },
  quickAccessContainer: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6
  },
  quickAccessButton: {
    margin: 6,
    borderRadius: 12,
    overflow: 'hidden'
  },
  quickAccessGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80
  },
  quickAccessButtonInner: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#092090',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80
  },
  quickAccessIconGradient: {
    fontSize: 24,
    marginBottom: 8
  },
  quickAccessIcon: {
    fontSize: 24,
    marginBottom: 8
  },
  quickAccessLabelGradient: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center'
  },
  quickAccessLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#092090',
    textAlign: 'center'
  },
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
    fontSize: 14,
    fontWeight: '600',
    color: '#0C2ABF'
  },
  saleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  saleItemCancelled: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  saleIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#092090',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  saleIconCancelled: {
    backgroundColor: '#dc2626'
  },
  saleIconText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff'
  },
  saleInfo: {
    flex: 1
  },
  saleClient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4
  },
  saleTime: {
    fontSize: 12,
    color: '#697b92'
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#092090'
  },
  saleAmountCancelled: {
    color: '#dc2626',
    textDecorationLine: 'line-through'
  }
});
