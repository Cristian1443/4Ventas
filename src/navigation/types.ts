/**
 * Tipos de Navegación
 */

import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  LoginEmail: undefined;

  // Dashboard
  Dashboard: undefined;

  // Ventas
  VentasMenu: undefined;
  VentasList: undefined;
  NuevaVenta: { clienteId?: string };
  VerNota: { notaId: string };
  ResumenDia: undefined;

  // Cobros
  CobrosList: undefined;
  Cobros: { clienteId: string; clienteNombre: string };
  CobrosConfirmacion: { cobro: any };

  // Gastos
  Gastos: undefined;

  // Clientes
  Clientes: undefined;

  // Artículos
  Articulos: undefined;

  // Documentos
  Documentos: undefined;

  // Almacén
  Almacen: undefined;
  NotasAlmacen: undefined;
  ResumenStock: undefined;

  // Agenda
  Agenda: undefined;

  // Comunicación
  Comunicacion: undefined;

  // Configuración
  Configuracion: undefined;
};

// Navigation Props para cada pantalla
export type LoginNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;
export type DashboardNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;
export type NuevaVentaNavigationProp = StackNavigationProp<RootStackParamList, 'NuevaVenta'>;
export type CobrosNavigationProp = StackNavigationProp<RootStackParamList, 'Cobros'>;

// Route Props
export type NuevaVentaRouteProp = RouteProp<RootStackParamList, 'NuevaVenta'>;
export type VerNotaRouteProp = RouteProp<RootStackParamList, 'VerNota'>;
export type CobrosRouteProp = RouteProp<RootStackParamList, 'Cobros'>;
