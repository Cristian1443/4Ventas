/**
 * Screen With Sidebar - CORREGIDO SAFE AREA
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // IMPORTANTE
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
  const insets = useSafeAreaInsets(); // OBTENER INSETS

  // Mostrar sidebar SIEMPRE en tablets
  const showSidebar = layout.isTablet;

  // Estilo dinámico para el padding inferior
  const containerStyles = {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingBottom: insets.bottom, // Agrega espacio extra abajo
  };

  if (!showSidebar) {
    return scrollable ? (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom }}>
        {children}
      </ScrollView>
    ) : (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {children}
      </View>
    );
  }

  const sidebarWidth = 80;
  
  return (
    <View style={styles.containerWithSidebar}>
      {/* Sidebar FIJO */}
      <View style={[styles.sidebarFixed, { width: sidebarWidth, paddingBottom: insets.bottom }]}>
        <SidebarNavigation currentScreen={currentScreen} />
      </View>
      
      {/* Contenido */}
      {scrollable ? (
        <ScrollView 
          style={[styles.contentWithMargin, { marginLeft: sidebarWidth }]} 
          contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(40, insets.bottom + 20) }]}
          showsVerticalScrollIndicator={true}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.contentWithMargin, { marginLeft: sidebarWidth, paddingBottom: insets.bottom }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerWithSidebar: {
    flex: 1,
    backgroundColor: '#ffffff',
    position: 'relative', // Asegura contexto
  },
  sidebarFixed: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 9999,
    height: '100%',
  },
  contentWithMargin: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 20,
    // paddingBottom se maneja dinámicamente arriba
  },
});