import { Platform } from 'react-native';

/** Browser-only bytes for a saved demo observation. Never uploaded and never analyzed. */
export type DemoMediaKind = 'PHOTO' | 'AUDIO' | 'VIDEO';

export type StoredDemoMedia = {
  observationId: string;
  petId: string;
  kind: DemoMediaKind;
  mimeType: string;
  bytes: Uint8Array;
};

export type DemoMediaStore = {
  put(record: StoredDemoMedia): Promise<void>;
  get(observationId: string): Promise<StoredDemoMedia | null>;
  deleteObservation(observationId: string): Promise<void>;
  deletePet(petId: string): Promise<void>;
};

export const WEB_MEDIA_SCHEME = 'web-media:';

type LocalMediaObservation = {
  id: string;
  localPhotoUri?: string;
  localAudioUri?: string;
  localVideoUri?: string;
  localMediaVolatile?: boolean;
};

const MEDIA_FIELDS = ['localPhotoUri', 'localAudioUri', 'localVideoUri'] as const;
const FIELD_KIND: Record<(typeof MEDIA_FIELDS)[number], DemoMediaKind> = {
  localPhotoUri: 'PHOTO',
  localAudioUri: 'AUDIO',
  localVideoUri: 'VIDEO',
};

function copyBytes(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function copyRecord(record: StoredDemoMedia): StoredDemoMedia {
  return { ...record, bytes: copyBytes(record.bytes) };
}

/** In-memory stand-in for IndexedDB. A new handle over the same map is a reload. */
export function createMemoryMediaStore(backing = new Map<string, StoredDemoMedia>()): DemoMediaStore {
  return {
    async put(record) { backing.set(record.observationId, copyRecord(record)); },
    async get(observationId) {
      const found = backing.get(observationId);
      return found ? copyRecord(found) : null;
    },
    async deleteObservation(observationId) { backing.delete(observationId); },
    async deletePet(petId) {
      for (const [id, record] of backing) if (record.petId === petId) backing.delete(id);
    },
  };
}

export function webMediaUri(observationId: string) {
  return `${WEB_MEDIA_SCHEME}${observationId}`;
}

export async function saveDemoMedia(store: DemoMediaStore, record: StoredDemoMedia) {
  if (!record.observationId || !record.petId || record.bytes.byteLength === 0) throw new Error('MEDIA_UNREADABLE');
  await store.put(copyRecord(record));
}

export async function readDemoMedia(store: DemoMediaStore, observationId: string) {
  const found = await store.get(observationId);
  return found ? copyRecord(found) : null;
}

function fallbackMime(kind: DemoMediaKind) {
  if (kind === 'PHOTO') return 'image/jpeg';
  if (kind === 'AUDIO') return 'audio/webm';
  return 'video/mp4';
}

/** Reads a data URL or a still-alive blob URL. Does not contact the app server. */
export async function readMediaBytes(uri: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  if (uri.startsWith('data:')) {
    const comma = uri.indexOf(',');
    if (comma < 0) throw new Error('MEDIA_UNREADABLE');
    const header = uri.slice(5, comma);
    const mimeType = header.split(';')[0] || 'application/octet-stream';
    const payload = uri.slice(comma + 1);
    if (/;base64/i.test(header)) {
      const binary = globalThis.atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      if (bytes.byteLength === 0) throw new Error('MEDIA_UNREADABLE');
      return { bytes, mimeType };
    }
    const bytes = new TextEncoder().encode(decodeURIComponent(payload));
    if (bytes.byteLength === 0) throw new Error('MEDIA_UNREADABLE');
    return { bytes, mimeType };
  }
  const response = await fetch(uri);
  if (!response.ok) throw new Error('MEDIA_UNREADABLE');
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error('MEDIA_UNREADABLE');
  return { bytes, mimeType: blob.type || 'application/octet-stream' };
}

const DB_NAME = 'mew-voice-demo-media';
const DB_STORE = 'observations';
let database: Promise<IDBDatabase> | null = null;

function openMediaDb() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('MEDIA_STORE_UNAVAILABLE'));
  if (!database) {
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          const store = db.createObjectStore(DB_STORE, { keyPath: 'observationId' });
          store.createIndex('petId', 'petId', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { database = null; reject(request.error ?? new Error('MEDIA_STORE_FAILED')); };
    });
  }
  return database;
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('MEDIA_STORE_FAILED'));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('MEDIA_STORE_FAILED'));
    transaction.onabort = () => reject(transaction.error ?? new Error('MEDIA_STORE_FAILED'));
  });
}

type MediaRow = { observationId: string; petId: string; kind: DemoMediaKind; mimeType: string; bytes: ArrayBuffer | Uint8Array };

function asBytes(value: ArrayBuffer | Uint8Array) {
  return value instanceof Uint8Array ? copyBytes(value) : copyBytes(new Uint8Array(value));
}

export function createIndexedDbMediaStore(): DemoMediaStore {
  return {
    async put(record) {
      const db = await openMediaDb();
      const transaction = db.transaction(DB_STORE, 'readwrite');
      transaction.objectStore(DB_STORE).put({ ...record, bytes: copyBytes(record.bytes).buffer });
      await transactionDone(transaction);
    },
    async get(observationId) {
      const db = await openMediaDb();
      const transaction = db.transaction(DB_STORE, 'readonly');
      const row = await requestResult<MediaRow | undefined>(transaction.objectStore(DB_STORE).get(observationId));
      await transactionDone(transaction);
      if (!row?.bytes || !row.observationId) return null;
      return { observationId: row.observationId, petId: row.petId, kind: row.kind, mimeType: row.mimeType, bytes: asBytes(row.bytes) };
    },
    async deleteObservation(observationId) {
      const db = await openMediaDb();
      const transaction = db.transaction(DB_STORE, 'readwrite');
      transaction.objectStore(DB_STORE).delete(observationId);
      await transactionDone(transaction);
    },
    async deletePet(petId) {
      const db = await openMediaDb();
      const transaction = db.transaction(DB_STORE, 'readwrite');
      const cursorRequest = transaction.objectStore(DB_STORE).index('petId').openCursor(IDBKeyRange.only(petId));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      await transactionDone(transaction);
    },
  };
}

let browserStore: DemoMediaStore | null = null;
function browserDemoMediaStore() {
  if (!browserStore) browserStore = createIndexedDbMediaStore();
  return browserStore;
}

const objectUrls = new Map<string, string>();
const createdObjectUrls = new Set<string>();

export function objectUrlForRecord(record: StoredDemoMedia) {
  const cached = objectUrls.get(record.observationId);
  if (cached) return cached;
  const url = URL.createObjectURL(new Blob([copyBytes(record.bytes)], { type: record.mimeType || 'application/octet-stream' }));
  objectUrls.set(record.observationId, url);
  createdObjectUrls.add(url);
  return url;
}

export function revokeDemoMediaUrls(observationIds: readonly string[]) {
  for (const id of observationIds) {
    const url = objectUrls.get(id);
    if (!url) continue;
    URL.revokeObjectURL(url);
    objectUrls.delete(id);
    createdObjectUrls.delete(url);
  }
}

function stripStoredMediaUri<T extends LocalMediaObservation>(item: T): T {
  const next = { ...item };
  for (const field of MEDIA_FIELDS) if (next[field]?.startsWith(WEB_MEDIA_SCHEME)) delete next[field];
  return next;
}

/** Swaps durable ids for object URLs. A missing record drops the uri so the screen can say the file is gone. */
export async function restoreDemoMediaUris<T extends LocalMediaObservation>(
  items: readonly T[],
  store: DemoMediaStore,
  createObjectUrl: (record: StoredDemoMedia) => string,
): Promise<T[]> {
  const restored: T[] = [];
  for (const item of items) {
    const next = { ...item };
    for (const field of MEDIA_FIELDS) {
      const uri = next[field];
      if (!uri?.startsWith(WEB_MEDIA_SCHEME)) continue;
      const id = uri.slice(WEB_MEDIA_SCHEME.length);
      if (!id || id !== item.id) { delete next[field]; continue; }
      const record = await readDemoMedia(store, id);
      if (!record || record.kind !== FIELD_KIND[field] || record.bytes.byteLength === 0) { delete next[field]; continue; }
      next[field] = createObjectUrl(record);
    }
    restored.push(next);
  }
  return restored;
}

async function blobUriAlive(uri: string) {
  try {
    const response = await fetch(uri);
    return response.ok;
  } catch {
    return false;
  }
}

/** Resolves saved web media and clears blob URLs that did not survive refresh. */
export async function playableDemoObservations<T extends LocalMediaObservation>(items: readonly T[]): Promise<T[]> {
  if (Platform.OS !== 'web') return items.map(item => ({ ...item }));
  let restored: T[];
  try {
    restored = await restoreDemoMediaUris(items, browserDemoMediaStore(), objectUrlForRecord);
  } catch {
    restored = items.map(stripStoredMediaUri);
  }
  const ready: T[] = [];
  for (const item of restored) {
    const next = { ...item };
    let volatile = false;
    for (const field of MEDIA_FIELDS) {
      const uri = next[field];
      if (!uri?.startsWith('blob:') || createdObjectUrls.has(uri)) continue;
      if (await blobUriAlive(uri)) volatile = true;
      else delete next[field];
    }
    if (volatile) next.localMediaVolatile = true;
    ready.push(next);
  }
  return ready;
}

export async function durableDemoMediaUri(input: { uri: string; kind: DemoMediaKind; petId: string; observationId: string; mimeType?: string }) {
  if (Platform.OS !== 'web' || input.uri.startsWith(WEB_MEDIA_SCHEME)) return { uri: input.uri, mimeType: input.mimeType, byteSize: undefined as number | undefined };
  try {
    const read = await readMediaBytes(input.uri);
    const sniffed = read.mimeType && read.mimeType !== 'application/octet-stream' ? read.mimeType : '';
    const mimeType = input.mimeType || sniffed || fallbackMime(input.kind);
    await saveDemoMedia(browserDemoMediaStore(), { observationId: input.observationId, petId: input.petId, kind: input.kind, mimeType, bytes: read.bytes });
    return { uri: webMediaUri(input.observationId), mimeType, byteSize: read.bytes.byteLength };
  } catch {
    return { uri: input.uri, mimeType: input.mimeType, byteSize: undefined as number | undefined };
  }
}

/** Points saved bytes at another existing cat. The bytes and observation id stay. Missing media is already absent. */
export async function moveStoredDemoMediaPet(store: DemoMediaStore, observationId: string, petId: string) {
  const targetId = petId.trim();
  if (!observationId || !targetId) return null;
  const record = await store.get(observationId);
  if (!record) return null;
  if (record.petId === targetId) return record;
  const next = { ...record, petId: targetId };
  await store.put(next);
  return next;
}

export async function reassignObservationDemoMedia(observationId: string, petId: string) {
  if (Platform.OS !== 'web' || !observationId || !petId.trim()) return;
  try { await moveStoredDemoMediaPet(browserDemoMediaStore(), observationId, petId); } catch { /* the observation row already names the cat */ }
}

export async function forgetObservationDemoMedia(observationId: string) {
  if (Platform.OS !== 'web' || !observationId) return;
  revokeDemoMediaUrls([observationId]);
  try { await browserDemoMediaStore().deleteObservation(observationId); } catch { /* the observation row is already gone */ }
}

export async function forgetPetDemoMedia(petId: string, observationIds: readonly string[]) {
  if (Platform.OS !== 'web') return;
  revokeDemoMediaUrls(observationIds);
  try { await browserDemoMediaStore().deletePet(petId); } catch { /* the observation rows are already gone */ }
}
