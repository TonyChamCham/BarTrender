
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, increment, runTransaction, getDocs, collection, deleteDoc } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL, uploadBytes } from "firebase/storage";
import { CocktailFullDetails, PromoCode } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyAkqHmKhd2uP8cJSkQ17z3JIX-yU_V2ras",
  authDomain: "mixmaster-ai-2fe73.firebaseapp.com",
  projectId: "mixmaster-ai-2fe73",
  storageBucket: "mixmaster-ai-2fe73.firebasestorage.app",
  messagingSenderId: "164541830348",
  appId: "1:164541830348:web:033f9e0fe86fd712dd9e69"
};

let db: any;
let storage: any;

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("🚀 Firebase Initialized for Project:", firebaseConfig.projectId);
} catch (error) {
    console.error("❌ Firebase Initialization Failed:", error);
}

const withTimeout = <T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => {
            console.warn(`Firebase operation timed out after ${ms}ms`);
            resolve(fallbackValue);
        }, ms))
    ]);
};

export const FirebaseService = {
  
  async saveImage(cacheKey: string, base64Data: string): Promise<void> {
    if (!storage) return;
    try {
        const imageRef = ref(storage, `images/${cacheKey}`);
        await uploadString(imageRef, base64Data, 'data_url');
        console.debug("📸 Image saved to Cloud Storage:", cacheKey);
    } catch (e) {
        console.warn("❌ Firebase saveImage failed:", e);
    }
  },

  async getImage(cacheKey: string): Promise<string | null> {
    if (!storage) return null;
    try {
        const imageRef = ref(storage, `images/${cacheKey}`);
        return await withTimeout(getDownloadURL(imageRef), 5000, null);
    } catch (e) {
        return null;
    }
  },

  async saveVideo(personaKey: string, videoBlob: Blob): Promise<string | null> {
    if (!storage) return null;
    try {
        const videoRef = ref(storage, `videos/bartender/${personaKey}.mp4`);
        const snapshot = await uploadBytes(videoRef, videoBlob);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        console.debug("🎥 Video saved to Cloud Storage:", personaKey);
        return downloadUrl;
    } catch (e) {
        console.error("❌ Firebase saveVideo failed:", e);
        return null;
    }
  },

  async getVideo(path: string): Promise<string | null> {
    if (!storage) return null;
    try {
        // Remove leading slash if present to avoid issues
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        const videoRef = ref(storage, cleanPath);
        const url = await getDownloadURL(videoRef);
        console.log("🎥 Found video in Firebase:", cleanPath);
        return url;
    } catch (e) {
        // Silent fail (video doesn't exist)
        return null;
    }
  },

  async saveCocktail(cocktail: CocktailFullDetails, customId?: string): Promise<void> {
    if (!db) { console.error("❌ Firestore DB not initialized"); return; }
    try {
      const idToUse = customId || cocktail.name;
      const docRef = doc(db, "cocktails", idToUse);
      await setDoc(docRef, cocktail, { merge: true }); // Merge pour préserver les likes existants si possible
      console.log("✅ SUCCESS: Cocktail recorded in Firestore:", idToUse);
    } catch (e: any) {
        console.error("❌ Firestore SAVE FAILED. Check your Security Rules!", e);
    }
  },

  async getCocktail(name: string): Promise<CocktailFullDetails | null> {
    if (!db) return null;
    try {
        const docRef = doc(db, "cocktails", name);
        const docSnap = await withTimeout(getDoc(docRef), 5000, null as any);
        return (docSnap && docSnap.exists()) ? (docSnap.data() as CocktailFullDetails) : null;
    } catch (e) {
        console.warn("Firebase getCocktail failed", e);
        return null;
    }
  },

  async syncLike(cocktailName: string, isAdding: boolean): Promise<void> {
      if (!db) return;
      try {
          const docRef = doc(db, "cocktails", cocktailName);
          await updateDoc(docRef, {
              likes: increment(isAdding ? 1 : -1)
          });
      } catch (e) {
          // Si le doc n'existe pas encore dans Firestore, on ignore silencieusement
      }
  },

  async redeemPromoCode(code: string, deviceId: string): Promise<PromoCode> {
      if (!db) throw "Database unavailable. Check connection.";
      try {
          return await withTimeout(runTransaction(db, async (transaction: any) => {
              const codeRef = doc(db, "promo_codes", code.toUpperCase());
              const sfDoc = await transaction.get(codeRef);
              
              if (!sfDoc.exists()) throw "Invalid Code";
              const data = sfDoc.data() as PromoCode;

              if (data.currentUses >= data.maxUses) throw "Code fully redeemed";
              if (data.expiryDate && Date.now() > data.expiryDate) throw "Code expired";
              if (data.claimedBy && data.claimedBy.includes(deviceId)) throw "You already used this code";

              transaction.update(codeRef, {
                  currentUses: increment(1),
                  claimedBy: arrayUnion(deviceId)
              });

              return data;
          }), 15000, null as any).then(res => {
              if (!res) throw "Request timed out. Please try again.";
              return res;
          });
      } catch (e) {
          throw e;
      }
  },

  /**
   * LA MOULINETTE: Nettoie la DB des doublons et convertit les unités
   */
  async runDatabaseCleanup(): Promise<string> {
      if (!db) {
          console.error("❌ DB Object is missing in runDatabaseCleanup");
          return "No DB Connection";
      }
      console.log("🧹 STARTING DB CLEANUP...");
      let deletedCount = 0;
      let updatedCount = 0;
      let logs = "";

      try {
          const querySnapshot = await getDocs(collection(db, "cocktails"));
          console.log(`Scanning ${querySnapshot.size} documents...`);
          
          for (const docSnap of querySnapshot.docs) {
              const id = docSnap.id;
              const data = docSnap.data() as CocktailFullDetails;
              
              // 1. DELETE DUPLICATES (recursive suffixes)
              if (id.endsWith('_shot_shot') || id.endsWith('_shot_shot_shot') || id.endsWith('_virgin_virgin')) {
                  console.warn(`Deleting recursive duplicate: ${id}`);
                  await deleteDoc(doc(db, "cocktails", id));
                  deletedCount++;
                  logs += `Deleted: ${id}\n`;
                  continue; // Skip update check if deleted
              }

              // 2. CONVERT UNITS (ml/cl -> oz)
              let needsUpdate = false;
              const newIngredients = data.ingredients.map(ing => {
                  const amountLower = ing.amount.toLowerCase();
                  // Regex pour détecter "30ml", "30 ml", "4 cl", etc.
                  const match = amountLower.match(/([\d.,]+)\s*(ml|cl)/);
                  
                  if (match) {
                      let val = parseFloat(match[1].replace(',', '.'));
                      const unit = match[2];
                      
                      // Conversion en Oz (1 oz approx 30ml, 1 cl = 10ml)
                      if (unit === 'cl') val = val * 10; // to ml
                      
                      let ozVal = val / 30;
                      // Round logic: 
                      // if close to 0.5, 0.25, 0.75, 0.33, 1, 1.5, 2...
                      // Simple rounding for now: 2 decimals max, strip trailing zeros
                      const finalOz = parseFloat(ozVal.toFixed(2));
                      
                      needsUpdate = true;
                      logs += `Converted ${id}: ${ing.amount} -> ${finalOz} oz\n`;
                      return { ...ing, amount: `${finalOz} oz` };
                  }
                  return ing;
              });

              if (needsUpdate) {
                  await updateDoc(doc(db, "cocktails", id), { ingredients: newIngredients });
                  updatedCount++;
              }
          }
          
          const result = `Cleanup Complete. Deleted: ${deletedCount}, Updated Units: ${updatedCount}.`;
          console.log(result);
          console.log(logs);
          return result + "\n" + logs;
      } catch (e: any) {
          console.error("Cleanup Failed in Try Block", e);
          return "Error: " + e.message;
      }
  }
};
