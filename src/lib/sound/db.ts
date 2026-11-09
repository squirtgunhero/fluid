/**
 * A small IndexedDB layer for the sound library: track metadata in one
 * store, downloaded audio in another, so songs survive relaunches and play
 * offline.
 */

export type TrackSource = "suno" | "file";

export type Track = {
  id: string;
  title: string;
  artist?: string;
  source: TrackSource;
  /** Audio bytes are stored locally under this track's id. */
  stored: boolean;
  /** Remote audio to stream when nothing is stored. */
  url?: string;
  cover?: string;
  page?: string;
  /** Seconds, 0 when unknown. */
  duration: number;
  addedAt: number;
};

const DB_NAME = "fluid";
const DB_VERSION = 1;
const TRACKS = "tracks";
const BLOBS = "blobs";

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TRACKS)) db.createObjectStore(TRACKS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = op(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const listTracks = () =>
  run<Track[]>(TRACKS, "readonly", (s) => s.getAll()).then((t) =>
    t.sort((a, b) => a.addedAt - b.addedAt),
  );
export const putTrack = (track: Track) => run(TRACKS, "readwrite", (s) => s.put(track));
export const deleteTrack = (id: string) => run(TRACKS, "readwrite", (s) => s.delete(id));
export const putBlob = (id: string, blob: Blob) => run(BLOBS, "readwrite", (s) => s.put(blob, id));
export const getBlob = (id: string) => run<Blob | undefined>(BLOBS, "readonly", (s) => s.get(id));
export const deleteBlob = (id: string) => run(BLOBS, "readwrite", (s) => s.delete(id));

/** Duration of an audio blob, in seconds; 0 if it cannot be decoded. */
export function probeDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    const done = (d: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : 0);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(0);
    audio.src = url;
  });
}
