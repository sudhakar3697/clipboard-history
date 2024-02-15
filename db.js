const DB_NAME = 'clipboard-history-db';
const DB_VERSION = 1;
let db;

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = function (event) {
            reject(event.target.error);
        };
        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            db.createObjectStore('clips', { keyPath: 'id', autoIncrement: true });
        };
        request.onsuccess = function (event) {
            db = event.target.result;
            console.log('Database opened successfully');
            resolve();
        };
    });
}

async function deleteStore() {
    const transaction = db.transaction(['clips'], 'readwrite');
    const objectStore = transaction.objectStore('clips');

    return new Promise((resolve, reject) => {
        const request = objectStore.clear();
        request.onsuccess = function (event) {
            console.log('Items deleted successfully');
            resolve();
        };
        request.onerror = function (event) {
            console.error('Error deleting items:', event.target.error);
            reject(event.target.error);
        };
    });
}

async function addItem(item) {
    const transaction = db.transaction(['clips'], 'readwrite');
    const objectStore = transaction.objectStore('clips');

    return new Promise((resolve, reject) => {
        item.ts = Date.now();
        const request = objectStore.add(item);
        request.onsuccess = function (event) {
            console.log('Item added to database');
            resolve();
        };
        request.onerror = function (event) {
            console.error('Error adding item to database:', event.target.error);
            reject(event.target.error);
        };
    });
}

async function getAllItems() {
    const transaction = db.transaction(['clips'], 'readonly');
    const objectStore = transaction.objectStore('clips');

    return new Promise((resolve, reject) => {
        const request = objectStore.getAll();
        request.onsuccess = function (event) {
            const items = event.target.result;
            resolve(items);
        };
        request.onerror = function (event) {
            console.error('Error fetching items from database:', event.target.error);
            reject(event.target.error);
        };
    });
}

async function getItem(id) {
    const transaction = db.transaction(['clips'], 'readonly');
    const objectStore = transaction.objectStore('clips');

    return new Promise((resolve, reject) => {
        const request = objectStore.get(id);
        request.onsuccess = function (event) {
            const item = event.target.result;
            resolve(item);
        };
        request.onerror = function (event) {
            console.error('Error fetching item from database:', event.target.error);
            reject(event.target.error);
        };
    });
}

async function updateItem(updatedItem) {
    const transaction = db.transaction(['clips'], 'readwrite');
    const objectStore = transaction.objectStore('clips');

    return new Promise((resolve, reject) => {
        const request = objectStore.put(updatedItem);
        request.onsuccess = function (event) {
            console.log('Item updated successfully');
            resolve();
        };
        request.onerror = function (event) {
            console.error('Error updating item:', event.target.error);
            reject(event.target.error);
        };
    });
}

async function deleteItem(id) {
    const transaction = db.transaction(['clips'], 'readwrite');
    const objectStore = transaction.objectStore('clips');

    return new Promise((resolve, reject) => {
        const request = objectStore.delete(id);
        request.onsuccess = function (event) {
            console.log('Item deleted successfully');
            resolve();
        };
        request.onerror = function (event) {
            console.error('Error deleting item:', event.target.error);
            reject(event.target.error);
        };
    });
}
