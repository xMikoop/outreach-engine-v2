import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import csv from 'csv-parser';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'data/' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_safety',
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateIcebreaker(prospect) {
  const name = prospect.first_name || prospect.FirstName || '';
  const company = prospect.organization_name || prospect['organization/name'] || prospect.Company || '';
  const city = prospect.city || prospect.organization_city || prospect.City || '';
  const role = prospect.title || prospect['employment_history/0/title'] || '';
  const headline = prospect.headline || '';
  const industry = prospect.industry || prospect['organization/industry'] || '';

  const systemPrompt = `You are an elite B2B Sales Executive with 15 years of experience in high-ticket enterprise sales. 
You specialize in "Plausible Deniability" copywriting – crafting icebreakers that sound like they were written by a busy human CEO typing from an iPhone, not an AI. 
You despise generic sales pitches, emojis, and overly enthusiastic greetings. You use deep business acumen to find a clever angle based on the prospect's industry, headline, or location.`;

  const userPrompt = `
  Task: Create a highly personalized, one-line cold email icebreaker (in Polish) based on the prospect's data.
  Output Requirement: MUST be valid JSON: {"icebreaker": "your text"}

  Core Directives:
  1. The "Busy Executive" Tone: Laconic, confident, slightly informal but highly respectful. NO corporate buzzwords ("innowacyjny", "lider branży").
  2. Aggressive Name Normalization: Strip all legal entities and descriptive words from the company name (e.g., "AMJ Real Estate" -> "AMJ").
  3. Hyper-Contextual Framing: Use their Headline (${headline}) or Industry (${industry}) to make a highly specific, intelligent observation that proves you researched them.

  Prospect Data:
  First Name: ${name}
  Company (RAW): ${company}
  City: ${city}
  Role: ${role}
  Headline: ${headline}
  Industry: ${industry}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.icebreaker;
  } catch (error) {
    console.error(`❌ Error generating icebreaker for ${name}:`, error.message);
    return "Error generating icebreaker.";
  }
}

let activeClients = [];
let currentLeads = [];
let enrichedFilePath = '';

app.post('/api/upload', upload.single('csvFile'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      currentLeads = results;
      res.json({ message: 'File uploaded and parsed successfully', count: results.length });
    });
});

app.get('/api/generate', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  if (currentLeads.length === 0) {
    sendEvent('error', { message: 'No leads found to process.' });
    return res.end();
  }

  sendEvent('log', { message: `Starting AI processing for ${currentLeads.length} leads...` });

  const OUTPUT_FILE = path.join(process.cwd(), 'data', 'enriched_leads_ui.csv');
  enrichedFilePath = OUTPUT_FILE;
  
  const header = Object.keys(currentLeads[0]).join(',') + ',icebreaker_ai\n';
  fs.writeFileSync(OUTPUT_FILE, header);

  (async () => {
    for (let i = 0; i < currentLeads.length; i++) {
      const lead = currentLeads[i];
      const displayFirst = lead.first_name || lead.FirstName || 'Unknown';
      const displayCompany = lead.organization_name || lead.Company || 'Unknown Company';
      
      sendEvent('log', { message: `Processing lead ${i + 1}/${currentLeads.length}: ${displayFirst} at ${displayCompany}...` });
      sendEvent('progress', { current: i, total: currentLeads.length });

      const icebreaker = await generateIcebreaker(lead);
      
      const safeIcebreaker = `"${icebreaker.replace(/"/g, '""')}"`;
      const row = Object.values(lead).join(',') + `,${safeIcebreaker}\n`;
      fs.appendFileSync(OUTPUT_FILE, row);

      sendEvent('result', { data: { ...lead, icebreaker_ai: icebreaker } });
      sendEvent('progress', { current: i + 1, total: currentLeads.length });

      await delay(1000); // Respect API limits
    }
    
    sendEvent('done', {});
    res.end();
  })();
});

app.get('/api/download', (req, res) => {
  if (fs.existsSync(enrichedFilePath)) {
    res.download(enrichedFilePath, 'enriched_leads.csv');
  } else {
    res.status(404).send('File not found');
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ UI Server running on http://localhost:${PORT}`);
});
