export interface Cliente {
    id: string;
    codigo?: string;
    nombre: string;
    nombreComercial?: string;
    empresa: string;
    direccion: string;
    localidad?: string;
    telefono?: string;
    email?: string;
    ultimaVisita?: string;
    nif?: string;
    codigoPostal?: string;
    provincia?: string;
    // Régimen fiscal del ERP (ID numérico Verial)
    // 1=IVA normal · 2=IVA+R.E. · 3=UE intracomunitario · 4=Exento nacional
    // 5=Exento extranjero · 6=Agricultura · 7=Canarias IGIC
    regimenFiscal?: number;
    // true cuando el cliente tributa Recargo de Equivalencia (regimenFiscal === 2)
    recargoEquivalencia?: boolean;
}
