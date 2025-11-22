import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions } from 'react-native';
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

  const showSidebar = layout.isTablet;
  const sidebarWidth = 80;

  // COMPORTAMIENTO 1: MÓVIL (Sin Sidebar)
  if (!showSidebar) {
    return (
      // IMPORTANTE: Este View externo con flex: 1 es lo que faltaba.
      // Sin él, el ScrollView hijo no sabe qué altura tener.
      <View style={styles.masterContainer}>
        {scrollable ? (
          <ScrollView 
            style={styles.flexOne} 
            contentContainerStyle={{ paddingBottom: insets.bottom + 20, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flexOne, { paddingBottom: insets.bottom }]}>
            {children}
          </View>
        )}
      </View>
    );
  }

  // COMPORTAMIENTO 2: TABLET (Split View)
  return (
    <View style={styles.masterContainer}>
      <View style={styles.splitLayout}>
        
        {/* Columna 1: Menú Lateral */}
        <View style={[styles.sidebarBox, { width: sidebarWidth, paddingBottom: insets.bottom }]}>
          <SidebarNavigation currentScreen={currentScreen} />
        </View>
        
        {/* Columna 2: Contenido de la Pantalla */}
        <View style={styles.contentBox}>
          {scrollable ? (
            <ScrollView 
              style={styles.flexOne}
              contentContainerStyle={{ paddingBottom: Math.max(40, insets.bottom + 20), flexGrow: 1 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            // Si la pantalla (como Nueva Venta) maneja su propio scroll,
            // le damos un contenedor flex: 1 limpio para que ella lo gestione.
            <View style={styles.fixedContentContainer}>
              {children}
            </View>
          )}
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // EL CONTENEDOR MAESTRO: La clave de todo.
  masterContainer: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
  },
  flexOne: {
    flex: 1,
    minHeight: 0, // CRÍTICO: Permite que flex funcione correctamente con ScrollView
  },
  
  // Layout dividido
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0, // CRÍTICO: Permite que flex funcione correctamente
  },
  
  sidebarBox: {
    flexShrink: 0, // No se encoge
    borderRightWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    zIndex: 10,
    alignSelf: 'stretch', // Ocupa toda la altura disponible
    minHeight: 0, // CRÍTICO: Permite que flex funcione correctamente
  },
  
  contentBox: {
    flex: 1,
    backgroundColor: '#fff',
    minHeight: 0, // CRÍTICO: Permite que el scroll interno funcione
    // Sin height: '100%' ni overflow: 'hidden' para permitir scroll interno
  },
  
  fixedContentContainer: {
    flex: 1,
    minHeight: 0, // CRÍTICO: Permite que ScrollView interno funcione
    width: '100%',
    // Sin overflow: 'hidden' para permitir scroll interno
  }
});