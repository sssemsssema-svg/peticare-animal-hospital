/**
 * PetiCare Animal Hospital - IndexedDB Media & Image Storage
 * Offloads large photos/lab images from localStorage (5MB limit) into IndexedDB
 * Assets / JS / image_storage.js
 */
(function (global) {
    'use strict';

    const DB_NAME = 'PetiCareMediaDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'images';

    let dbInstance = null;

    function getDB() {
        return new Promise((resolve, reject) => {
            if (dbInstance) return resolve(dbInstance);

            const req = (global.indexedDB || (global.window && global.window.indexedDB)).open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = function (e) {
                dbInstance = e.target.result;
                resolve(dbInstance);
            };
            req.onerror = function (e) {
                console.warn('IndexedDB Open Error:', e);
                reject(e);
            };
        });
    }

    /**
     * Save an image to IndexedDB. Returns 'idb:' pointer key.
     */
    async function saveImage(key, dataUrlOrBlob) {
        if (!key || !dataUrlOrBlob) return dataUrlOrBlob;
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.put(dataUrlOrBlob, key);
                req.onsuccess = () => resolve(`idb:${key}`);
                req.onerror = (e) => reject(e);
            });
        } catch (err) {
            console.warn('saveImage IDB error, fallback to raw data:', err);
            return dataUrlOrBlob;
        }
    }

    /**
     * Retrieve an image from IndexedDB.
     */
    async function getImage(key) {
        if (!key) return null;
        const cleanKey = key.startsWith('idb:') ? key.slice(4) : key;
        try {
            const db = await getDB();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(cleanKey);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch (err) {
            console.warn('getImage IDB error:', err);
            return null;
        }
    }

    /**
     * Resolve image source: if it's an idb: pointer, load from IndexedDB; otherwise return raw string.
     */
    async function resolveImage(imgVal) {
        if (!imgVal || typeof imgVal !== 'string') return imgVal;
        if (imgVal.startsWith('idb:')) {
            const loaded = await getImage(imgVal);
            return loaded || imgVal;
        }
        return imgVal;
    }

    /**
     * Canvas Image Compression to avoid huge files before storing
     */
    function compressImage(fileOrDataUrl, maxWidth = 1280, maxHeight = 1280, quality = 0.7) {
        return new Promise((resolve, reject) => {
            if (typeof document === 'undefined' || typeof Image === 'undefined') {
                return resolve(fileOrDataUrl);
            }

            const img = new Image();
            img.onload = function () {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressed = canvas.toDataURL('image/jpeg', quality);
                resolve(compressed);
            };
            img.onerror = function (e) {
                resolve(fileOrDataUrl);
            };

            if (typeof fileOrDataUrl === 'string') {
                img.src = fileOrDataUrl;
            } else if (fileOrDataUrl instanceof Blob) {
                const reader = new FileReader();
                reader.onload = (e) => { img.src = e.target.result; };
                reader.onerror = () => resolve(fileOrDataUrl);
                reader.readAsDataURL(fileOrDataUrl);
            } else {
                resolve(fileOrDataUrl);
            }
        });
    }

    /**
     * Auto-migrate existing base64 images from localStorage patients into IndexedDB
     */
        /**
     * Reverse any legacy 'idb:' pointers back into real data URLs so images display properly
     */
    async function restoreIdbPointersToDataUrls() {
        const petiCareDB = (global.window && global.window.petiCareData);
        if (!petiCareDB || typeof petiCareDB.getPatients !== 'function') return;

        try {
            const patients = petiCareDB.getPatients(true);
            let restored = 0;

            for (const p of patients) {
                if (Array.isArray(p.visits)) {
                    for (const v of p.visits) {
                        if (v.caseImage && typeof v.caseImage === 'string' && v.caseImage.startsWith('idb:')) {
                            const realImg = await getImage(v.caseImage);
                            if (realImg) { v.caseImage = realImg; restored++; }
                            else { v.caseImage = ''; }
                        }
                        if (v.prescriptionImage && typeof v.prescriptionImage === 'string' && v.prescriptionImage.startsWith('idb:')) {
                            const realImg = await getImage(v.prescriptionImage);
                            if (realImg) { v.prescriptionImage = realImg; restored++; }
                            else { v.prescriptionImage = ''; }
                        }
                        if (Array.isArray(v.labImages)) {
                            for (let i = 0; i < v.labImages.length; i++) {
                                const img = v.labImages[i];
                                if (img && typeof img === 'string' && img.startsWith('idb:')) {
                                    const realImg = await getImage(img);
                                    if (realImg) { v.labImages[i] = realImg; restored++; }
                                    else { v.labImages[i] = ''; }
                                }
                            }
                            v.labImages = v.labImages.filter(Boolean);
                        }
                    }
                }
            }

            if (restored > 0) {
                petiCareDB.savePatients(patients, true);
                console.log(`🖼️ [PetiCare Images] Restored ${restored} photos from IndexedDB to standard Data URLs!`);
            }
        } catch (e) {
            console.warn('restoreIdbPointersToDataUrls error:', e);
        }
    }
    async function migrateImagesFromLocalStorage(dbInstance) {
        const petiCareDB = dbInstance || (global.window && global.window.petiCareData);
        if (!petiCareDB || typeof petiCareDB.getPatients !== 'function') return { migrated: 0 };

        const patients = petiCareDB.getPatients(true);
        let count = 0;

        for (const p of patients) {
            if (Array.isArray(p.visits)) {
                for (const v of p.visits) {
                    const vId = v.id || `vis_${Date.now()}`;
                    // Case image
                    if (v.caseImage && typeof v.caseImage === 'string' && v.caseImage.startsWith('data:image/')) {
                        const key = `img_${p.id}_${vId}_case`;
                        await saveImage(key, v.caseImage);
                        v.caseImage = `idb:${key}`;
                        count++;
                    }
                    // Lab images
                    if (Array.isArray(v.labImages)) {
                        for (let i = 0; i < v.labImages.length; i++) {
                            const img = v.labImages[i];
                            if (img && typeof img === 'string' && img.startsWith('data:image/')) {
                                const key = `img_${p.id}_${vId}_lab_${i}`;
                                await saveImage(key, img);
                                v.labImages[i] = `idb:${key}`;
                                count++;
                            }
                        }
                    }
                    // Client photo
                    if (v.clientImage && typeof v.clientImage === 'string' && v.clientImage.startsWith('data:image/')) {
                        const key = `img_${p.id}_${vId}_client`;
                        await saveImage(key, v.clientImage);
                        v.clientImage = `idb:${key}`;
                        count++;
                    }
                }
            }
            if (p.ownerPhoto && typeof p.ownerPhoto === 'string' && p.ownerPhoto.startsWith('data:image/')) {
                const key = `img_${p.id}_ownerPhoto`;
                await saveImage(key, p.ownerPhoto);
                p.ownerPhoto = `idb:${key}`;
                count++;
            }
        }

        if (count > 0) {
            petiCareDB.savePatients(patients, true);
            console.log(`💾 [PetiCare IndexedDB] Successfully migrated ${count} photos from localStorage to IndexedDB!`);
        }

        return { migrated: count };
    }

    const api = {
        saveImage,
        getImage,
        resolveImage,
        compressImage,
        migrateImagesFromLocalStorage
    };

    if (typeof window !== 'undefined') {
        window.PetiCareImages = api;
        // Auto migrate on load if window ready
        if (typeof document !== 'undefined') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    restoreIdbPointersToDataUrls();
                }, 1000);
            });
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : global);
