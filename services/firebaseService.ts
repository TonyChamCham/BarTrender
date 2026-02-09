
// @ts-ignore
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, increment, runTransaction, getDocs, collection, deleteDoc, query, where, limit, writeBatch } from "firebase/firestore";
// @ts-ignore
import { getStorage, ref, uploadString, getDownloadURL, uploadBytes } from "firebase/storage";
// @ts-ignore
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { CocktailFullDetails, PromoCode, CocktailSummary } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyAkqHmKhd2uP8cJSkQ17z3JIX-yU_V2ras",
  authDomain: "mixmaster-ai-2fe73.firebaseapp.com",
  projectId: "mixmaster-ai-2fe73",
  storageBucket: "mixmaster-ai-2fe73.firebasestorage.app",
  messagingSenderId: "164541830348",
  appId: "1:164541830348:web:033f9e0fe86fd712dd9e69"
};

// Singleton instances
let db: any = null;
let storage: any = null;
let auth: any = null;
let isAuthenticated = false;

// Safe Initialization
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    
    // Auth Listener
    onAuthStateChanged(auth, (user: any) => {
        if (user) {
            isAuthenticated = true;
            console.log("👻 Auth Active:", user.uid);
        } else {
            // Auto sign-in if connection drops or first load
            signInAnonymously(auth).catch((e: any) => console.warn("Auto-sign-in failed", e));
        }
    });
    
    // Trigger initial sign-in
    signInAnonymously(auth).catch((e: any) => console.log("Auth silent check:", e.message));

    console.log("🚀 Firebase Initialized Successfully");
} catch (error: any) {
    console.error("❌ Firebase Initialization Error:", error.message);
}

// Helper: Timeout wrapper for database calls to prevent infinite hanging
const withTimeout = <T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms))
    ]);
};

export const FirebaseService = {
  
  // Generic File Fetch (Icons, etc)
  async getFileUrl(path: string): Promise<string | null> {
      if (!storage) return null;
      try {
          const r = ref(storage, path);
          return await getDownloadURL(r);
      } catch (e) {
          return null; // Return null if file doesn't exist to trigger fallback
      }
  },

  async saveImage(cacheKey: string, base64Data: string): Promise<void> {
    if (!storage) return; 
    try {
        const imageRef = ref(storage, `images/${cacheKey}`);
        await uploadString(imageRef, base64Data, 'data_url');
    } catch (e) {
        // Silent fail for images
    }
  },

  async getImage(cacheKey: string): Promise<string | null> {
    if (!storage) return null;
    
    // Helper pour essayer de fetch une URL
    const tryFetch = async (path: string) => {
        try {
            const r = ref(storage, path);
            return await getDownloadURL(r);
        } catch (e) {
            return null;
        }
    };

    const rootPath = `images/${cacheKey}`;

    // 1. Essayer le chemin exact (pour les images générées par l'IA)
    let url = await tryFetch(rootPath);
    if (url) return url;

    // 2. Essayer avec extension .jpg (pour tes uploads manuels)
    url = await tryFetch(`${rootPath}.jpg`);
    if (url) {
        console.log(`📸 Found JPG for ${cacheKey}`);
        return url;
    }

    // 3. Essayer avec extension .png (au cas où)
    url = await tryFetch(`${rootPath}.png`);
    if (url) {
        console.log(`📸 Found PNG for ${cacheKey}`);
        return url;
    }

    return null;
  },

  async saveVideo(personaKey: string, videoBlob: Blob): Promise<string | null> {
    if (!storage || !isAuthenticated) return null;
    try {
        const videoRef = ref(storage, `videos/bartender/${personaKey}.mp4`);
        const snapshot = await uploadBytes(videoRef, videoBlob);
        return await getDownloadURL(snapshot.ref);
    } catch (e) {
        return null;
    }
  },

  async getVideo(path: string): Promise<string | null> {
    if (!storage) return null;
    try {
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        const videoRef = ref(storage, cleanPath);
        return await getDownloadURL(videoRef);
    } catch (e) {
        return null;
    }
  },

  async saveCocktail(cocktail: CocktailFullDetails | CocktailSummary, customId?: string): Promise<void> {
    if (!db) return;
    try {
      const idToUse = customId || cocktail.name;
      const docRef = doc(db, "cocktails", idToUse);
      await setDoc(docRef, cocktail, { merge: true });
    } catch (e) {
        // Silent fail on save
    }
  },

  // NEW: Save multiple cocktails efficiently (Summary only)
  async batchSaveCocktails(cocktails: CocktailSummary[]): Promise<void> {
    if (!db || cocktails.length === 0) return;
    try {
        const batch = writeBatch(db);
        cocktails.forEach(c => {
            // We use the name as ID (sanitized if possible, but raw name is ok for this map)
            // Ideally sanitizeKey should be imported, but we'll assume caller handles ID or we use name
            // For safety, let's use the name as document ID directly
            const docRef = doc(db, "cocktails", c.name);
            batch.set(docRef, c, { merge: true });
        });
        await batch.commit();
        console.log(`💾 Batch saved ${cocktails.length} cocktails.`);
    } catch (e) {
        console.warn("Batch save failed", e);
    }
  },

  async getCocktail(name: string): Promise<CocktailFullDetails | null> {
    if (!db) return null;
    try {
        const docRef = doc(db, "cocktails", name);
        // Timeout de 2s pour éviter de bloquer l'UI si Firebase est lent
        const docSnap = await withTimeout(getDoc(docRef), 2000, null as any);
        return (docSnap && docSnap.exists()) ? (docSnap.data() as CocktailFullDetails) : null;
    } catch (e) {
        return null;
    }
  },

  // NEW: Retrieve cocktails by Special Label (Season/Event) to verify quota
  async getCocktailsBySpecialLabel(label: string, limitCount: number = 20): Promise<CocktailSummary[]> {
      if (!db) return [];
      try {
          const q = query(
              collection(db, "cocktails"), 
              where("specialLabel", "==", label),
              limit(limitCount)
          );
          const snap = await getDocs(q);
          const list: CocktailSummary[] = [];
          snap.forEach(doc => {
              // Only pull necessary summary data
              const data = doc.data();
              list.push({
                  name: data.name,
                  description: data.description || "",
                  tags: data.tags || [],
                  isPremium: data.isPremium || false,
                  likes: data.likes || 0,
                  specialLabel: data.specialLabel
              });
          });
          return list;
      } catch (e) {
          console.warn("Failed to get seasonal by label", e);
          return [];
      }
  },

  // NEW: Search Global in Firestore
  async searchGlobal(queryText: string): Promise<CocktailSummary[]> {
      if (!db) return [];
      
      const resultsMap = new Map<string, CocktailSummary>();
      const term = queryText.trim();
      if (term.length < 2) return [];

      // Capitalize for Tag Search (assuming tags are "Vodka", "Gin", etc.)
      const termCap = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
      const termLower = term.toLowerCase(); // For name search if stored lowercase, but names are usually Title Case

      try {
          // 1. Search by Name Prefix (Case sensitive in Firestore, usually names are Title Case)
          // To make it robust, we try exact term capitalization provided by user + Title Case version
          const nameQuery = query(
              collection(db, "cocktails"), 
              where("name", ">=", termCap), 
              where("name", "<=", termCap + '\uf8ff'), 
              limit(10)
          );

          // 2. Search by Tags (Array Contains)
          const tagQuery = query(
              collection(db, "cocktails"),
              where("tags", "array-contains", termCap),
              limit(20)
          );
          
          const [nameSnap, tagSnap] = await Promise.all([
              getDocs(nameQuery),
              getDocs(tagQuery)
          ]);

          const processDoc = (doc: any) => {
              const data = doc.data() as CocktailSummary;
              if (data.name && !resultsMap.has(data.name)) {
                  resultsMap.set(data.name, {
                      name: data.name,
                      description: data.description || "",
                      tags: data.tags || [],
                      isPremium: data.isPremium,
                      likes: data.likes,
                      specialLabel: data.specialLabel
                  });
              }
          };

          nameSnap.forEach(processDoc);
          tagSnap.forEach(processDoc);

          return Array.from(resultsMap.values());

      } catch (e) {
          console.warn("Global search failed", e);
          return [];
      }
  },

  async syncLike(cocktailName: string, isAdding: boolean): Promise<void> {
      if (!db) return;
      try {
          const docRef = doc(db, "cocktails", cocktailName);
          await updateDoc(docRef, { likes: increment(isAdding ? 1 : -1) });
      } catch (e) {}
  },

  async redeemPromoCode(code: string, deviceId: string): Promise<PromoCode> {
      if (!db) throw "Database unavailable.";
      try {
          return await runTransaction(db, async (transaction: any) => {
              const codeRef = doc(db, "promo_codes", code.toUpperCase());
              const sfDoc = await transaction.get(codeRef);
              
              if (!sfDoc.exists()) throw "Invalid Code";
              const data = sfDoc.data() as PromoCode;

              if (data.currentUses >= data.maxUses) throw "Code fully redeemed";
              if (data.expiryDate && Date.now() > data.expiryDate) throw "Code expired";
              if (data.claimedBy && data.claimedBy.includes(deviceId)) throw "Code already used";

              transaction.update(codeRef, {
                  currentUses: increment(1),
                  claimedBy: arrayUnion(deviceId)
              });

              return data;
          });
      } catch (e) {
          throw e;
      }
  },

  async runDatabaseCleanup(): Promise<string> {
      if (!db) return "No connection";
      try {
          const querySnapshot = await getDocs(collection(db, "cocktails"));
          let count = 0;
          for (const docSnap of querySnapshot.docs) {
              const id = docSnap.id;
              // Clean weird recursive IDs
              if (id.endsWith('_shot_shot') || id.endsWith('_virgin_virgin')) {
                  await deleteDoc(doc(db, "cocktails", id));
                  count++;
              }
          }
          return `Cleanup: ${count} deleted.`;
      } catch (e: any) {
          return "Error: " + e.message;
      }
  }
};
