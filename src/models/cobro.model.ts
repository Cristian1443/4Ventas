export interface Cobro {
    id: string;
    cliente: string;
    monto: string;
    fecha: string;
    estado: 'pendiente' | 'pagado';
    notaVentaId?: string;
    clienteId?: string;
    formaPago?: string;
    vendedorId?: string; // ID del vendedor que registró el cobro
}
