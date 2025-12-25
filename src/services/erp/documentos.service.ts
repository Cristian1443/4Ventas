import { erpClient, getCommonParams, erpConfig } from './api.client';
import { DocumentoERP } from '../../dtos/erp.dtos';

export const documentosService = {
    async getDocumentos(): Promise<DocumentoERP[]> {
        console.log('ℹ️ GetDocumentosWS no disponible. Local mode only.');
        return [];
    },

    async subirDocumento(doc: Partial<DocumentoERP>): Promise<any> {
        const body = {
            sesionwcf: parseInt(erpConfig.getSessionId(), 10),
            Documento: doc
        };
        const response = await erpClient.post('/SubirDocumentoWS', body);
        return response.data;
    },

    async eliminarDocumento(id: number): Promise<boolean> {
        try {
            const response = await erpClient.get(`/BorrarDocumentoWS?${getCommonParams()}&id_doc=${id}`);
            return response.data && (!response.data.InfoError || response.data.InfoError.Codigo === 0);
        } catch { return false; }
    }
};
