export interface ClienteERP {
    Id: number;
    Tipo?: number;
    NIF: string;
    Nombre: string;
    RazonSocial: string;
    Provincia?: string;
    Localidad?: string;
    CPostal: string;
    Direccion: string;
    Telefono: string;
    Email: string;
    FormaPago?: number;
    DtoComercial?: number;
    DtoPPago?: number;
}

export interface ArticuloERP {
    Id: number;
    Codigo: string;
    Nombre: string;
    PVP: number;
    Stock?: number;
    StockMinimo?: number;
}

export interface MetodoPagoERP {
    Id: number;
    Nombre: string;
}

export interface GastoERP {
    Id: number;
    Concepto: string;
    Tipo: string;
    Importe: number;
    Fecha: string;
    Imagen?: string;
}

export interface DocumentoERP {
    Id: number;
    Nombre: string;
    Categoria: string;
    Fecha: string;
    Tamano: string;
    Tipo: string;
    Url?: string;
}

export interface CobroERP {
    Id: number;
    IdCliente: number;
    NombreCliente: string;
    Importe: number;
    Fecha: string;
    IdNotaVenta?: number;
    Estado: string;
}

export interface NotaAlmacenERP {
    Id: number;
    Tipo: string;
    Fecha: string;
    Usuario: string;
    NumArticulos: number;
    Observaciones: string;
}

export interface VisitaERP {
    Id: number;
    IdCliente?: number;
    NombreCliente: string;
    Direccion: string;
    Fecha: string;
    Tipo: string;
    Completado: boolean;
    Observaciones?: string;
}

export interface LineaDocumento {
    TipoRegistro: number;
    ID_Articulo: number;
    Precio: number;
    Dto: number;
    DtoPPago: number;
    DtoEurosXUd: number;
    DtoEuros: number;
    Uds: number;
    UdsRegalo: number;
    UdsAuxiliares: number;
    ImporteLinea: number;
    PorcentajeIVA: number;
    PorcentajeRE: number;
    Lote: string | null;
    Caducidad: string | null;
    ID_Partida: number;
    DescripcionAmplia: string | null;
    Comentario: string | null;
}

export interface PagoDocumento {
    ID_MetodoPago: number;
    Fecha: string;
    Importe: number;
}

export interface DocumentoCliente {
    Id: number;
    Tipo: number;
    Numero: number;
    Referencia: string;
    Fecha: string;
    ID_Cliente: number;
    PreciosImpIncluidos: boolean;
    BaseImponible: number;
    TotalImporte: number;
    Comentario: string;
    Contenido: LineaDocumento[];
    Pagos: PagoDocumento[];
}

export interface NuevoPago {
    ID_DocCli: number;
    ID_MetodoPago: number;
    Fecha: string;
    Importe: number;
}
