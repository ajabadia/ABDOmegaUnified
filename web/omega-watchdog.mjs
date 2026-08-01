import fs from 'fs';
import http from 'http';
import path from 'path';

// CONFIGURATION
const PORT = 3001;
const WATCH_DIR = process.argv[2] || './'; // Target directory from CLI
const TARGET_EXT = '.acemm';

console.log(`\n[OMEGA WATCHDOG] Starting industrial monitor...`);
console.log(`[OMEGA WATCHDOG] Watching: ${path.resolve(WATCH_DIR)}`);
console.log(`[OMEGA WATCHDOG] Port: ${PORT}\n`);

let clients = [];

// SSE & SAVE SERVER
const server = http.createServer((req, res) => {
  // Set global CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    // Industrial Keep-alive Heartbeat
    res.write(': connection established\n\n');

    console.log(`[WATCHDOG] Client connected: ${clientId} (Total: ${clients.length})`);

    req.on('close', () => {
      clients = clients.filter(c => c.id !== clientId);
      console.log(`[WATCHDOG] Client disconnected: ${clientId}`);
    });
    return;
  }

  if (req.url === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.filename || payload.content === undefined) {
          throw new Error('Missing filename or content in payload.');
        }

        // Sanitize path to prevent directory traversal
        const safeName = path.basename(payload.filename);
        const targetPath = path.join(WATCH_DIR, safeName);

        fs.writeFileSync(targetPath, payload.content, 'utf8');
        console.log(`[WATCHDOG] Saved file from web editor: ${safeName}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, path: targetPath }));
      } catch (err) {
        console.error(`[WATCHDOG] Save error: ${err.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

// Periodic Heartbeat
setInterval(() => {
  clients.forEach(client => {
    client.res.write(': ping\n\n');
  });
}, 15000);

server.listen(PORT);

// FILE WATCHER
let watchTimeout;
fs.watch(WATCH_DIR, { recursive: true }, (eventType, filename) => {
  if (filename && filename.endsWith(TARGET_EXT)) {
    // Debounce to avoid multiple triggers on single save
    clearTimeout(watchTimeout);
    watchTimeout = setTimeout(() => {
      console.log(`\n[WATCHDOG] Change detected: ${filename}`);
      
      try {
        const filePath = path.join(WATCH_DIR, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        
        const payload = JSON.stringify({
          filename,
          content,
          timestamp: new Date().toISOString()
        });

        clients.forEach(client => {
          client.res.write(`data: ${payload}\n\n`);
        });
        
        console.log(`[WATCHDOG] Update pushed to ${clients.length} clients.`);
      } catch (err) {
        console.error(`[WATCHDOG] Error reading file: ${err.message}`);
      }
    }, 100);
  }
});
