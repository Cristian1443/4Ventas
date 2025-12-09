/**
 * Navegación Principal de la Aplicación
 */

import React from 'react';
import { Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../types';
import { useResponsiveLayout } from '../constants/layout';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import LoginWithEmailScreen from '../screens/auth/LoginWithEmailScreen';
import VendorSelectionScreen from '../screens/auth/VendorSelectionScreen';

// Dashboard
import DashboardScreen from '../screens/dashboard/DashboardScreen';

// Ventas
import VentasMenuScreen from '../screens/ventas/VentasMenuScreen';
import VentasListScreen from '../screens/ventas/VentasListScreen';
import NuevaVentaScreen from '../screens/ventas/NuevaVentaScreen';
import VerNotaScreen from '../screens/ventas/VerNotaScreen';
import ResumenDiaScreen from '../screens/ventas/ResumenDiaScreen';

// Cobros
import CobrosListScreen from '../screens/cobros/CobrosListScreen';
import CobrosScreen from '../screens/cobros/CobrosScreen';
import CobrosConfirmacionScreen from '../screens/cobros/CobrosConfirmacionScreen';

// Almacén
import AlmacenScreen from '../screens/almacen/AlmacenScreen';
import NotasAlmacenScreen from '../screens/almacen/NotasAlmacenScreen';
import ResumenStockScreen from '../screens/almacen/ResumenStockScreen';
import ArticulosScreen from '../screens/almacen/ArticulosScreen';

// Otras pantallas
import GastosScreen from '../screens/gastos/GastosScreen';
import ClientesScreen from '../screens/clientes/ClientesScreen';
import DocumentosScreen from '../screens/documentos/DocumentosScreen';
import ComunicacionScreen from '../screens/comunicacion/ComunicacionScreen';
import AgendaScreen from '../screens/agenda/AgendaScreen';
import ConfiguracionScreen from '../screens/configuracion/ConfiguracionScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Tab Navigator para la navegación principal
function MainTabs() {
  const layout = useResponsiveLayout();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0C2ABF',
        tabBarInactiveTintColor: '#697b92',
        // Ocultar tabs en tablets
        tabBarStyle: layout.isTablet ? {
          display: 'none',
          height: 0,
        } : {
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600'
        }
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Panel',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />
        }}
      />
      <Tab.Screen
        name="VentasMenu"
        component={VentasMenuScreen}
        options={{
          title: 'Ventas',
          tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} />
        }}
      />
      <Tab.Screen
        name="Almacen"
        component={AlmacenScreen}
        options={{
          title: 'Almacén',
          tabBarIcon: ({ color }) => <TabIcon emoji="📦" color={color} />
        }}
      />
      <Tab.Screen
        name="Comunicacion"
        component={ComunicacionScreen}
        options={{
          title: 'Comunica',
          tabBarIcon: ({ color }) => <TabIcon emoji="💬" color={color} />
        }}
      />
      <Tab.Screen
        name="Configuracion"
        component={ConfiguracionScreen}
        options={{
          title: 'Config',
          tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />
        }}
      />
    </Tab.Navigator>
  );
}

// Navegador principal
export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      {/* Auth */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="LoginEmail" component={LoginWithEmailScreen} />
      <Stack.Screen name="VendorSelection" component={VendorSelectionScreen} />

      {/* Main App */}
      <Stack.Screen name="Main" component={MainTabs} />

      {/* Ventas */}
      <Stack.Screen name="Ventas" component={VentasListScreen} />
      <Stack.Screen name="VentasList" component={VentasListScreen} />
      <Stack.Screen name="NuevaVenta" component={NuevaVentaScreen} />
      <Stack.Screen name="VerNota" component={VerNotaScreen} />
      <Stack.Screen name="ResumenDia" component={ResumenDiaScreen} />

      {/* Cobros */}
      <Stack.Screen name="CobrosList" component={CobrosListScreen} />
      <Stack.Screen name="Cobros" component={CobrosScreen} />
      <Stack.Screen name="CobrosConfirmacion" component={CobrosConfirmacionScreen} />

      {/* Otras */}
      <Stack.Screen name="Gastos" component={GastosScreen} />
      <Stack.Screen name="Documentos" component={DocumentosScreen} />
      <Stack.Screen name="Clientes" component={ClientesScreen} />
      <Stack.Screen name="Articulos" component={ArticulosScreen} />
      <Stack.Screen name="NotasAlmacen" component={NotasAlmacenScreen} />
      <Stack.Screen name="ResumenStock" component={ResumenStockScreen} />
      <Stack.Screen name="Agenda" component={AgendaScreen} />
    </Stack.Navigator>
  );
}

// Componente auxiliar para iconos de tabs
function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const layout = useResponsiveLayout();

  return (
    <Text style={{ fontSize: layout.isTablet ? 28 : 24, color }}>
      {emoji}
    </Text>
  );
}
