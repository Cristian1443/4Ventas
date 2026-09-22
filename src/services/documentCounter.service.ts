/**
 * Correlativo de documentos locales alineado con tabletConfig / sync ERP.
 */

import { storageService } from './storage.service';

const TABLET_KEY = 'tabletConfig';

export type ContadorCampo =
  | 'contadorAlbaranes'
  | 'contadorAdicional'
  | 'contadorPedidos'
  | 'contadorOtros';

/** Misma lógica que sync.service (Serie P / X / Pedido / Presupuesto). */
export function campoContadorPorTipoNota(tipoNotaRaw?: string): ContadorCampo {
  const t = String(tipoNotaRaw || 'Serie P').trim();
  if (t === 'Serie P' || t === 'Albarán') return 'contadorAlbaranes';
  if (t === 'Serie X' || t === 'Adicional') return 'contadorAdicional';
  if (t === 'Pedido') return 'contadorPedidos';
  return 'contadorOtros'; // Presupuesto y otros
}

/**
 * Reserva el siguiente número para el tipo de documento, incrementa el contador guardado y
 * devuelve el id visible (ej. N000057) + número enviado al ERP como Numero.
 */
export async function reservarCorrelativoNotaLocal(
  tipoNotaRaw?: string
): Promise<{ numero: number; idFormateado: string }> {
  const campo = campoContadorPorTipoNota(tipoNotaRaw);
  let cfg = (await storageService.getItem<Record<string, unknown>>(TABLET_KEY)) || {};
  const actual = Number(cfg[campo]) || 1;
  const reservado = Math.max(1, actual);

  cfg = { ...cfg, [campo]: reservado + 1 };
  await storageService.setItem(TABLET_KEY, cfg);

  const idFormateado = `N${String(reservado).padStart(6, '0')}`;
  return { numero: reservado, idFormateado };
}

/**
 * Número de recibo secuencial que la app genera al cobrar un documento (campo auxiliar
 * "Recibo" en Verial). Es una secuencia propia de la app, independiente de los numeradores
 * de documentos.
 */
export async function reservarNumeroRecibo(): Promise<string> {
  let cfg = (await storageService.getItem<Record<string, unknown>>(TABLET_KEY)) || {};
  const actual = Math.max(1, Number(cfg.contadorRecibos) || 1);
  cfg = { ...cfg, contadorRecibos: actual + 1 };
  await storageService.setItem(TABLET_KEY, cfg);
  return String(actual);
}
