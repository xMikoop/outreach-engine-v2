import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3000;

// Setup multer to overwrite the sample_leads.csv
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('data')) fs.mkdirSync('data');
    cb(null, 'data/');
  },
  filename: (req, file, cb) => {
    cb(null, 'sample_leads.csv');
  }
});
const upload = multer({ storage });

app.use(express.static('public'));

// Server-Sent Events (SSE) for real-time terminal logs
let clients = [];

function broadcastLog(message) {
  clients.forEach(client => client.res.write(`data: ${message}\n\n`));
}

app.get('/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  clients.push({ req, res });
  
  req.on('close', () => {
    clients = clients.filter(client => client.req !== req);
  });
});

// Endpoints
app.post('/api/upload', upload.single('csvFile'), (req, res) => {
  broadcastLog(`[SYSTEM] Załadowano nowy plik leadów: ${req.file.originalname}`);
  res.json({ success: true, message: 'File uploaded successfully.' });
});

function runScript(command, args, name) {
  broadcastLog(`[SYSTEM] --- Uruchamiam proces: ${name} ---`);
  const child = spawn(command, args, { shell: true });

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if(line.trim()) broadcastLog(line.trim());
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if(line.trim()) broadcastLog(`❌ [ERROR] ${line.trim()}`);
    });
  });

  child.on('close', (code) => {
    broadcastLog(`[SYSTEM] --- Proces ${name} zakończony ---`);
  });
}

app.post('/api/generate', (req, res) => {
  runScript('node', ['src/index.js'], 'Icebreaker Generator');
  res.json({ success: true });
});

app.post('/api/send', (req, res) => {
  runScript('node', ['src/sender.js'], 'Automated Sender');
  res.json({ success: true });
});

app.listen(port, () => {
  console.log(`🚀 Web Dashboard running at http://localhost:${port}`);
});
