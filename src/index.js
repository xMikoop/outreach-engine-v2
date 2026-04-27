import fs from 'fs';
import csv from 'csv-parser';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_safety',
});

const INPUT_FILE = './data/sample_leads.csv';
const OUTPUT_FILE = './data/enriched_leads.csv';

// Delay function to respect API rate limits
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateIcebreaker(prospect) {
  // Map fields dynamically handling raw Apollo.io exports
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
  4. Examples of excellent patterns (do not copy 1:1, adapt naturally):
     - "Cześć ${name}, widziałem co robicie w ${company}. Zastanawiam się jak przy obecnej sytuacji na rynku w okolicach ${city} podchodzicie do automatyzacji procesów."
     - "Cześć ${name}, przejrzałem Twój profil – świetne rzeczy w branży ${industry}. Szukałem kogoś kto odpowiada za rozwój w ${company} i wygląda na to, że dobrze trafiłem."
     - "Panie ${name}, trafiłem na ${company} przy okazji analizy rynku. Wasze podejście do ${industry} bardzo pokrywa się z moimi obserwacjami."

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

async function processLeads() {
  console.log('🚀 Starting AI Outreach Engine V2...');
  const leads = [];

  // Read CSV
  fs.createReadStream(INPUT_FILE)
    .pipe(csv())
    .on('data', (data) => leads.push(data))
    .on('end', async () => {
      if (leads.length === 0) {
        console.log('❌ No leads found or empty CSV.');
        return;
      }
      
      console.log(`📄 Found ${leads.length} leads. Processing...`);
      
      // Prepare Output CSV Header
      const header = Object.keys(leads[0]).join(',') + ',icebreaker_ai\n';
      fs.writeFileSync(OUTPUT_FILE, header);

      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        const displayFirst = lead.first_name || lead.FirstName || 'Unknown';
        const displayCompany = lead.organization_name || lead.Company || 'Unknown Company';
        
        console.log(`⏳ Processing lead ${i + 1}/${leads.length}: ${displayFirst} at ${displayCompany}...`);
        
        const icebreaker = await generateIcebreaker(lead);
        
        // Escape quotes for CSV format
        const safeIcebreaker = `"${icebreaker.replace(/"/g, '""')}"`;
        const row = Object.values(lead).join(',') + `,${safeIcebreaker}\n`;
        
        fs.appendFileSync(OUTPUT_FILE, row);
        
        // Anti-rate-limit delay (e.g., 1 second between requests)
        await delay(1000);
      }

      console.log('✅ Processing complete! Check data/enriched_leads.csv');
    });
}

processLeads();
