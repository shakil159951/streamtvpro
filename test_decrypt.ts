import fs from 'fs';
import crypto from 'crypto';

const baseKeyStr = process.env.STREAM_SECRET_KEY || "DEFAULT_STREAM_SECURE_TOKEN_KEY_V1";
const SECRET_KEY = crypto.createHash('sha256').update(baseKeyStr).digest();

function decryptToken(token: string): string | null {
    try {
        const iv = Buffer.from(token.substring(0, 32), 'hex');
        const encrypted = token.substring(32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        const [expiresAtStr, ...urlParts] = decrypted.split('|');
        const expiresAt = parseInt(expiresAtStr, 10);
        if (Date.now() > expiresAt) {
            return null; // Expired
        }
        return urlParts.join('|');
    } catch (e) {
        return null;
    }
}

console.log(decryptToken("16e041c1c47f8549590cf8419ee2210babac5984e4522578940779587cf57b985c4cade05a98928e9ca5f9d561bf7444fec9a46bf1c22dee49db1869f41bcced574cb14adfb2748765be93d8faca1f14715002bd7f6cf92c89b9d7a230c1ae8d03b645fc30d00724f8f6d67676c4bb39"));
