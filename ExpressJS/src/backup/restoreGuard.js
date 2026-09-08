const { requireThat, fingerprint } = require('./safety');
const GUARD_COLLECTION = 'restoreguard';

async function assertUsable(db, { jwtSecret = process.env.JWT_SECRET, mfaKey = process.env.AUTH_MFA_ENCRYPTION_KEY } = {}) {
  const cursor = db.listCollections({ name: GUARD_COLLECTION }, { nameOnly: true });
  try {
    if (!await cursor.hasNext()) return;
    const marker = await db.collection(GUARD_COLLECTION).findOne({ _id: 'restore' });
    requireThat(marker?.status === 'COMPLETE', 'RESTORE_INCOMPLETE');
    requireThat(typeof jwtSecret === 'string' && fingerprint(jwtSecret) === marker.jwtFingerprint, 'RESTORE_JWT_CONFIG_MISMATCH');
    if (marker.mfaKeyFingerprint) requireThat(typeof mfaKey === 'string' && /^[a-f0-9]{64}$/i.test(mfaKey) && fingerprint(Buffer.from(mfaKey, 'hex')) === marker.mfaKeyFingerprint, 'RESTORE_MFA_CONFIG_MISMATCH');
  }
  finally { await cursor.close(); }
}
module.exports = { assertUsable, GUARD_COLLECTION };
