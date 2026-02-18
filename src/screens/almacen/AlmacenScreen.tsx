/**
 * Almacén Screen - Optimizado para Tablet
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { InteractionManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useResponsiveLayout } from '../../constants/layout';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

export default function AlmacenScreen() {
  const navigation = useNavigation<any>();
  const layout = useResponsiveLayout();

  // Configuraciones de tamaño según el dispositivo (unificado con VentasMenuScreen)
  const buttonSize = layout.isTablet ? 180 : 130;
  const fontSizeIcon = layout.isTablet ? 58 : 40;
  const fontSizeLabel = layout.isTablet ? 20 : 16;
  const gapSize = layout.isTablet ? 30 : 15;

  return (
    <ScreenWithSidebar currentScreen="Almacen" scrollable={false}>
      <View style={styles.container}>
        
        <Text style={styles.headerTitle}>Gestión de Almacén</Text>

        <View style={[styles.grid, { gap: gapSize }]}>
          {/* Notas Almacen */}
          <TouchableOpacity
            style={[styles.buttonWrapper, { width: buttonSize, height: buttonSize * 0.85 }]}
            onPress={() => navigation.navigate('NotasAlmacen')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#092090', '#0C2ABF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={[styles.icon, { fontSize: fontSizeIcon }]}>📄</Text>
              <Text style={[styles.label, { fontSize: fontSizeLabel }]}>Notas{'\n'}Almacén</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Resumen Stock */}
          <TouchableOpacity
            style={[styles.buttonWrapper, { width: buttonSize, height: buttonSize * 0.85 }]}
            onPress={() => navigation.navigate('ResumenStock')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#092090', '#0C2ABF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={[styles.icon, { fontSize: fontSizeIcon }]}>📊</Text>
              <Text style={[styles.label, { fontSize: fontSizeLabel }]}>Resumen{'\n'}Stock</Text>
            </LinearGradient>
          </TouchableOpacity>

           {/* Gestión Artículos (Opcional, para llenar el menú si quieres) */}
          <TouchableOpacity
            style={[styles.buttonWrapper, { width: buttonSize, height: buttonSize * 0.85 }]}
            onPress={() => InteractionManager.runAfterInteractions(() => navigation.navigate('Articulos'))}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#092090', '#0C2ABF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={[styles.icon, { fontSize: fontSizeIcon }]}>📦</Text>
              <Text style={[styles.label, { fontSize: fontSizeLabel }]}>Artículos</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 30,
    marginLeft: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  buttonWrapper: {
    borderRadius: 16,
    shadowColor: '#092090',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: 'white',
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
    color: '#ffffff',
  },
  label: {
    fontFamily: 'Inter',
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});