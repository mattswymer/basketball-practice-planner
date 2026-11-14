// Firebase connection for the Basketball Practice Planner.
// Uses browser ES modules so this static GitHub Pages app needs no npm/build step.
const FIREBASE_VERSION = "13.3.0";
const FIREBASE_BASE = "https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION;

const firebaseConfig = {
  apiKey: "AIzaSyDX06_qZyVXmgaw-L4vdxk9hgqfhDLtHQg",
  authDomain: "basketball-practice-plan-377a3.firebaseapp.com",
  projectId: "basketball-practice-plan-377a3",
  storageBucket: "basketball-practice-plan-377a3.firebasestorage.app",
  messagingSenderId: "802672268243",
  appId: "1:802672268243:web:62dda2462dfc146b065526",
  measurementId: "G-N5R4HCPXT"
};

let servicesPromise = null;

async function loadFirebaseModules() {
  if (!servicesPromise) {
    servicesPromise = Promise.all([
      import(FIREBASE_BASE + "/firebase-app.js"),
      import(FIREBASE_BASE + "/firebase-auth.js"),
      import(FIREBASE_BASE + "/firebase-firestore.js")
    ]).catch(error => {
      servicesPromise = null;
      throw error;
    });
  }
  return servicesPromise;
}

export async function initializeCloud() {
  const [appSdk, authSdk, firestoreSdk] = await loadFirebaseModules();
  const app = appSdk.initializeApp(firebaseConfig);
  const auth = authSdk.getAuth(app);
  const db = firestoreSdk.getFirestore(app);

  await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);

  const plannerDocument = userId =>
    firestoreSdk.doc(db, "users", userId, "planner", "state");

  return {
    auth,
    onAuthStateChanged: callback =>
      authSdk.onAuthStateChanged(auth, callback),

    signInGoogle: async () => {
      const provider = new authSdk.GoogleAuthProvider();
      // GitHub Pages cannot host Firebase's same-origin redirect helper.
      // Use a user-initiated popup on every device to avoid third-party
      // storage restrictions that can break mobile redirect sign-in.
      return authSdk.signInWithPopup(auth, provider);
    },

    signInEmail: (email, password) =>
      authSdk.signInWithEmailAndPassword(auth, email, password),

    createEmailAccount: (email, password) =>
      authSdk.createUserWithEmailAndPassword(auth, email, password),

    sendPasswordReset: email =>
      authSdk.sendPasswordResetEmail(auth, email),

    signOut: () => authSdk.signOut(auth),

    getPlannerState: async userId => {
      const snapshot = await firestoreSdk.getDoc(plannerDocument(userId));
      return snapshot.exists() ? snapshot.data() : null;
    },

    savePlannerState: (userId, state, clientId) =>
      firestoreSdk.setDoc(plannerDocument(userId), {
        schemaVersion: 1,
        state,
        clientId,
        updatedAt: firestoreSdk.serverTimestamp(),
        updatedAtClient: new Date().toISOString()
      }),

    watchPlannerState: (userId, onChange, onError) =>
      firestoreSdk.onSnapshot(
        plannerDocument(userId),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.exists()) onChange(snapshot.data(), snapshot.metadata);
        },
        onError
      )
  };
}
