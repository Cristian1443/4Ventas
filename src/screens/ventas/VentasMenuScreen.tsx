/**
 * Ventas Menu Screen - Optimizado para Tablet
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useResponsiveLayout } from '../../constants/layout';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

export default function VentasMenuScreen() {
  const navigation = useNavigation<any>();
  const layout = useResponsiveLayout();

  const menuItems = [
    { label: 'Notas Venta', icon: '📋', screen: 'Ventas' },
    { label: 'Resumen Día', icon: '📊', screen: 'ResumenDia' },
    { label: 'Cobros\nPendientes', icon: '💰', screen: 'CobrosList' },
    { label: 'Gastos', icon: '🚗', screen: 'Gastos' },
    { label: 'Documentos', icon: '📄', screen: 'Documentos' },
    { label: 'Clientes', icon: '👥', screen: 'Clientes' },
    { label: 'Artículos', icon: '📦', screen: 'Articulos' }
  ];

  // Configuraciones de tamaño según el dispositivo
  const buttonSize = layout.isTablet ? 160 : 110; // Más grande en tablet
  const fontSizeIcon = layout.isTablet ? 48 : 32;
  const fontSizeLabel = layout.isTablet ? 16 : 12;
  const gapSize = layout.isTablet ? 30 : 15;

  return (
    <ScreenWithSidebar currentScreen="VentasMenu" scrollable={true}>
      <View style={styles.container}>
        {/* Título opcional para dar contexto */}
        <Text style={styles.headerTitle}>Menú de Ventas</Text>

        <View style={[styles.grid, { gap: gapSize }]}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(item.screen)}
              style={[styles.buttonWrapper, { width: buttonSize, height: buttonSize * 0.85 }]}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={[styles.icon, { fontSize: fontSizeIcon }]}>{item.icon}</Text>
                <Text style={[styles.label, { fontSize: fontSizeLabel }]}>{item.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 30,
    marginLeft: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  buttonWrapper: {
    borderRadius: 16,
    // Sombra suave para efecto de elevación
    shadowColor: '#092090',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: 'white', // Necesario para la sombra en iOS
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 16,
  },
  icon: {
    marginBottom: 8,
  },
  label: {
    fontFamily: 'Inter', // Asegúrate de tener la fuente cargada o usa System
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});