import { ClienteERP, ArticuloERP, GastoERP, DocumentoERP, CobroERP, NotaAlmacenERP, VisitaERP } from '../dtos/erp.dtos';
import { Cliente } from '../models/cliente.model';
import { Articulo } from '../models/articulo.model';
import { Gasto } from '../models/gasto.model';
import { Documento } from '../models/documento.model';
import { Cobro } from '../models/cobro.model';
import { NotaAlmacen } from '../models/almacen.model';
import { Visita } from '../models/visita.model';

export function mapearClienteERPaLocal(clienteERP: any): Cliente {
    const id = clienteERP.Id || clienteERP.ID_Cliente || clienteERP.id || '';
    const nombre = clienteERP.Nombre || clienteERP.nombre || '';
    const razonSocial = clienteERP.RazonSocial || clienteERP.razonSocial || nombre;
    const direccion = clienteERP.Direccion || clienteERP.direccion || '';
    const localidad = clienteERP.Localidad || clienteERP.localidad || '';
    const telefono = clienteERP.Telefono || clienteERP.telefono || '';
    const email = clienteERP.Email || clienteERP.email || '';
    const nif = clienteERP.NIF || clienteERP.nif || '';
    const codigoPostal = clienteERP.CPostal || clienteERP.codigoPostal || clienteERP.CPostal || '';
    const provincia = clienteERP.Provincia || clienteERP.provincia || '';

    return {
        id: id.toString(),
        codigo: id.toString(),
        nombre: nombre,
        empresa: razonSocial || nombre,
        direccion: `${direccion} ${localidad}`.trim() || 'Sin dirección',
        telefono: telefono,
        email: email,
        ultimaVisita: 'Sin registrar',
        nif: nif,
        codigoPostal: codigoPostal,
        provincia: provincia
    };
}

export function mapearArticuloERPaLocal(articuloERP: any): Articulo {
    const articuloId = articuloERP.Id || articuloERP.ID_Articulo || 'UNKNOWN';
    const stock = articuloERP.Stock ?? articuloERP.Cantidad ?? 0;
    const stockMinimo = articuloERP.StockMinimo ?? 0;

    const precio = articuloERP.PVP ??
        articuloERP.Precio ??
        articuloERP.PrecioVenta ??
        articuloERP.PrecioUnitario ??
        articuloERP.Importe ??
        articuloERP.PrecioBase ??
        0;

    if (precio === 0) {
        // console.warn(`⚠️ [mapearArticuloERPaLocal] Artículo sin precio: ${articuloERP.Nombre || articuloId}`);
    }

    const codigo = articuloERP.Codigo ??
        articuloERP.CodigoArticulo ??
        articuloERP.ReferenciaBarras ??
        articuloERP.Referencia ??
        '';

    let categoria = 'Sin Categoría';
    if (articuloERP.Categoria) {
        categoria = articuloERP.Categoria;
    } else if (articuloERP.NombreCategoria) {
        categoria = articuloERP.NombreCategoria;
    } else if (articuloERP.ID_Categoria && articuloERP.ID_Categoria !== 0) {
        categoria = `Categoría ${articuloERP.ID_Categoria}`;
    }

    categoria = categoria.trim();
    if (categoria === '' || categoria === 'null' || categoria === 'undefined') {
        categoria = 'Sin Categoría';
    }

    return {
        id: articuloERP.Id?.toString() || articuloERP.ID_Articulo?.toString() || '',
        nombre: articuloERP.Nombre || 'Sin nombre',
        cantidad: stock,
        categoria: categoria,
        precio: precio > 0 ? `${precio.toFixed(2).replace('.', ',')} €` : '0,00 €',
        stockMinimo: stockMinimo,
        codigoCorto: codigo
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
