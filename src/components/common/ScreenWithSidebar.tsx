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

  // COMPORTAMIENTO 2: TABLET/WEB (Split View)
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
            // IMPORTANTE: Contenedor fijo para pantallas como NuevaVenta que tienen su propio scroll
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
  masterContainer: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
    // CRÍTICO PARA WEB: Forzar altura de la ventana (Viewport Height)
    // Sin esto, el navegador no sabe cuándo activar el scroll.
    // @ts-ignore - Ignorar error de tipo en TS para web
    height: Platform.OS === 'web' ? '100vh' : '100%', 
    overflow: 'hidden', 
  },
  flexOne: {
    flex: 1,
    minHeight: 0, 
  },
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
    height: '100%', 
    overflow: 'hidden',
  },
  sidebarBox: {
    flexShrink: 0,
    borderRightWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    zIndex: 10,
    height: '100%',
  },
  contentBox: {
    flex: 1,
    backgroundColor: '#fff',
    height: '100%',
    overflow: 'hidden', // Evita que el contenido empuje el ancho/alto
  },
  fixedContentContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
    overflow: 'hidden', // CRÍTICO: Recorta el contenido que sobra para que el ScrollView hijo funcione
  }
});