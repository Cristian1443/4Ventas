/**
 * Stock local del furgón, calculado enteramente en la tablet (no depende del stock
 * general del ERP): suma de Notas de Almacén (cargas/descargas/intercambios) menos lo
 * vendido, desde el último "Borrar existencias y poner stock a cero" que haga el vendedor.
 */
import { storageService } from './storage.service';
import { NotaAlmacen } from '../models/almacen.model';
import { NotaVenta } from '../models/venta.model';

const checkpointKey = (vendorId: string) => `stockLocalCheckpointMs__${vendorId}`;

export async function getStockLocalCheckpointMs(vendorId: string | null | undefined): Promise<number | undefined> {
  if (!vendorId?.trim()) return undefined;
  const v = await storageService.getItem<number>(checkpointKey(vendorId.trim()));
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;
}

/** "Borrar existencias y poner stock a cero": todo lo cargado/vendido antes de ahora deja de contar. */
export async function resetStockLocalAhora(vendorId: string | null | undefined): Promise<number | undefined> {
  const id = vendorId?.trim();
  if (!id) return undefined;
  const now = Date.now();
  await storageService.setItem(checkpointKey(id), now);
  return now;
}

const SIGNO_MOVIMIENTO: Record<NotaAlmacen['tipo'], number> = {
  'Carga Camion': 1,
  'Intercambio Entrada': 1,
  'Descarga Camion': -1,
  'Intercambio Salida': -1,
  'Inventario Camion': 0, // recuento informativo, no es un movimiento de entrada/salida
};

/** Stock por artículo = movimientos de almacén - unidades vendidas, ambos desde el checkpoint. */
export function calcularStockLocalPorArticulo(
  notasAlmacen: NotaAlmacen[],
  notasVenta: NotaVenta[],
  checkpointMs: number | undefined
): Record<string, number> {
  const stock: Record<string, number> = {};

  const cuentaDesdeCheckpoint = (ts: number | undefined) =>
    checkpointMs === undefined || (ts !== undefined && ts >= checkpointMs);

  for (const nota of notasAlmacen) {
    if (!cuentaDesdeCheckpoint(nota.liquidacionSesionTs)) continue;
    const signo = SIGNO_MOVIMIENTO[nota.tipo] ?? 0;
    if (signo === 0) continue;
    for (const item of nota.items || []) {
      const cantidad = Number(item.cantidad) || 0;
      stock[item.articuloId] = (stock[item.articuloId] || 0) + signo * cantidad;
    }
  }

  for (const nota of notasVenta) {
    if (nota.estado === 'abierta' || nota.estado === 'anulada') continue;
    if (!cuentaDesdeCheckpoint(nota.liquidacionSesionTs)) continue;
    for (const item of nota.items || []) {
      const articuloId = item.articuloId ?? item.id;
      if (!articuloId) continue;
      const cantidad = Number(item.cantidad) || 0;
      stock[articuloId] = (stock[articuloId] || 0) - cantidad;
    }
  }

  return stock;
}
