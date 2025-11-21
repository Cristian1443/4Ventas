/**
 * Screen with Sidebar Wrapper
 * Muestra sidebar a la izquierda en tablets, sin sidebar en móviles
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
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

  // Mostrar sidebar SIEMPRE en tablets (tanto landscape como portrait)
  const showSidebar = layout.isTablet;

  if (!showSidebar) {
    // Móvil: solo contenido, sin sidebar
    return scrollable ? (
      <ScrollView style={styles.container}>
        {children}
      </ScrollView>
    ) : (
      <View style={styles.container}>
        {children}
      </View>
    );
  }

  // Tablet: sidebar + contenido SIEMPRE VISIBLE
  const sidebarWidth = 80; // Ancho fijo del sidebar (igual que el web)
  
  return (
    <View style={styles.containerWithSidebar}>
      {/* Sidebar FIJO con posición absoluta */}
      <View style={[styles.sidebarFixed, { width: sidebarWidth }]}>
        <SidebarNavigation currentScreen={currentScreen} />
      </View>
      
      {/* Contenido con margen para el sidebar */}
      {scrollable ? (
        <ScrollView 
          style={[styles.contentWithMargin, { marginLeft: sidebarWidth }]} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.contentWithMargin, { marginLeft: sidebarWidth }]}>
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
  },
  sidebarFixed: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 9999,
    height: '100%', // Asegurar altura completa
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentWithMargin: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
});



