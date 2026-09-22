import { ClienteERP, ArticuloERP, GastoERP, DocumentoERP, CobroERP, NotaAlmacenERP, VisitaERP } from '../dtos/erp.dtos';
import { Cliente } from '../models/cliente.model';
import { Articulo } from '../models/articulo.model';
import { Gasto } from '../models/gasto.model';
import { Documento } from '../models/documento.model';
import { Cobro } from '../models/cobro.model';
import { NotaAlmacen } from '../models/almacen.model';
import { Visita } from '../models/visita.model';

function parseNumber(value: any): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value !== 'string') return 0;

    const cleaned = value.replace(/[^\d,.-]/g, '').trim();
    if (!cleaned) return 0;

    let normalized = cleaned;
    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');
    if (hasComma && hasDot) {
        if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
            normalized = normalized.replace(/\./g, '').replace(',', '.');
        } else {
            normalized = normalized.replace(/,/g, '');
        }
    } else if (hasComma) {
        normalized = normalized.replace(',', '.');
    }

    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeArticuloImage(value: any): string | undefined {
    if (typeof value !== 'string') return undefined;
    const raw = value.trim();
    if (!raw) return undefined;
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:image/')) return raw;
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(raw) && raw.length > 100) {
        return `data:image/jpeg;base64,${raw.replace(/\s/g, '')}`;
    }
    return undefined;
}

export function mapearClienteERPaLocal(clienteERP: any): Cliente {
    const id = clienteERP.Id || clienteERP.ID_Cliente || clienteERP.id || '';
    const nombre = clienteERP.Nombre || clienteERP.nombre || '';
    const razonSocial = clienteERP.RazonSocial || clienteERP.razonSocial || nombre;
    const direccion = clienteERP.Direccion || clienteERP.direccion || '';

    // El ERP Verial almacena localidades en una tabla de catálogo (ID_Localidad).
    // La resolución del nombre se hace en syncClientes usando GetLocalidadesWS.
    // Aquí intentamos leer el nombre textual si el ERP lo devuelve directamente.
    const localidadCandidatos: any[] = [
        clienteERP.Localidad,
        clienteERP.localidad,
        clienteERP.NombreLocalidad,
        clienteERP.NombreMunicipio,
        clienteERP.Municipio,
        clienteERP.Poblacion,
        clienteERP.poblacion,
        clienteERP.NombrePoblacion,
        clienteERP.Ciudad,
        clienteERP.ciudad,
    ];

    // Tomar el primer valor textual (no numérico) disponible
    const localidad = localidadCandidatos.reduce((found: string, val: any) => {
        if (found) return found;
        if (val === null || val === undefined || val === '') return '';
        const str = String(val).trim();
        // Descartar IDs numéricos (ej. "2879", "2.879", "2,879")
        if (!str || /^\d+[\.,]?\d*$/.test(str)) return '';
        return str;
    }, '');

    const telefono = clienteERP.Telefono || clienteERP.telefono || clienteERP.Telefono1 || clienteERP.TelefonoN1 || '';
    const email = clienteERP.Email || clienteERP.email || clienteERP.Email1 || '';
    const nif = clienteERP.NIF || clienteERP.nif || '';
    const codigoPostal = clienteERP.CPostal || clienteERP.CodigoPostal || clienteERP.codigoPostal || '';
    const provincia = clienteERP.Provincia || clienteERP.NombreProvincia || clienteERP.provincia || '';

    // Régimen fiscal: el ERP Verial devuelve el ID numérico en RegFiscal o ID_RegFiscal.
    // 1=IVA normal · 2=IVA+R.E. · 3=UE intracomunitario · 4=Exento nac. · 5=Exento ext.
    // 6=Agricultura · 7=Canarias IGIC
    const regimenFiscalRaw = clienteERP.RegFiscal ?? clienteERP.ID_RegFiscal ??
        clienteERP.RegimenFiscal ?? clienteERP.regFiscal ?? null;
    const regimenFiscal = regimenFiscalRaw !== null ? Number(regimenFiscalRaw) : undefined;
    const recargoEquivalencia = regimenFiscal === 2;

    // LOG: confirmar qué campo usa el ERP para el régimen fiscal (solo en los primeros clientes)
    if (id && (Number(id) <= 3 || recargoEquivalencia)) {
        console.log(`🧾 [cliente ${id}] RegFiscal raw: ${regimenFiscalRaw} → regimenFiscal: ${regimenFiscal} → RE: ${recargoEquivalencia}`);
    }

    // Código comercial del cliente (lo que memorizan los vendedores); el Id interno puede diferir.
    const codigoClienteRaw =
        clienteERP.Codigo ??
        clienteERP.codigo ??
        clienteERP.CodigoCliente ??
        clienteERP.codigoCliente ??
        clienteERP.NumCliente ??
        clienteERP.NumeroCliente ??
        clienteERP.NCliente ??
        clienteERP.CodCli ??
        clienteERP.RefCliente ??
        clienteERP.ReferenciaCliente ??
        clienteERP.Cuenta ??
        clienteERP.CuentaContable ??
        '';
    const codigoComercial =
        codigoClienteRaw !== '' && codigoClienteRaw !== null && codigoClienteRaw !== undefined
            ? String(codigoClienteRaw).trim()
            : '';

    return {
        id: id.toString(),
        codigo: codigoComercial || id.toString(),
        nombre: nombre,
        empresa: razonSocial || nombre,
        // Dirección solo contiene la calle; la localidad se muestra por separado
        direccion: direccion || 'Sin dirección',
        localidad: localidad,
        telefono: telefono,
        email: email,
        ultimaVisita: 'Sin registrar',
        nif: nif,
        codigoPostal: codigoPostal,
        provincia: provincia,
        regimenFiscal: regimenFiscal,
        recargoEquivalencia: recargoEquivalencia
    };
}

export function mapearArticuloERPaLocal(articuloERP: any): Articulo {
    const stock = articuloERP.Stock ?? articuloERP.Cantidad ?? 0;
    const stockMinimo = articuloERP.StockMinimo ?? 0;

    const precioRaw = articuloERP.PVP ??
        articuloERP.Precio ??
        articuloERP.PrecioVenta ??
        articuloERP.PrecioUnitario ??
        articuloERP.Importe ??
        articuloERP.PrecioTarifa ??
        articuloERP.PrecioBase ??
        0;
    const precio = parseNumber(precioRaw);

    if (precio === 0) {
        // console.warn(`⚠️ [mapearArticuloERPaLocal] Artículo sin precio: ${articuloERP.Nombre || articuloId}`);
    }

    const codigo = articuloERP.Codigo ??
        articuloERP.CodigoArticulo ??
        articuloERP.ReferenciaBarras ??
        articuloERP.Referencia ??
        '';

    let categoria = 'Sin Categoría';
    let categoriaId: string | undefined = undefined;

    // Determinar ID numérico de categoría
    const idCatNum = articuloERP.ID_Categoria ?? articuloERP.id_categoria ?? null;
    if (idCatNum !== null && idCatNum !== 0) {
        categoriaId = String(idCatNum);
    }

    // Determinar NOMBRE de categoría — priorizar campos de texto,
    // descartar si el valor es puramente numérico (es un ID, no un nombre)
    const categoriaRaw = articuloERP.NombreCategoria ?? articuloERP.Categoria ?? null;
    const categoriaStr = categoriaRaw !== null ? String(categoriaRaw).trim() : '';
    if (categoriaStr && !/^\d+$/.test(categoriaStr)) {
        // Es un texto real (no un número puro): usarlo como nombre
        categoria = categoriaStr;
    } else if (categoriaId) {
        // Solo tenemos el ID: usar como placeholder; syncArticulos lo resolverá con el catálogo
        categoria = `Categoría ${categoriaId}`;
    }

    categoria = categoria.trim();
    if (categoria === '' || categoria === 'null' || categoria === 'undefined') {
        categoria = 'Sin Categoría';
    }

    const ivaCandidates = [
        articuloERP.PorcentajeIVA,
        articuloERP.PorcentajeIva,
        articuloERP.porcentajeIva,
        articuloERP.PorcIVA,
        articuloERP.PorcIva,
        articuloERP.IVA,
        articuloERP.TasaIVA,
        articuloERP.TipoIVAPorc,
        articuloERP.P_IVA,
        articuloERP.Porc_IVA,
    ];
    let porcentajeIva = 10;
    for (const raw of ivaCandidates) {
        const n = parseNumber(raw);
        if (n > 0 && n <= 100) {
            porcentajeIva = Math.round(n * 100) / 100;
            break;
        }
    }

    return {
        id: articuloERP.Id?.toString() || articuloERP.ID_Articulo?.toString() || '',
        nombre: articuloERP.Nombre || 'Sin nombre',
        cantidad: stock,
        categoria: categoria,
        categoriaId,
        porcentajeIva,
        precio: precio > 0 ? `${precio.toFixed(2).replace('.', ',')} €` : '0,00 €',
        stockMinimo: stockMinimo,
        codigoCorto: codigo,
        imagen: normalizeArticuloImage(
            articuloERP.Imagen ??
            articuloERP.imagen ??
            articuloERP.UrlImagen ??
            articuloERP.URLImagen ??
            articuloERP.Url ??
            articuloERP.URL ??
            articuloERP.Image ??
            articuloERP.Base64 ??
            articuloERP.ImagenBase64
        )
    };
}

export function mapearGastoERPaLocal(gastoERP: GastoERP): Gasto {
    const date = new Date(gastoERP.Fecha);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const time = date.toTimeString().split(' ')[0];

    return {
        id: gastoERP.Id.toString(),
        nombre: gastoERP.Concepto || 'Gasto vario',
        categoria: gastoERP.Tipo || 'Otros',
        precio: `${gastoERP.Importe.toFixed(2).replace('.', ',')} €`,
        fecha: `${day}/${month}/${year}, ${time}`,
        imagen: gastoERP.Imagen
    };
}

export function mapearDocumentoERPaLocal(docERP: DocumentoERP): Documento {
    return {
        id: docERP.Id.toString(),
        nombre: docERP.Nombre,
        categoria: docERP.Categoria || 'Otros',
        fecha: docERP.Fecha ? new Date(docERP.Fecha).toLocaleDateString('es-ES') : '',
        tamano: docERP.Tamano || '0 KB',
        tipo: (docERP.Tipo as 'pdf' | 'image' | 'doc') || 'doc'
    };
}

export function mapearCobroERPaLocal(cobroERP: CobroERP): Cobro {
    return {
        id: cobroERP.Id.toString(),
        clienteId: cobroERP.IdCliente.toString(),
        cliente: cobroERP.NombreCliente || 'Cliente Desconocido',
        monto: `${cobroERP.Importe.toFixed(2).replace('.', ',')} €`,
        fecha: cobroERP.Fecha ? new Date(cobroERP.Fecha).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES'),
        estado: 'pendiente',
        notaVentaId: cobroERP.IdNotaVenta ? cobroERP.IdNotaVenta.toString() : undefined
    };
}

export function mapearNotaAlmacenERPaLocal(notaERP: NotaAlmacenERP): NotaAlmacen {
    const date = new Date(notaERP.Fecha);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const time = date.toTimeString().split(' ')[0].substring(0, 5);

    return {
        id: notaERP.Id.toString(),
        tipo: notaERP.Tipo as any,
        fecha: `${day}/${month}/${year}, ${time}`,
        usuario: notaERP.Usuario || 'Sistema',
        articulos: notaERP.NumArticulos || 0,
        observaciones: notaERP.Observaciones || ''
    };
}

export function mapearVisitaERPaLocal(visitaERP: VisitaERP): Visita {
    const fechaObj = new Date(visitaERP.Fecha);
    const fecha = fechaObj.toISOString().split('T')[0];
    const hora = fechaObj.toTimeString().substring(0, 5);

    let tipo: 'visita' | 'entrega' | 'cobro' = 'visita';
    const tipoLower = (visitaERP.Tipo || '').toLowerCase();
    if (tipoLower.includes('entrega')) tipo = 'entrega';
    else if (tipoLower.includes('cobro')) tipo = 'cobro';

    return {
        id: visitaERP.Id.toString(),
        clienteId: visitaERP.IdCliente?.toString(),
        clienteNombre: visitaERP.NombreCliente || 'Cliente',
        direccion: visitaERP.Direccion || '',
        fecha: fecha,
        hora: hora,
        tipo: tipo,
        completado: visitaERP.Completado,
        observaciones: visitaERP.Observaciones
    };
}
