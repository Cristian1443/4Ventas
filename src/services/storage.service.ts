/**
 * Servicio de Almacenamiento (AsyncStorage)
 * Reemplaza localStorage de la versión web
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  // Guardar item
  async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error saving data:', key, error);
    }
  }

  // Obtener item
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error reading data:', key, error);
      return null;
    }
  }

  // Eliminar item
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', key, error);
    }
  }

  // Limpiar todo
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // Obtener todas las claves
  async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting keys:', error);
      return [];
    }
  }

  // Obtener múltiples items
  async multiGet(keys: string[]): Promise<Record<string, any>> {
    try {
      const result = await AsyncStorage.multiGet(keys);
      const data: Record<string, any> = {};
      
      result.forEach(([key, value]) => {
        if (value) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        }
      });
      
      return data;
    } catch (error) {
      console.error('Error multiGet:', error);
      return {};
    }
  }

  // Guardar múltiples items
  async multiSet(items: Array<[string, any]>): Promise<void> {
    try {
      const pairs = items.map(([key, value]) => [key, JSON.stringify(value)]);
      await AsyncStorage.multiSet(pairs as [string, string][]);
    } catch (error) {
      console.error('Error multiSet:', error);
    }
  }
}

export const storageService = new StorageService();
