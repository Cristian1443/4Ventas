/**
 * Ventas Menu Screen - React Native (CON BOTONES AZULES GRANDES)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useResponsiveLayout } from '../../constants/layout';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

export default function VentasMenuScreen() {
  const navigation = useNavigation<any>();
  const layout = useResponsiveLayout();

  const menuItems = [
    { label: 'Notas Venta', icon: '📋', screen: 'Ventas' }, // LISTA de ventas, no nueva venta
    { label: 'Resumen Día', icon: '📊', screen: 'ResumenDia' },
    { label: 'Cobros Pendientes', icon: '💰', screen: 'CobrosList' },
    { label: 'Gastos', icon: '🚗', screen: 'Gastos' },
    { label: 'Documentos', icon: '📄', screen: 'Documentos' },
    { label: 'Clientes', icon: '👥', screen: 'Clientes' },
    { label: 'Artículos', icon: '📦', screen: 'Articulos' }
  ];

  return (
    <ScreenWithSidebar currentScreen="VentasMenu" scrollable={true}>
      <View style={styles.content}>
        {/* Grid de botones grandes - IGUAL A TU IMAGEN */}
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(item.screen)}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.icon}>{item.icon}</Text>
                <Text style={styles.label}>{item.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 40,
    paddingTop: 30,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'flex-start',
  },
  buttonWrapper: {
    width: 140,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#092090',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  icon: {
    fontSize: 36,
    marginBottom: 8,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});
