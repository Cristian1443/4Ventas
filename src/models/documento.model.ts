export interface Documento {
    id: string;
    nombre: string;
    categoria: string;
    fecha: string;
    tamano: string;
    tipo: 'pdf' | 'image' | 'doc';
    esCatalogo?: boolean;
    url?: string;
}
