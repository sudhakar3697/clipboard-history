import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    signInWithRedirect,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    deleteDoc,
    onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDnnMax6Zo6XwG8IGxV5eNM87WMV3MF25g",
    authDomain: "clipboard-history.firebaseapp.com",
    projectId: "clipboard-history",
    storageBucket: "clipboard-history.appspot.com",
    messagingSenderId: "41200247446",
    appId: "1:41200247446:web:2823e5a904fbaa6b7618b7",
};

let syncStatus = '';
let currentUser = {};
let unsubCloudListener;

const syncBtn = document.getElementById("syncBtn");
const syncBtn2 = document.getElementById("syncBtn2");
const syncStat = document.getElementById("syncStat");
const syncStat2 = document.getElementById("syncStat2");

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function syncContent() {
    if (syncStatus == 'synced' || syncStatus == 'syncing') {
        const resp = confirm('Click okay to remove the cloud contents along with logout!');
        if (resp) {
            await unsync();
        } else {
            await unsync(false);
        }
    } else {
        initGoogleSignIn();
    }
}

async function unsync(deleteContent = true) {
    unsubCloudListener();
    if (deleteContent)
        await deleteDoc(doc(db, "clips", currentUser.email));
    await signOutOfGoogle();
    setSyncStatusElems('');
}

syncBtn.addEventListener("click", async () => {
    syncContent();
});

syncBtn2.addEventListener("click", async () => {
    syncContent();
});

document.getElementById('cleanup-btn').addEventListener('click', async () => {
    try {
        await unsync();
    } catch (err) {
        console.log(err);
    }
});

function setSyncStatusElems(value) {
    if (value == 'syncing') {
        syncBtn.innerText = 'Unsync';
        syncBtn2.innerText = 'Unsync';
        syncStat.innerText = 'Syncing';
        syncStat2.innerText = 'Sync in progress as ' + currentUser.displayName + ' (' + currentUser.email + ')';
        syncStatus = 'syncing';
    } else if (value == 'synced') {
        syncBtn.innerText = 'Unsync';
        syncBtn2.innerText = 'Unsync';
        syncStat.innerText = 'In Sync';
        syncStat2.innerText = 'In Sync as ' + currentUser.displayName + ' (' + currentUser.email + ')';
        syncStatus = 'synced';
    } else {
        syncBtn.innerText = 'Sync';
        syncBtn2.innerText = 'Sync';
        syncStat.innerText = 'Not Syncing';
        syncStat2.innerText = 'Not Syncing';
        syncStatus = '';
    }
}

async function initGoogleSignIn() {
    const provider = new GoogleAuthProvider();
    signInWithRedirect(auth, provider)
        // signInWithPopup(auth, provider)
        .then(async (result) => {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            const user = result.user;
            // IdP data available using getAdditionalUserInfo(result)
            console.log('initGoogleSignIn->', token, user);
        })
        .catch((error) => {
            console.log(error);
            // The AuthCredential type that was used.
            const credential = GoogleAuthProvider.credentialFromError(error);
            console.log(credential);
        });
}

async function signOutOfGoogle() {
    try {
        await signOut(auth);
        console.log("Sign-out Google Ac successful");
        currentUser = {};
    } catch (err) {
        console.log(err);
    }
}

async function syncFireStoreContent() {
    unsubCloudListener = onSnapshot(doc(db, "clips", currentUser.email), async (docu) => {
        const source = docu.metadata.hasPendingWrites ? "Local" : "Server";
        let cloudData = docu.data()?.clips;
        console.log('onSnapshot - cloud data changed at', source, cloudData);
        if (source === "Server") {
            setSyncStatusElems('syncing');
            const data = await getAllItems();
            if (cloudData) {
                const docRef = doc(db, "clips", currentUser.email);
                for await (const entry of data) {
                    const cloudEntry = cloudData.find(d => d.id === entry.id);
                    if (cloudEntry) {
                        if (cloudEntry.uts > entry.uts) {
                            console.log('To update local', entry.id, entry.name);
                            await updateItem(cloudEntry, false);
                        } else if (cloudEntry.uts < entry.uts) {
                            console.log('To update cloud', entry.id, entry.name);
                            const docSnap2 = await getDoc(docRef);
                            const items2 = docSnap2.data().clips.filter(d => d.id !== cloudEntry.id);
                            items2.push(entry);
                            await updateDoc(docRef, { clips: items2 });
                        }
                        cloudData = cloudData.filter(d => d.id !== cloudEntry.id);
                    } else {
                        console.log('To remove local', entry.id, entry.name);
                        await deleteItem(entry.id, false);
                    }
                }
                for await (const entry of cloudData) {
                    console.log('To add local', entry.id, entry.name);
                    await addItem(entry, false);
                }
                window.dispatchEvent(new CustomEvent('clouddatachange'));
            } else {
                console.log("No document in the cloud yet, setting the local content there");
                await setDoc(doc(db, "clips", currentUser.email), { clips: data });
            }
            setSyncStatusElems('synced');
        }
    });

    window.addEventListener('datachange', async (event) => {
        console.log('local data changed event', event.detail.name, event.detail.item);
        setSyncStatusElems('syncing');
        const docRef = doc(db, "clips", currentUser.email);
        switch (event.detail.name) {
            case 'addItem':
                await updateDoc(docRef, {
                    clips: arrayUnion(event.detail.item)
                });
                break;
            case 'deleteItem':
                const docSnap = await getDoc(docRef);
                const items = docSnap.data().clips;
                await updateDoc(docRef, {
                    clips: items.filter(d => d.id !== event.detail.item)
                });
                break;
            case 'updateItem':
                const docSnap2 = await getDoc(docRef);
                const items2 = docSnap2.data().clips.filter(d => d.id !== event.detail.item.id);
                items2.push(event.detail.item);
                await updateDoc(docRef, { clips: items2 });
                break;
        }
        setSyncStatusElems('synced');
    });
}

onAuthStateChanged(auth, async (user) => {
    console.log('onAuthStateChanged', user);
    if (user) {
        console.log('onAuthStateChanged - User signed in');
        currentUser = { ...user };
        console.log('onAuthStateChanged - currentUser', currentUser);
        setSyncStatusElems('syncing');
        syncFireStoreContent();
    } else {
        currentUser = {};
        console.log('onAuthStateChanged- No user signed in yet');
        setSyncStatusElems('');
    }
});
