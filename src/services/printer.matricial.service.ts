/**
 * Servicio de Impresión Matricial - React Native
 * Usa expo-print y expo-sharing para generar PDFs y compartir archivos
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

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
    descuentos: string;
    porcentajeDescuento?: string;
    iva: string;
    total: string;
  };
  tipoNota?: string;
  formaPago?: string;
  fecha?: string;
}

// Generar HTML para impresión
const generarHTMLNota = (nota: NotaImpresion): string => {
  const fecha = nota.fecha || new Date().toLocaleString('es-ES');
  
  const articulosHTML = nota.articulos.map(art => {
    const cantidad = String(art.cantidad || '');
    let precio = art.valor || '';
    
    // Calcular precio si no viene en valor
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
          @page {
            size: 80mm auto;
            margin: 5mm;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.4;
            margin: 0;
            padding: 0;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
          }
          .header h1 {
            margin: 0;
            font-size: 14px;
            font-weight: bold;
          }
          .header h2 {
            margin: 4px 0 0 0;
            font-size: 12px;
          }
          .info {
            margin: 8px 0;
            font-size: 10px;
          }
          .separator {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
          }
          table th {
            text-align: left;
            font-size: 9px;
            padding: 4px 0;
            border-bottom: 1px solid #000;
          }
          table td {
            font-size: 10px;
            padding: 2px 0;
          }
          .totals {
            margin-top: 10px;
            border-top: 2px solid #000;
            padding-top: 8px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 11px;
          }
          .total-final {
            font-weight: bold;
            font-size: 13px;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 2px solid #000;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 9px;
            color: #697b92;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>4VENTAS</h1>
          <h2>NOTA DE VENTA</h2>
        </div>
        
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
const generarTextoNota = (nota: NotaImpresion): string => {
  const width = 42;
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
  
  let texto = '\n';
  texto += pad('4VENTAS', width, 'center') + '\n';
  texto += pad('NOTA DE VENTA', width, 'center') + '\n';
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
  texto += pad('Descuentos:', 28) + pad(`${nota.totales.descuentos} € ${nota.totales.porcentajeDescuento ? '(' + nota.totales.porcentajeDescuento + '%)' : ''}`, 14, 'right') + '\n';
  texto += pad('IVA o RE:', 28) + pad(`${nota.totales.iva} €`, 14, 'right') + '\n';
  texto += '='.repeat(width) + '\n';
  texto += pad('TOTAL:', 28) + pad(`${nota.totales.total} €`, 14, 'right') + '\n';
  texto += '='.repeat(width) + '\n\n';
  texto += pad('Gracias por su compra', width, 'center') + '\n';
  texto += pad('www.4ventas.com', width, 'center') + '\n\n\n\n';
  
  return texto;
};

// Imprimir nota de venta
export const imprimirNotaVenta = async (nota: NotaImpresion): Promise<void> => {
  try {
    // Generar HTML
    const html = generarHTMLNota(nota);
    
    // Generar PDF
    const { uri } = await Print.printToFileAsync({ html });
    
    // Compartir/Imprimir
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Imprimir Nota ${nota.id}`
      });
    } else {
      // Si no se puede compartir, al menos mostrar el PDF
      await Print.printAsync({ uri });
    }
  } catch (error) {
    console.error('Error imprimiendo:', error);
    throw error;
  }
};

// Exportar como TXT (para impresoras matriciales)
export const exportarNotaTXT = async (nota: NotaImpresion): Promise<void> => {
  try {
    const texto = generarTextoNota(nota);
    const fileName = `nota_${nota.id}_${Date.now()}.txt`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, texto, {
      encoding: FileSystem.EncodingType.UTF8
    });
    
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: `Exportar Nota ${nota.id}`
      });
    }
  } catch (error) {
    console.error('Error exportando TXT:', error);
    throw error;
  }
};

// Copiar texto al portapapeles
export const copiarNotaTexto = async (nota: NotaImpresion): Promise<void> => {
  try {
    const texto = generarTextoNota(nota);
    const { Clipboard } = require('@react-native-clipboard/clipboard');
    await Clipboard.setString(texto);
  } catch (error) {
    console.error('Error copiando texto:', error);
    throw error;
  }
};

