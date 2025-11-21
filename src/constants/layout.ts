/**
 * Constantes de Layout con soporte para tablets
 */

import React from 'react';
import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Detectar si es tablet basado en el tamaño de pantalla
const isTablet = Math.min(width, height) >= 600;
const isLandscape = width > height;

export const layout = {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
  isTablet,
  isLandscape,
  // Padding adaptativo según dispositivo
  padding: isTablet ? 24 : 16,
  paddingSmall: isTablet ? 12 : 8,
  paddingLarge: isTablet ? 32 : 24,
  // Border radius
  borderRadius: 8,
  borderRadiusSmall: 4,
  borderRadiusLarge: 12,
  // Alturas de componentes
  headerHeight: isTablet ? 70 : 60,
  bottomTabHeight: isTablet ? 70 : 60,
  // Tamaños de iconos
  iconSize: isTablet ? 28 : 24,
  iconSizeSmall: isTablet ? 24 : 20,
  iconSizeLarge: isTablet ? 40 : 32,
  // Ancho máximo de contenido para tablets en landscape
  maxContentWidth: isTablet && isLandscape ? 1200 : width,
  // Número de columnas para grids
  gridColumns: isTablet && isLandscape ? 3 : isTablet ? 2 : 1,
};

/**
 * Hook para obtener el layout actualizado cuando cambia la orientación
 */
export const useResponsiveLayout = () => {
  const [dimensions, setDimensions] = React.useState(Dimensions.get('window'));

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const currentWidth = dimensions.width;
  const currentHeight = dimensions.height;
  const currentIsTablet = Math.min(currentWidth, currentHeight) >= 600;
  const currentIsLandscape = currentWidth > currentHeight;

  return {
    window: dimensions,
    isSmallDevice: currentWidth < 375,
    isTablet: currentIsTablet,
    isLandscape: currentIsLandscape,
    padding: currentIsTablet ? 24 : 16,
    paddingSmall: currentIsTablet ? 12 : 8,
    paddingLarge: currentIsTablet ? 32 : 24,
    borderRadius: 8,
    borderRadiusSmall: 4,
    borderRadiusLarge: 12,
    headerHeight: currentIsTablet ? 70 : 60,
    bottomTabHeight: currentIsTablet ? 70 : 60,
    iconSize: currentIsTablet ? 28 : 24,
    iconSizeSmall: currentIsTablet ? 24 : 20,
    iconSizeLarge: currentIsTablet ? 40 : 32,
    maxContentWidth: currentIsTablet && currentIsLandscape ? 1200 : currentWidth,
    gridColumns: currentIsTablet && currentIsLandscape ? 3 : currentIsTablet ? 2 : 1,
  };
};
