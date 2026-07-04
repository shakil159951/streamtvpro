import fs from 'fs';
import crypto from 'crypto';

const baseKeyStr = process.env.STREAM_SECRET_KEY || "DEFAULT_STREAM_SECURE_TOKEN_KEY_V1";
const SECRET_KEY = crypto.createHash('sha256').update(baseKeyStr).digest();

function encryptToken(url: string, expiresInMs: number = 5 * 60 * 1000): string {
    const expiresAt = Date.now() + expiresInMs;
    const payload = `${expiresAt}|${url}`;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY, iv);
    let encrypted = cipher.update(payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + encrypted;
}

const url = "https://vods2.aynaott.com/gseriesDrama/tracks-v1a1/mono.ts.m3u8";
console.log(encryptToken(url, 24 * 60 * 60 * 1000));
