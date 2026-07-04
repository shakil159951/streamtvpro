import http from 'http';
import https from 'https';
import { URL } from 'url';

const targetUrl = 'https://owrcovcrpy.gpcdn.net/bpk-tv/1709/output/index.m3u8';
const urlObj = new URL(targetUrl);
const client = targetUrl.startsWith('https') ? https : http;

const headers = {
    'host': urlObj.host,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'accept': '*/*',
};

const req = client.request(targetUrl, {
    method: 'GET',
    headers,
}, (res) => {
    console.log('Status:', res.statusCode);
    res.on('data', (d) => process.stdout.write(d));
});

req.on('error', (e) => {
    console.error('Error:', e);
});

req.end();
