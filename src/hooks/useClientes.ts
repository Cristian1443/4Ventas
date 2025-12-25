import { useState } from 'react';
import { Cliente } from '../models';
import { storageService } from '../services/storage.service';
import { syncService } from '../services/sync.service';

export const useClientes = (erpEnabled: boolean) => {
    const [clientes, setClientes] = useState<Cliente[]>([]);

    const addCliente = async (cliente: Cliente) => {
        setClientes(prev => {
            const updated = [cliente, ...prev];
            storageService.setItem('clientes', updated);
            return updated;
        });
        if (erpEnabled) syncService.addToQueue('cliente', cliente);
    };

    return { clientes, setClientes, addCliente };
};
