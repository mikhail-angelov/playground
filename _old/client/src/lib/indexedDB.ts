import { pickBy } from "lodash";

export const STORE_ID = "DvlCI&xf*:XG";
class IndexedDB {
  dbName: string;
  storeName: string;
  db: any;
  constructor(dbName: string, storeName: string) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
  }

  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        console.log("IndexedDB upgrade needed");
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        console.log(
          "IndexedDB initialized successfully",
          this.db.objectStoreNames
        );
        resolve(this.db);
      };

      request.onerror = (event: any) => {
        console.error(
          "IndexedDB error during initialization:",
          event.target.errorCode
        );
        reject(event.target.errorCode);
      };
    });
  }

  saveState(state: Record<string, any>): Promise<void> {
    const cleanState = pickBy(
      state,
      (value: any) => typeof value === "string" || typeof value === "object"
    );
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(cleanState);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event: any) => {
        console.error(
          `Error saving object with id ${cleanState.id}:`,
          event.target.errorCode
        );
        reject(event.target.errorCode);
      };
    });
  }

  async loadState(): Promise<Record<string, any> | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(STORE_ID);

      request.onsuccess = (event: any) => {
        console.log("Loaded object:", event.target.result);
        const result = event.target.result;
        if (!result) {
          resolve(null); // Resolve with null if no data is found
        } else {
          resolve(result); // Resolve with the retrieved object
        }
      };

      request.onerror = (event: any) => {
        console.error(
          "Error loading object from IndexedDB:",
          event.target.errorCode
        );
        reject(event.target.errorCode);
      };
    });
  }

  deleteAll(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event: any) => {
        console.error("Error deleting all objects:", event.target.errorCode);
        reject(event.target.errorCode);
      };
    });
  }
}

export default IndexedDB;
