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

console.log(decryptToken("43f6f5a7b65c6acefc0c23644b547becaaba320002c09e216e9033b81da453f01916d573726aec69898a813c5280c641a3a06477a4ca6eebbac3066ba053e658adbd0f78ca850abc2c54be3236f1d5d808c7faab220c43080553bf9647a98507"));
