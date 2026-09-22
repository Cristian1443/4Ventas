import { storageService } from './storage.service';

const checkpointKey = (vendorId: string) => `liquidacionSesionCheckpointMs__${vendorId}`;

/**
 * Instantáneo en tablet al guardar/recibir el cobro; la liquidación en efectivo filtra por
 * `liquidacionSesionCheckpointMs` cuando el modo "desde último cierre" está activo.
 */
export async function getLiquidacionSesionCheckpointMs(vendorId: string | null | undefined): Promise<number | undefined> {
  if (!vendorId?.trim()) return undefined;
  const v = await storageService.getItem<number>(checkpointKey(vendorId.trim()));
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return v > 0 ? v : undefined;
}

export async function setLiquidacionSesionCheckpointNow(vendorId: string | null | undefined): Promise<number | undefined> {
  const id = vendorId?.trim();
  if (!id) return undefined;
  const now = Date.now();
  await storageService.setItem(checkpointKey(id), now);
  return now;
}

/**
 * Sin activar filtro: cuenta todo el período.
 * Filtrando por sesión: solo marca local ≥ checkpoint (registros sin marca no cuentan).
 */
export function entidadCuentaEnLiquidacionSesion(
  liquidacionSesionTs: number | undefined,
  checkpointMs: number | undefined,
  aplicarFiltroSesion: boolean
): boolean {
  if (!aplicarFiltroSesion || checkpointMs === undefined || checkpointMs <= 0) return true;
  if (liquidacionSesionTs === undefined || !Number.isFinite(liquidacionSesionTs)) return false;
  return liquidacionSesionTs >= checkpointMs;
}
