import express from "express";
import axios from "axios";
import proxyRouter from "./proxy.js";

const app = express();

app.use("/api/proxy", proxyRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/channels", async (req, res) => {
  try {
    const url = req.query.url as string || 'https://raw.githubusercontent.com/shakil951/PlaylistCheck/refs/heads/main/combined_playlist.m3u';
    
    let response;
    let attempt = 0;
    const MAX_RETRIES = 3;

    while (attempt < MAX_RETRIES) {
        try {
            response = await axios.get(url, {
                headers: {
                   'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                   'Accept': '*/*'
               },
               timeout: 30000,
               responseType: 'text'
            });
            break; // success
        } catch (e) {
            attempt++;
            if (attempt >= MAX_RETRIES) {
                throw e;
            }
            // wait
        }
    }

    if (!response) {
        throw new Error("Failed to fetch playlist");
    }
    
    res.setHeader("Content-Type", "text/plain");
    res.send(response.data);
  } catch (e: any) {
    res.status(500).send(e.message);
  }
});

export default app;
