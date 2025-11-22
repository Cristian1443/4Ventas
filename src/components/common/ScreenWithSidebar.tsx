/**
 * Screen With Sidebar - FIX LAYOUT (FLEX ROW)
 * Solución al corte de contenido: Usar columnas reales en lugar de posición absoluta.
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '../../constants/layout';
import SidebarNavigation from './SidebarNavigation';

interface ScreenWithSidebarProps {
  children: ReactNode;
  currentScreen: string;
  scrollable?: boolean;
}

export default function ScreenWithSidebar({ 
  children, 
  currentScreen,
  scrollable = true 
}: ScreenWithSidebarProps) {
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();

  // Configuración
  const showSidebar = layout.isTablet;
  const sidebarWidth = 80;

  // 1. MODO MÓVIL (Sin Sidebar) - Comportamiento estándar
  if (!showSidebar) {
    return scrollable ? (
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {children}
      </ScrollView>
    ) : (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {children}
      </View>
    );
  }

  // 2. MODO TABLET (Con Sidebar) - NUEVO LAYOUT FLEX ROW
  return (
    <View style={styles.tabletWrapper}>
      
      {/* COLUMNA 1: Sidebar (Espacio reservado real) */}
      <View style={[styles.sidebarColumn, { width: sidebarWidth, paddingBottom: insets.bottom }]}>
        <SidebarNavigation currentScreen={currentScreen} />
      </View>
      
      {/* COLUMNA 2: Contenido (Ocupa el resto del espacio automáticamente) */}
      <View style={styles.contentColumn}>
        {scrollable ? (
          // CASO A: Pantalla con scroll global (Ej: Menús, Listas)
          <ScrollView 
            style={styles.scrollContainer} 
            contentContainerStyle={[
              styles.scrollContent, 
              { paddingBottom: Math.max(40, insets.bottom + 20) }
            ]}
            showsVerticalScrollIndicator={true}
          >
            {children}
          </ScrollView>
        ) : (
          // CASO B: Pantalla sin scroll global (Ej: Nueva Venta, POS)
          // IMPORTANTE: No agregamos padding aquí. Dejamos que la pantalla hija (children)
          // maneje su propio espacio y footers.
          <View style={styles.fixedContainer}>
            {children}
          </View>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  // --- ESTILOS TABLET ---
  tabletWrapper: {
    flex: 1,
    flexDirection: 'row', // <--- LA CLAVE: Pone los elementos uno al lado del otro
    backgroundColor: '#ffffff',
    overflow: 'hidden', // Corta cualquier desbordamiento extraño
  },

  sidebarColumn: {
    backgroundColor: '#ffffff',
    height: '100%',
    borderRightWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 10,
  },

  contentColumn: {
    flex: 1, // Ocupa todo el ancho restante (Screen Width - 80px)
    backgroundColor: '#ffffff',
  },

  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  
  scrollContent: {
    padding: 0,
    flexGrow: 1,
  },
  
  fixedContainer: {
    flex: 1,
    width: '100%',
    minHeight: 0, // CRÍTICO: Permite que flex funcione correctamente con ScrollView anidado
    // Sin height: '100%' ni overflow: 'hidden' para permitir scroll interno
    // Las pantallas hijas manejan su propio scroll cuando es necesario
  },
});