/**
 * Sidebar Navigation - EXACTO AL WEB
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Svg, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const iconNavCol = require('../../../assets/icon-nav-colum.png');

interface SidebarNavigationProps {
  currentScreen: string;
}

export default function SidebarNavigation({ currentScreen }: SidebarNavigationProps) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.topSection}>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('Main', { screen: 'Dashboard' });
          }}
          style={styles.logoContainer}
        >
          <Image 
            source={iconNavCol} 
            style={styles.logoImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>

      {/* Menu items - TODOS RENDERIZADOS DIRECTAMENTE */}
      <View style={styles.menuItemsContainer}>
        <MenuItem 
          icon="home"
          label="Panel"
          active={currentScreen === 'Dashboard'}
          onPress={() => {
            navigation.navigate('Main', { screen: 'Dashboard' });
          }}
        />
        <MenuItem 
          icon="ventas"
          label="Ventas"
          active={['VentasMenu', 'Ventas', 'NuevaVenta', 'ResumenDia', 'CobrosList', 'Cobros', 'CobrosConfirmacion', 'Gastos'].includes(currentScreen)}
          onPress={() => {
            navigation.navigate('Main', { screen: 'VentasMenu' });
          }}
        />
        <MenuItem 
          icon="almacen"
          label="Almacen"
          active={['Almacen', 'Articulos', 'NotasAlmacen', 'ResumenStock'].includes(currentScreen)}
          onPress={() => {
            navigation.navigate('Main', { screen: 'Almacen' });
          }}
        />
        <MenuItem 
          icon="comunicacion"
          label="Comunica"
          active={['Comunicacion', 'Clientes'].includes(currentScreen)}
          onPress={() => {
            navigation.navigate('Main', { screen: 'Comunicacion' });
          }}
        />
        <MenuItem 
          icon="agenda"
          label="Agenda"
          active={currentScreen === 'Agenda'}
          onPress={() => navigation.navigate('Agenda')}
        />
      </View>
      
      {/* Settings */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('Main', { screen: 'Configuracion' });
          }}
          style={styles.settingsButton}
        >
          <Svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <Path 
              d="M15 18.75C17.0711 18.75 18.75 17.0711 18.75 15C18.75 12.9289 17.0711 11.25 15 11.25C12.9289 11.25 11.25 12.9289 11.25 15C11.25 17.0711 12.9289 18.75 15 18.75Z" 
              stroke="url(#paint0_linear_settings)" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="1.875" 
            />
            <Path 
              d="M24.375 15C24.375 14.4375 24.3125 13.9062 24.2188 13.375L27.5312 10.9375L24.375 5.625L20.4062 7.09375C19.5312 6.40625 18.5312 5.84375 17.4688 5.46875L16.875 1.25H10.625L10.0312 5.46875C8.96875 5.84375 7.96875 6.40625 7.09375 7.09375L3.125 5.625L0 10.9375L3.28125 13.375C3.1875 13.9062 3.125 14.4375 3.125 15C3.125 15.5625 3.1875 16.0938 3.28125 16.625L0 19.0625L3.125 24.375L7.09375 22.9062C7.96875 23.5938 8.96875 24.1562 10.0312 24.5312L10.625 28.75H16.875L17.4688 24.5312C18.5312 24.1562 19.5312 23.5938 20.4062 22.9062L24.375 24.375L27.5 19.0625L24.2188 16.625C24.3125 16.0938 24.375 15.5625 24.375 15Z" 
              stroke="url(#paint1_linear_settings)" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="1.875" 
            />
            <Defs>
              <SvgLinearGradient id="paint0_linear_settings" x1="3.75" x2="30.6846" y1="3.75" y2="17.668" gradientUnits="userSpaceOnUse">
                <Stop stopColor="#092090" />
                <Stop offset="1" stopColor="#0C2ABF" />
              </SvgLinearGradient>
              <SvgLinearGradient id="paint1_linear_settings" x1="11.25" x2="20.2282" y1="11.25" y2="15.8893" gradientUnits="userSpaceOnUse">
                <Stop stopColor="#092090" />
                <Stop offset="1" stopColor="#0C2ABF" />
              </SvgLinearGradient>
            </Defs>
          </Svg>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MenuItem({ icon, label, active = false, onPress }: {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.menuItem,
        active && styles.menuItemActive
      ]}
    >
      <MenuIcon icon={icon} active={active} />
      <Text style={[
        styles.menuLabel,
        active && styles.menuLabelActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MenuIcon({ icon, active }: { icon: string; active: boolean }) {
  const size = 13.5; // Igual que el web: 13.5
  const iconPaths: Record<string, { path: string; viewBox?: string }> = {
    home: {
      path: "M1.17885 8.58252L7.4997 1.17896L13.8205 8.58252V13.3221C13.8205 13.6349 13.6961 13.9349 13.4741 14.1569C13.2522 14.3789 12.9521 14.5033 12.6393 14.5033H9.09407C8.78124 14.5033 8.4812 14.3789 8.25926 14.1569C8.03731 13.9349 7.91282 13.6349 7.91282 13.3221V10.9494C7.91282 10.6365 7.78833 10.3365 7.56639 10.1146C7.34444 9.89263 7.0444 9.76814 6.73157 9.76814H4.94969C4.63686 9.76814 4.33682 9.89263 4.11488 10.1146C3.89294 10.3365 3.76845 10.6365 3.76845 10.9494V13.3221C3.76845 13.6349 3.64396 13.9349 3.42201 14.1569C3.20007 14.3789 2.90003 14.5033 2.5872 14.5033H1.17885C0.866016 14.5033 0.565976 14.3789 0.344031 14.1569C0.122085 13.9349 -0.00244141 13.6349 -0.00244141 13.3221V8.58252Z"
    },
    ventas: {
      path: "M12.6393 10.3581L7.4997 5.21851L2.36011 10.3581M12.6393 10.3581V15.0977C12.6393 15.4105 12.5148 15.7106 12.2929 15.9325C12.0709 16.1545 11.7709 16.2789 11.4581 16.2789H3.54136C3.22853 16.2789 2.92849 16.1545 2.70654 15.9325C2.4846 15.7106 2.36011 15.4105 2.36011 15.0977V10.3581"
    },
    almacen: {
      path: "M14.2109 6.88232V13.5041C14.2109 13.8169 14.0864 14.117 13.8645 14.3389C13.6426 14.5608 13.3425 14.6853 13.0297 14.6853H1.76969C1.45686 14.6853 1.15682 14.5608 0.934874 14.3389C0.712928 14.117 0.588439 13.8169 0.588439 13.5041V6.88232M14.2109 6.88232H0.588439M14.2109 6.88232L12.4381 1.17896H2.36132L0.588439 6.88232",
      viewBox: "0 0 15 13"
    },
    comunicacion: {
      path: "M13.8205 1.17896H1.17885C0.52593 1.17896 -0.00244141 1.70734 -0.00244141 2.36026V11.7314C-0.00244141 12.3843 0.52593 12.9127 1.17885 12.9127H13.8205C14.4734 12.9127 15.0018 12.3843 15.0018 11.7314V2.36026C15.0018 1.70734 14.4734 1.17896 13.8205 1.17896Z M4.95095 7.04583C4.95095 7.35866 4.82646 7.6587 4.60451 7.88064C4.38257 8.10259 4.08253 8.22708 3.7697 8.22708C3.45687 8.22708 3.15683 8.10259 2.93488 7.88064C2.71294 7.6587 2.58845 7.35866 2.58845 7.04583C2.58845 6.733 2.71294 6.43296 2.93488 6.21101C3.15683 5.98907 3.45687 5.86458 3.7697 5.86458C4.08253 5.86458 4.38257 5.98907 4.60451 6.21101C4.82646 6.43296 4.95095 6.733 4.95095 7.04583ZM8.50407 7.04583C8.50407 7.35866 8.37958 7.6587 8.15763 7.88064C7.93569 8.10259 7.63565 8.22708 7.32282 8.22708C7.00999 8.22708 6.70995 8.10259 6.48801 7.88064C6.26606 7.6587 6.14157 7.35866 6.14157 7.04583C6.14157 6.733 6.26606 6.43296 6.48801 6.21101C6.70995 5.98907 7.00999 5.86458 7.32282 5.86458C7.63565 5.86458 7.93569 5.98907 8.15763 6.21101C8.37958 6.43296 8.50407 6.733 8.50407 7.04583ZM12.0572 7.04583C12.0572 7.35866 11.9327 7.6587 11.7108 7.88064C11.4888 8.10259 11.1888 8.22708 10.8759 8.22708C10.5631 8.22708 10.2631 8.10259 10.0411 7.88064C9.81918 7.6587 9.69469 7.35866 9.69469 7.04583C9.69469 6.733 9.81918 6.43296 10.0411 6.21101C10.2631 5.98907 10.5631 5.86458 10.8759 5.86458C11.1888 5.86458 11.4888 5.98907 11.7108 6.21101C11.9327 6.43296 12.0572 6.733 12.0572 7.04583Z"
    },
    agenda: {
      path: "M10.8759 1.17896V3.54126M3.7697 1.17896V3.54126M0.588439 6.49231H13.8205M2.36011 2.36026H12.0477C12.7006 2.36026 13.229 2.88864 13.229 3.54156V12.9127C13.229 13.5656 12.7006 14.094 12.0477 14.094H2.36011C1.70719 14.094 1.17881 13.5656 1.17881 12.9127V3.54156C1.17881 2.88864 1.70719 2.36026 2.36011 2.36026Z",
      viewBox: "0 0 15 16"
    },
  };

  const iconData = iconPaths[icon] || iconPaths.home;
  const viewBox = iconData.viewBox || "0 0 15 15";

  return (
    <Svg width={size} height={size} viewBox={viewBox} fill="none" style={{ marginBottom: 8 }}>
      <Path
        d={iconData.path}
        stroke={active ? "white" : "url(#paint0_linear_menu)"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1791"
      />
      {!active && (
        <Defs>
          <SvgLinearGradient id="paint0_linear_menu" x1="0.589552" x2="16" y1="0.589552" y2="9" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#092090" />
            <Stop offset="1" stopColor="#0C2ABF" />
          </SvgLinearGradient>
        </Defs>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80, // Igual que el web: 80px
    backgroundColor: '#ffffff',
    borderTopRightRadius: 20, // Igual que el web: 20px
    borderBottomRightRadius: 20, // Igual que el web: 20px
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0', // Igual que el web
    shadowColor: '#00094D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    paddingTop: 25, // Igual que el web: 25px
    paddingBottom: 20, // Padding inferior
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 9999,
    flexDirection: 'column', // display: flex, flexDirection: column (igual que el web)
    justifyContent: 'space-between', // Distribuir espacio entre elementos
  },
  topSection: {
    alignItems: 'center',
  },
  menuItemsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  bottomSection: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    width: 48, // Igual que el web: 48px
    height: 48, // Igual que el web: 48px
    marginBottom: 32, // Igual que el web: 32px
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  menuItem: {
    width: 79, // Igual que el web: 79px
    height: 63.672, // Igual que el web: 63.672px
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14, // Igual que el web: 14px
    borderRadius: 58.955, // Igual que el web cuando no está activo
  },
  menuItemActive: {
    backgroundColor: '#0C2ABF', // Igual que el web
    borderRadius: 10, // Igual que el web cuando está activo
  },
  menuLabel: {
    fontFamily: 'Inter',
    fontWeight: '400', // Igual que el web: 400
    fontSize: 11.791, // Igual que el web: 11.791px
    lineHeight: 11.791, // Igual que el web: 11.791px
    color: 'transparent', // Igual que el web cuando no está activo
  },
  menuLabelActive: {
    color: '#ffffff', // Igual que el web cuando está activo
  },
  settingsButton: {
    width: 79, // Igual que el web: 79px
    height: 63.672, // Igual que el web: 63.672px
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20, // Igual que el web: 20px
  },
});
