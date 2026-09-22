/**
 * Utilidades fiscales (IVA minorista / Recargo de Equivalencia España).
 */

export function equivalenciaPctFromIvaArticulo(porcentajeIva: number): number {
  const p = Math.round(Number(porcentajeIva) * 100) / 100;
  if (!Number.isFinite(p) || p <= 0) return 0;
  // Tipos habitual Verial / AEAT
  if (Math.abs(p - 21) < 0.05) return 5.2;
  if (Math.abs(p - 10) < 0.05) return 1.4;
  if (Math.abs(p - 4) < 0.05 || Math.abs(p - 5) < 0.05) return 0.5;
  if (p >= 18) return 5.2;
  if (p >= 9 && p <= 12) return 1.4;
  if (p < 9) return 0.5;
  return 0;
}
