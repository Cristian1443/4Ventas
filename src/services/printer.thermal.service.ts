/**
 * Impresión térmica Bluetooth (ESC/POS) — desarrollo opcional de la adenda de alcance.
 *
 * Usa `react-native-thermal-receipt-printer-image-qr` (BLE). Requiere build nativo vía EAS
 * (no funciona en Expo Go) y un dispositivo físico para validar el emparejamiento real.
 * Esta capa aísla la librería concreta: si el modelo de impresora del cliente solo soporta
 * Bluetooth clásico (SPP) en vez de BLE, basta reemplazar la implementación interna de
 * estas funciones sin tocar quien las consume (printer.matricial.service.ts).
 */

import { PermissionsAndroid, Platform } from 'react-native';
import { BLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';

export interface DispositivoBluetooth {
  device_name: string;
  inner_mac_address: string;
}

let inicializado = false;

/**
 * En Android 12+ (API 31+) escanear/conectar por Bluetooth sin haber pedido
 * BLUETOOTH_SCAN/BLUETOOTH_CONNECT en tiempo de ejecución puede lanzar una excepción
 * nativa no controlable desde JS (pantalla en blanco / cierre de la app). Se piden aquí,
 * antes de cualquier llamada a la librería nativa.
 */
async function ensurePermisosBluetooth(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const version = Number(Platform.Version) || 0;
    const permisos = version >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const resultados = await PermissionsAndroid.requestMultiple(permisos as any);
    const denegado = Object.values(resultados).some(r => r !== PermissionsAndroid.RESULTS.GRANTED);
    if (denegado) {
      throw new Error('Permiso de Bluetooth denegado. Actívalo en Ajustes > Aplicaciones > 4Ventas > Permisos.');
    }
  } catch (error: any) {
    if (error?.message?.includes('Permiso de Bluetooth')) throw error;
    throw new Error('No se pudieron solicitar los permisos de Bluetooth.');
  }
}

async function ensureInit(): Promise<void> {
  await ensurePermisosBluetooth();
  if (inicializado) return;
  await BLEPrinter.init();
  inicializado = true;
}

export async function scanDevices(): Promise<DispositivoBluetooth[]> {
  await ensureInit();
  const devices = await BLEPrinter.getDeviceList();
  return (devices || []) as DispositivoBluetooth[];
}

export async function connect(macAddress: string): Promise<void> {
  await ensureInit();
  await BLEPrinter.connectPrinter(macAddress);
}

export async function printText(texto: string): Promise<void> {
  await BLEPrinter.printBill(texto);
}

export async function disconnect(): Promise<void> {
  try {
    await BLEPrinter.closeConn();
  } catch {
    // Ignorar: puede no haber conexión activa
  }
}

/** Conecta, imprime y desconecta en una sola operación — uso típico desde una pantalla de venta/cobro. */
export async function imprimirEnTermica(macAddress: string, texto: string): Promise<void> {
  await connect(macAddress);
  try {
    await printText(texto);
  } finally {
    await disconnect();
  }
}
