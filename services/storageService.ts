import { CocktailFullDetails, CocktailSummary } from "../types";

const DB_NAME = 'MixMasterDB';
const DB_VERSION = 1;
const STORE_IMAGES = 'images';
const STORE_COCKTAILS = 'cocktails';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES);
      }
      if (!db.objectStoreNames.contains(STORE_COCKTAILS)) {
        db.createObjectStore(STORE_COCKTAILS, { keyPath: 'name' });
      }
    };
  });
};

export const CacheService = {
  async saveImage(key: string, base64Data: string): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_IMAGES, 'readwrite');
      tx.objectStore(STORE_IMAGES).put(base64Data, key);
    } catch (e) {
      console.warn('Failed to cache image', e);
    }
  },

  async getImage(key: string): Promise<string | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_IMAGES, 'readonly');
        const request = tx.objectStore(STORE_IMAGES).get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  },

  async saveCocktail(cocktail: CocktailFullDetails): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_COCKTAILS, 'readwrite');
      tx.objectStore(STORE_COCKTAILS).put(cocktail);
    } catch (e) {
      console.warn('Failed to cache cocktail', e);
    }
  },

  async getCocktail(name: string): Promise<CocktailFullDetails | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_COCKTAILS, 'readonly');
        const request = tx.objectStore(STORE_COCKTAILS).get(name);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }
};