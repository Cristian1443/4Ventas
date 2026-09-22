/**
 * Servicio de Impresión Matricial - React Native
 * Actualizado con configuración dinámica
 */

import * as Print from 'expo-print';
import { storageService } from './storage.service';
import { vendorService } from './vendor.service';
import * as thermalPrinter from './printer.thermal.service';

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Cabecera personalizada (tabletConfig, panel admin): empresa/dirección/teléfono estructurados
 *  + vendedor activo si está activado; si no hay campos estructurados, usa las líneas legacy
 *  (encabezadoImpresion1/2/3) para no perder configuración ya hecha en tablets en producción. */
export async function obtenerLineasCabeceraImpresionTablet(): Promise<string[]> {
  try {
    const cfg = await storageService.getItem<any>('tabletConfig');
    if (!cfg) return [];

    const estructuradas = [cfg.cabeceraEmpresa, cfg.cabeceraDireccion, cfg.cabeceraTelefono]
      .map((x: unknown) => String(x || '').trim())
      .filter(Boolean);

    const lineas = estructuradas.length > 0
      ? estructuradas
      : [cfg.encabezadoImpresion1, cfg.encabezadoImpresion2, cfg.encabezadoImpresion3]
          .map((x: unknown) => String(x || '').trim())
          .filter(Boolean);

    if (cfg.cabeceraMostrarVendedor) {
      const vendedor = await vendorService.getVendedorActual();
      if (vendedor?.nombre) lineas.push(vendedor.nombre);
    }

    return lineas;
  } catch {
    return [];
  }
}

export interface NotaImpresion {
  id: string;
  cliente: {
    codigo: string;
    nombre: string;
    razonSocial?: string;
    nif?: string;
    direccion?: string;
    telefono?: string;
  };
  articulos: {
    nombre: string;
    cantidad: string | number;
    valor?: string;
    precioUnitario?: number;
    descuento?: number;
    tipoDescuento?: 'porcentaje' | 'pesos';
    nota?: string;
  }[];
  totales: {
    subtotal?: string; // Opcional para backward compatibility
    descuentos: string;
    porcentajeDescuento?: string;
    iva: string;
    total: string;
    base?: string; // Nuevo campo opcional
  };
  tipoNota?: string; // Ej: 'Albarán', 'Pedido'
  formaPago?: string;
  fecha?: string;
}

// Generar HTML para impresión
const generarHTMLNota = (nota: NotaImpresion, cabeceraLineas?: string[]): string => {
  const fecha = nota.fecha || new Date().toLocaleString('es-ES');
  // USAR TIPO DE NOTA COMO TÍTULO
  const tituloDocumento = (nota.tipoNota || 'NOTA DE VENTA').toUpperCase();

  const bloqueTituloCabecera =
    cabeceraLineas && cabeceraLineas.length > 0
      ? `<div class="header">${cabeceraLineas
          .map(
            line =>
              `<div style="font-size:13px;font-weight:bold;margin-bottom:4px;line-height:1.25">${escapeHtml(
                line
              )}</div>`
          )
          .join('')}<h2>${escapeHtml(tituloDocumento)}</h2></div>`
      : `<div class="header">
          <h1>4VENTAS</h1>
          <h2>${tituloDocumento}</h2>
        </div>`;
  
  const articulosHTML = nota.articulos.map(art => {
    const cantidad = String(art.cantidad || '');
    let precio = art.valor || '';
    
    if (!precio && art.precioUnitario !== undefined) {
      const subtotal = art.precioUnitario * Number(art.cantidad || 1);
      let descuentoAplicado = 0;
      
      if (art.descuento && art.descuento > 0) {
        if (art.tipoDescuento === 'porcentaje') {
          descuentoAplicado = (subtotal * art.descuento) / 100;
        } else {
          descuentoAplicado = art.descuento * Number(art.cantidad || 1);
        }
      }
      
      precio = (subtotal - descuentoAplicado).toFixed(2) + ' €';
    }
    
    const descuentoStr = art.descuento && art.descuento > 0
      ? (art.tipoDescuento === 'porcentaje' ? `-${art.descuento}%` : `-${art.descuento}€`)
      : '';
    
    return `
      <tr>
        <td style="padding: 4px 0;">${art.nombre}</td>
        <td style="text-align: center; padding: 4px 0;">${cantidad}</td>
        <td style="text-align: right; padding: 4px 0;">${precio}</td>
        ${descuentoStr ? `<td style="text-align: right; color: #10b981; padding: 4px 0;">${descuentoStr}</td>` : '<td></td>'}
      </tr>
      ${art.nota ? `<tr><td colspan="4" style="font-size: 10px; color: #697b92; padding-left: 12px;">Nota: ${art.nota}</td></tr>` : ''}
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: 80mm auto; margin: 5mm; }
          body { font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.4; margin: 0; padding: 0; color: #000; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 8px; }
          .header h1 { margin: 0; font-size: 14px; font-weight: bold; }
          .header h2 { margin: 4px 0 0 0; font-size: 12px; }
          .info { margin: 8px 0; font-size: 10px; }
          .separator { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          table th { text-align: left; font-size: 9px; padding: 4px 0; border-bottom: 1px solid #000; }
          table td { font-size: 10px; padding: 2px 0; }
          .totals { margin-top: 10px; border-top: 2px solid #000; padding-top: 8px; }
          .total-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 11px; }
          .total-final { font-weight: bold; font-size: 13px; margin-top: 8px; padding-top: 8px; border-top: 2px solid #000; }
          .footer { text-align: center; margin-top: 15px; font-size: 9px; color: #697b92; }
        </style>
      </head>
      <body>
        ${bloqueTituloCabecera}
        
        <div class="info">
          <strong>Nota:</strong> ${nota.id}<br>
          <strong>Fecha:</strong> ${fecha}
        </div>
        
        <div class="separator"></div>
        
        <div class="info">
          <strong>CLIENTE:</strong><br>
          [${nota.cliente.codigo}] ${nota.cliente.nombre}<br>
          ${nota.cliente.razonSocial ? nota.cliente.razonSocial + '<br>' : ''}
          ${nota.cliente.nif ? 'NIF: ' + nota.cliente.nif + '<br>' : ''}
          ${nota.cliente.direccion ? nota.cliente.direccion + '<br>' : ''}
        </div>
        
        <div class="separator"></div>
        
        ${nota.tipoNota ? `<div class="info"><strong>Tipo:</strong> ${nota.tipoNota}</div>` : ''}
        ${nota.formaPago ? `<div class="info"><strong>Pago:</strong> ${nota.formaPago}</div>` : ''}
        
        <div class="separator"></div>
        
        <table>
          <thead>
            <tr>
              <th>ARTÍCULO</th>
              <th style="text-align: center;">CANT</th>
              <th style="text-align: right;">PRECIO</th>
              <th style="text-align: right;">DESC</th>
            </tr>
          </thead>
          <tbody>
            ${articulosHTML}
          </tbody>
        </table>
        
        <div class="separator"></div>
        
        <div class="totals">
          ${nota.totales.subtotal ? `
          <div class="total-row">
            <span>Subtotal:</span><span>${nota.totales.subtotal} €</span>
          </div>` : ''}
          <div class="total-row">
            <span>Descuentos:</span>
            <span>${nota.totales.descuentos} € ${nota.totales.porcentajeDescuento ? '(' + nota.totales.porcentajeDescuento + '%)' : ''}</span>
          </div>
          <div class="total-row">
            <span>IVA o RE:</span>
            <span>${nota.totales.iva} €</span>
          </div>
          <div class="total-row total-final">
            <span>TOTAL:</span>
            <span>${nota.totales.total} €</span>
          </div>
        </div>
        
        <div class="footer">
          Gracias por su compra<br>
          www.4ventas.com
        </div>
      </body>
    </html>
  `;
};

// Generar texto plano para matriciales
const generarTextoNota = (nota: NotaImpresion, cabeceraLineas?: string[], anchoCaracteres = 42): string => {
  const width = anchoCaracteres;
  const pad = (text: string, len: number, align: 'left' | 'right' | 'center' = 'left') => {
    const str = String(text || '').substring(0, len);
    const padding = len - str.length;
    if (align === 'right') return ' '.repeat(padding) + str;
    if (align === 'center') {
      const left = Math.floor(padding / 2);
      return ' '.repeat(left) + str + ' '.repeat(padding - left);
    }
    return str + ' '.repeat(padding);
  };
  
  // TÍTULO DINÁMICO
  const titulo = (nota.tipoNota || 'NOTA DE VENTA').toUpperCase();

  let texto = '\n';
  if (cabeceraLineas && cabeceraLineas.length > 0) {
    cabeceraLineas.forEach(line => {
      texto += pad(line, width, 'center') + '\n';
    });
  } else {
    texto += pad('4VENTAS', width, 'center') + '\n';
  }
  texto += pad(titulo, width, 'center') + '\n';
  texto += '='.repeat(width) + '\n\n';
  texto += pad(`Nota: ${nota.id}`, width) + '\n';
  texto += pad(`Fecha: ${nota.fecha || new Date().toLocaleString('es-ES')}`, width) + '\n';
  texto += '-'.repeat(width) + '\n\n';
  texto += pad('CLIENTE:', width) + '\n';
  texto += pad(`[${nota.cliente.codigo}] ${nota.cliente.nombre}`, width) + '\n';
  if (nota.cliente.razonSocial) texto += pad(nota.cliente.razonSocial, width) + '\n';
  if (nota.cliente.nif) texto += pad(`NIF: ${nota.cliente.nif}`, width) + '\n';
  if (nota.cliente.direccion) texto += pad(nota.cliente.direccion, width) + '\n';
  texto += '-'.repeat(width) + '\n\n';
  if (nota.tipoNota) texto += pad(`Tipo: ${nota.tipoNota}`, width) + '\n';
  if (nota.formaPago) texto += pad(`Pago: ${nota.formaPago}`, width) + '\n';
  texto += '-'.repeat(width) + '\n\n';
  texto += pad('ARTICULO', 22) + pad('CANT', 6, 'right') + pad('PRECIO', 14, 'right') + '\n';
  texto += '-'.repeat(width) + '\n';
  
  nota.articulos.forEach(art => {
    const nombre = String(art.nombre || '').substring(0, 22);
    const cantidad = String(art.cantidad || '');
    let precio = art.valor || '';
    
    if (!precio && art.precioUnitario !== undefined) {
      const subtotal = art.precioUnitario * Number(art.cantidad || 1);
      let descuentoAplicado = 0;
      if (art.descuento && art.descuento > 0) {
        if (art.tipoDescuento === 'porcentaje') {
          descuentoAplicado = (subtotal * art.descuento) / 100;
        } else {
          descuentoAplicado = art.descuento * Number(art.cantidad || 1);
        }
      }
      precio = (subtotal - descuentoAplicado).toFixed(2) + ' €';
    }
    
    texto += pad(nombre, 22) + pad(cantidad, 6, 'right') + pad(precio, 14, 'right') + '\n';
    if (art.descuento && art.descuento > 0) {
      const descStr = art.tipoDescuento === 'porcentaje' ? `-${art.descuento}%` : `-${art.descuento}€`;
      texto += pad('  Desc: ' + descStr, width) + '\n';
    }
    if (art.nota) {
      texto += pad('  Nota: ' + String(art.nota).substring(0, 35), width) + '\n';
    }
  });
  
  texto += '-'.repeat(width) + '\n\n';
  if (nota.totales.subtotal) {
    texto += pad('Subtotal:', 28) + pad(`${nota.totales.subtotal} €`, 14, 'right') + '\n';
  }
  texto += pad('Descuentos:', 28) + pad(`${nota.totales.descuentos} € ${nota.totales.porcentajeDescuento ? '(' + nota.totales.porcentajeDescuento + '%)' : ''}`, 14, 'right') + '\n';
  texto += pad('IVA o RE:', 28) + pad(`${nota.totales.iva} €`, 14, 'right') + '\n';
  texto += '='.repeat(width) + '\n';
  texto += pad('TOTAL:', 28) + pad(`${nota.totales.total} €`, 14, 'right') + '\n';
  texto += '='.repeat(width) + '\n\n';
  texto += pad('Gracias por su compra', width, 'center') + '\n';
  texto += pad('www.4ventas.com', width, 'center') + '\n\n\n\n';
  
  return texto;
};

// Ancho aproximado en caracteres para la térmica (~72mm imprimibles) frente a los 42
// por defecto de la matricial (~85mm) — a falta de probar en el dispositivo real del
// cliente y ajustar tipo de letra/tamaño exactos.
const ANCHO_TERMICA = 32;

/**
 * Imprime por la impresora que tenga asignada el vendedor activo. Ambas son Bluetooth:
 * la matricial se envía al diálogo de impresión del sistema (Android la resuelve como
 * impresora Bluetooth si el driver/print-service del fabricante está instalado); la
 * térmica se conecta directamente por BLE con un ancho de texto más estrecho.
 */
async function imprimirSegunVendedorActivo(html: string, generarTexto: (anchoCaracteres: number) => string): Promise<void> {
  const vendedor = await vendorService.getVendedorActual();
  if (vendedor?.printerType === 'termica_bt' && vendedor.printerBtAddress) {
    await thermalPrinter.imprimirEnTermica(vendedor.printerBtAddress, generarTexto(ANCHO_TERMICA));
    return;
  }
  await Print.printAsync({ html });
}

export const imprimirNotaVenta = async (nota: NotaImpresion): Promise<void> => {
  try {
    const cab = await obtenerLineasCabeceraImpresionTablet();
    const html = generarHTMLNota(nota, cab);
    await imprimirSegunVendedorActivo(html, (ancho) => generarTextoNota(nota, cab, ancho));
  } catch (error) {
    console.error('Error imprimiendo:', error);
    throw error;
  }
};

export const exportarNotaTXT = async (nota: NotaImpresion): Promise<void> => {
  try {
    const cab = await obtenerLineasCabeceraImpresionTablet();
    const html = generarHTMLNota(nota, cab);
    await Print.printAsync({ html });
  } catch (error) {
    console.error('Error exportando nota:', error);
    throw error;
  }
};

export const copiarNotaTexto = async (nota: NotaImpresion): Promise<void> => {
  try {
    const cab = await obtenerLineasCabeceraImpresionTablet();
    const texto = generarTextoNota(nota, cab);
    // En Expo no tenemos clipboard directo aquí sin dependencias extra, 
    // así que simulamos o usamos API nativa si está disponible.
    // Por ahora solo log para desarrollo.
    console.log(texto);
  } catch (error) {
    console.error('Error copiando texto:', error);
    throw error;
  }
};

// ============================================================================
// COMPROBANTE DE COBRO
// ============================================================================

export interface ComprobanteCobro {
  cobroId: string;
  cliente: {
    nombre: string;
    empresa?: string;
    codigo?: string;
    direccion?: string;
    nif?: string;
  };
  notas: Array<{
    id: string;
    client: string;
    date: string;
    amount: number;
    articulos?: Array<{
      nombre: string;
      cantidad: number;
      precioUnitario: number;
      descuento?: number;
      tipoDescuento?: 'porcentaje' | 'pesos';
    }>;
  }>;
  metodoPago: string;
  subtotal: number;
  fecha: Date | string;
}

// Generar HTML del comprobante de cobro (para Print.printAsync)
const generarHTMLComprobanteCobro = (comprobante: ComprobanteCobro, cabeceraLineas?: string[]): string => {
  const fecha = comprobante.fecha instanceof Date
    ? comprobante.fecha.toLocaleString('es-ES')
    : comprobante.fecha;

  const notasHTML = comprobante.notas.map(nota => {
    const articulosHTML = (nota.articulos || []).map(art => {
      const subtotal = (art.precioUnitario || 0) * Number(art.cantidad || 1);
      let descuentoAplicado = 0;
      if (art.descuento && art.descuento > 0) {
        descuentoAplicado = art.tipoDescuento === 'porcentaje'
          ? (subtotal * art.descuento) / 100
          : art.descuento * Number(art.cantidad || 1);
      }
      const total = (subtotal - descuentoAplicado).toFixed(2);
      return `
        <tr>
          <td style="padding:3px 0">${art.nombre}</td>
          <td style="text-align:center;padding:3px 0">${art.cantidad}</td>
          <td style="text-align:right;padding:3px 0">${total} €</td>
        </tr>`;
    }).join('');

    return `
      <tr style="background:#f8fafc">
        <td colspan="3" style="padding:6px 0;font-weight:700">${nota.id}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:2px 0;font-size:10px;color:#697b92">${nota.date}</td>
        <td style="text-align:right;padding:2px 0;font-weight:700">${nota.amount.toFixed(2)} €</td>
      </tr>
      ${articulosHTML}`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: 80mm auto; margin: 5mm; }
          body { font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.4; margin: 0; padding: 0; color: #000; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 8px; }
          .header h1 { margin: 0; font-size: 14px; font-weight: bold; }
          .header h2 { margin: 4px 0 0 0; font-size: 12px; }
          .info { margin: 8px 0; font-size: 10px; }
          .separator { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; font-size: 9px; padding: 4px 0; border-bottom: 1px solid #000; }
          td { font-size: 10px; }
          .total-row { display: flex; justify-content: space-between; margin: 4px 0; }
          .total-final { font-weight: bold; font-size: 13px; margin-top: 8px; padding-top: 8px; border-top: 2px solid #000; }
          .footer { text-align: center; margin-top: 15px; font-size: 9px; color: #697b92; }
        </style>
      </head>
      <body>
        <div class="header">
          ${cabeceraLineas && cabeceraLineas.length > 0
            ? `${cabeceraLineas
                .map(
                  line =>
                    `<div style="font-size:13px;font-weight:bold;margin-bottom:4px;line-height:1.25">${escapeHtml(
                      line
                    )}</div>`
                )
                .join('')}<h2>COMPROBANTE DE COBRO</h2>`
            : `<h1>4VENTAS</h1><h2>COMPROBANTE DE COBRO</h2>`}
        </div>
        <div class="info">
          <strong>Cobro:</strong> ${comprobante.cobroId}<br>
          <strong>Fecha:</strong> ${fecha}
        </div>
        <div class="separator"></div>
        <div class="info">
          <strong>CLIENTE:</strong><br>
          ${comprobante.cliente.empresa || comprobante.cliente.nombre}<br>
          ${comprobante.cliente.codigo ? '[' + comprobante.cliente.codigo + ']<br>' : ''}
          ${comprobante.cliente.nif ? 'NIF: ' + comprobante.cliente.nif + '<br>' : ''}
          ${comprobante.cliente.direccion ? comprobante.cliente.direccion + '<br>' : ''}
        </div>
        <div class="separator"></div>
        <div class="info"><strong>Método de Pago:</strong> ${comprobante.metodoPago}</div>
        <div class="separator"></div>
        <table>
          <thead>
            <tr>
              <th>NOTA / ARTÍCULO</th>
              <th style="text-align:center">CANT</th>
              <th style="text-align:right">IMPORTE</th>
            </tr>
          </thead>
          <tbody>${notasHTML}</tbody>
        </table>
        <div class="separator"></div>
        <div class="total-row total-final">
          <span>TOTAL COBRADO:</span>
          <span>${comprobante.subtotal.toFixed(2)} €</span>
        </div>
        <div class="footer">Gracias por su pago<br>www.4ventas.com</div>
      </body>
    </html>`;
};

// Generar texto del comprobante de cobro para impresora matricial
const generarTextoComprobanteCobro = (comprobante: ComprobanteCobro, anchoCaracteres = 42): string => {
  const width = anchoCaracteres;
  const pad = (text: string, len: number, align: 'left' | 'right' | 'center' = 'left') => {
    const str = String(text || '').substring(0, len);
    const padding = len - str.length;
    if (align === 'right') return ' '.repeat(padding) + str;
    if (align === 'center') {
      const left = Math.floor(padding / 2);
      return ' '.repeat(left) + str + ' '.repeat(padding - left);
    }
    return str + ' '.repeat(padding);
  };

  const fecha = comprobante.fecha instanceof Date 
    ? comprobante.fecha.toLocaleString('es-ES')
    : comprobante.fecha;

  let texto = '\n';
  texto += pad('4VENTAS', width, 'center') + '\n';
  texto += pad('COMPROBANTE DE COBRO', width, 'center') + '\n';
  texto += '='.repeat(width) + '\n\n';
  texto += pad(`Cobro: ${comprobante.cobroId}`, width) + '\n';
  texto += pad(`Fecha: ${fecha}`, width) + '\n';
  texto += '-'.repeat(width) + '\n\n';
  texto += pad('CLIENTE:', width) + '\n';
  texto += pad(comprobante.cliente.empresa || comprobante.cliente.nombre, width) + '\n';
  if (comprobante.cliente.codigo) {
    texto += pad(`[${comprobante.cliente.codigo}]`, width) + '\n';
  }
  if (comprobante.cliente.direccion) {
    texto += pad(comprobante.cliente.direccion, width) + '\n';
  }
  if (comprobante.cliente.nif) {
    texto += pad(`NIF: ${comprobante.cliente.nif}`, width) + '\n';
  }
  texto += '-'.repeat(width) + '\n\n';
  texto += pad(`Método de Pago: ${comprobante.metodoPago}`, width) + '\n';
  texto += '-'.repeat(width) + '\n\n';
  texto += pad('NOTAS COBRADAS:', width) + '\n';
  texto += '-'.repeat(width) + '\n';
  texto += pad('NOTA', 12) + pad('FECHA', 12) + pad('IMPORTE', 18, 'right') + '\n';
  texto += '-'.repeat(width) + '\n';
  
  comprobante.notas.forEach(nota => {
    const notaId = String(nota.id).substring(0, 12);
    const fechaNota = String(nota.date).substring(0, 12);
    const importe = nota.amount.toFixed(2) + ' €';
    texto += pad(notaId, 12) + pad(fechaNota, 12) + pad(importe, 18, 'right') + '\n';
    
    // Mostrar productos de la nota si están disponibles
    if (nota.articulos && nota.articulos.length > 0) {
      texto += pad('  PRODUCTOS:', width) + '\n';
      nota.articulos.forEach(art => {
        const nombre = String(art.nombre || '').substring(0, 20);
        const cantidad = String(art.cantidad || '');
        let precio = '';
        
        if (art.precioUnitario !== undefined) {
          const subtotal = art.precioUnitario * Number(art.cantidad || 1);
          let descuentoAplicado = 0;
          
          if (art.descuento && art.descuento > 0) {
            if (art.tipoDescuento === 'porcentaje') {
              descuentoAplicado = (subtotal * art.descuento) / 100;
            } else {
              descuentoAplicado = art.descuento * Number(art.cantidad || 1);
            }
          }
          
          precio = (subtotal - descuentoAplicado).toFixed(2) + ' €';
        }
        
        texto += pad(`  ${nombre}`, 22) + pad(cantidad, 6, 'right') + pad(precio, 14, 'right') + '\n';
        
        if (art.descuento && art.descuento > 0) {
          const descStr = art.tipoDescuento === 'porcentaje' ? `-${art.descuento}%` : `-${art.descuento}€`;
          texto += pad(`    Desc: ${descStr}`, width) + '\n';
        }
      });
      texto += '-'.repeat(width) + '\n';
    }
  });
  
  texto += '='.repeat(width) + '\n';
  texto += pad('TOTAL COBRADO:', 28) + pad(`${comprobante.subtotal.toFixed(2)} €`, 14, 'right') + '\n';
  texto += '='.repeat(width) + '\n\n';
  texto += pad('Gracias por su pago', width, 'center') + '\n';
  texto += pad('www.4ventas.com', width, 'center') + '\n\n\n\n';
  
  return texto;
};

// Imprimir comprobante de cobro — usa Print.printAsync (diálogo de impresión del sistema)
export const imprimirComprobanteCobro = async (comprobante: ComprobanteCobro): Promise<void> => {
  try {
    // Leer configuración de impresora desde tabletConfig si existe
    const tabletConfig = await storageService.getItem<any>('tabletConfig');
    const impresoraIP = tabletConfig?.impresora?.trim() || '';

    if (impresoraIP) {
      const puertoCfg = tabletConfig?.impresoraPuerto ?? '9100';
      await printerService.loadSettingsFromTabletConfig(String(impresoraIP).trim(), String(puertoCfg));
    }

    const cabLines = await obtenerLineasCabeceraImpresionTablet();
    const html = generarHTMLComprobanteCobro(comprobante, cabLines);
    await imprimirSegunVendedorActivo(html, (ancho) => generarTextoComprobanteCobro(comprobante, ancho));
  } catch (error) {
    console.error('Error imprimiendo comprobante:', error);
    throw error;
  }
};

// ============================================================================
// CLASE DE CONFIGURACIÓN DE IMPRESORA
// ============================================================================

class PrinterService {
  private host: string = '192.168.1.200';
  private port: number = 9100;
  private timeout: number = 5000;

  constructor() {
    this.loadSettings();
  }

  // Cargar configuración guardada
  public async loadSettings() {
    try {
      const savedHost = await storageService.getItem<string>('printerHost');
      const savedPort = await storageService.getItem<string>('printerPort');
      
      if (savedHost) this.host = savedHost;
      if (savedPort) {
        const portNum = parseInt(savedPort, 10);
        if (!isNaN(portNum)) this.port = portNum;
      }
      console.log(`🖨️ Configuración impresora cargada: ${this.host}:${this.port}`);
    } catch (error) {
      console.warn('⚠️ Error cargando configuración de impresora, usando valores por defecto');
    }
  }

  // Guardar nueva configuración
  public async updateSettings(host: string, port: string) {
    try {
      this.host = host;
      const portNum = parseInt(port, 10);
      if (!isNaN(portNum)) {
        this.port = portNum;
      } else {
        throw new Error('Puerto inválido');
      }
      
      await storageService.setItem('printerHost', host);
      await storageService.setItem('printerPort', port);
      console.log(`🖨️ Configuración impresora actualizada: ${this.host}:${this.port}`);
    } catch (error) {
      console.error('❌ Error actualizando configuración de impresora:', error);
      throw error;
    }
  }

  public getConfig() {
    return { host: this.host, port: this.port.toString() };
  }

  // Sincronizar host desde tabletConfig guardado en admin
  public async loadSettingsFromTabletConfig(impresoraIP: string, puertoStr?: string) {
    if (!impresoraIP) return;
    this.host = impresoraIP;
    const p = parseInt(String(puertoStr || '9100'), 10);
    if (!Number.isNaN(p) && p > 0) this.port = p;
    await storageService.setItem('printerHost', impresoraIP);
    await storageService.setItem('printerPort', String(this.port));
    console.log(`🖨️ Impresora configurada desde tabletConfig: ${this.host}:${this.port}`);
  }

  public async testPrint(): Promise<boolean> {
    try {
      // Simulación visual si no hay librería real de sockets instalada en entorno de dev
      console.log(`🖨️ Test de impresión a ${this.host}:${this.port}`);
      
      // Aquí se podría implementar la conexión real con TcpSocket si está disponible
      // Por ahora retornamos true para simular éxito
      // const socket = TcpSocket.createConnection({ host: this.host, port: this.port }, () => {
      //   socket.write('TEST PRINT\n');
      //   socket.destroy();
      //   return true;
      // });
      
      return true; 
    } catch (e) {
      console.error('❌ Error en test de impresión:', e);
      return false;
    }
  }
}

export const printerService = new PrinterService();