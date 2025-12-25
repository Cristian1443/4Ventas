export interface Visita {
    id: string;
    clienteId?: string;
    clienteNombre: string;
    direccion: string;
    fecha: string;
    hora: string;
    tipo: 'visita' | 'entrega' | 'cobro';
    completado: boolean;
    observaciones?: string;
}
