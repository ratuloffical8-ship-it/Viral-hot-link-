const admin = require('firebase-admin');

function loadServiceAccount() {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  let jsonText;
  if (base64 && base64.trim()) {
    jsonText = Buffer.from(base64.trim(), 'base64').toString('utf8');
  } else if (raw && raw.trim()) {
    jsonText = raw.trim();
  } else {
    throw new Error(
      'Firebase credentials missing. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_SERVICE_ACCOUNT.'
    );
  }

  let account;
  try {
    account = JSON.parse(jsonText);
  } catch (err) {
    throw new Error('Firebase service account is not valid JSON.');
  }

  if (account.private_key) {
    account.private_key = account.private_key.replace(/\\n/g, '\n');
  }

  return account;
}

function initFirebase() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    throw new Error('FIREBASE_DATABASE_URL is missing.');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
    databaseURL,
  });
}

initFirebase();

const db = admin.database();

/** Get a database reference by path, e.g. ref('links/abc123') */
function ref(path) {
  return db.ref(path);
}

/** Firebase server timestamp placeholder */
const serverTimestamp = admin.database.ServerValue.TIMESTAMP;

/** Atomic increment placeholder, e.g. { clicks: increment(1) } */
function increment(value = 1) {
  return admin.database.ServerValue.increment(value);
}

module.exports = {
  admin,
  db,
  ref,
  serverTimestamp,
  increment,
};
