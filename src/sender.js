import fs from 'fs';
import csv from 'csv-parser';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const ENRICHED_FILE = './data/enriched_leads.csv';

// Dummy list of 15 domains/accounts to rotate (used via Google Workspace API / OAuth2 in production)
// In a real environment, you would use OAuth2 refresh tokens for each account.
const SENDER_ACCOUNTS = [
  { user: 'm.pilch@growth-scale.com', pass: 'dummy_app_password_1' },
  { user: 'mikolaj@growth-scale.com', pass: 'dummy_app_password_2' },
  { user: 'hello@growth-scale.com', pass: 'dummy_app_password_3' },
  { user: 'm.pilch@scale-partners.co', pass: 'dummy_app_password_4' },
  { user: 'mikolaj@scale-partners.co', pass: 'dummy_app_password_5' },
  { user: 'contact@scale-partners.co', pass: 'dummy_app_password_6' },
  { user: 'm.pilch@outreach-labs.io', pass: 'dummy_app_password_7' },
  { user: 'mikolaj@outreach-labs.io', pass: 'dummy_app_password_8' },
  { user: 'sales@outreach-labs.io', pass: 'dummy_app_password_9' },
  { user: 'm.pilch@b2b-engine.net', pass: 'dummy_app_password_10' },
  { user: 'mikolaj@b2b-engine.net', pass: 'dummy_app_password_11' },
  { user: 'info@b2b-engine.net', pass: 'dummy_app_password_12' },
  { user: 'm.pilch@growth-engine.pl', pass: 'dummy_app_password_13' },
  { user: 'mikolaj@growth-engine.pl', pass: 'dummy_app_password_14' },
  { user: 'biuro@growth-engine.pl', pass: 'dummy_app_password_15' }
];

// Helper to get random delay between min and max minutes
function getRandomDelay(minMinutes, maxMinutes) {
  const ms = Math.floor(Math.random() * (maxMinutes - minMinutes + 1) + minMinutes) * 60 * 1000;
  return ms;
}

// Format MS to Minutes and Seconds for logging
function formatMsToTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
}

// Delay Promise
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendEmails() {
  console.log('🚀 Starting AI Outreach Automated Sender (Google API / SMTP rotation)...');
  
  if (!fs.existsSync(ENRICHED_FILE)) {
    console.error(`❌ Error: Could not find ${ENRICHED_FILE}. Run "npm start" first to generate icebreakers.`);
    return;
  }

  const leads = [];
  
  // Read the enriched CSV
  fs.createReadStream(ENRICHED_FILE)
    .pipe(csv())
    .on('data', (data) => leads.push(data))
    .on('end', async () => {
      console.log(`📄 Found ${leads.length} leads to send.\n`);

      let accountIndex = 0;

      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        
        // Grab email and generated icebreaker
        const toEmail = lead.email || lead.Email || '';
        const icebreaker = lead.icebreaker_ai || lead.Icebreaker || '';
        const firstName = lead.first_name || lead.FirstName || 'there';

        if (!toEmail || !icebreaker) {
          console.log(`⚠️ Skipping lead ${i + 1}/${leads.length}: Missing email or icebreaker.`);
          continue;
        }

        // Rotate sender accounts
        const currentAccount = SENDER_ACCOUNTS[accountIndex];
        
        // Setup transporter for Google API (SMTP interface here, but OAuth2 in strict prod)
        let transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: currentAccount.user,
            pass: currentAccount.pass
          }
        });

        const subject = `Pytanie o rozwój operacji - ${firstName}`;
        const emailBody = `${icebreaker}\n\nPozdrawiam,\nMikołaj Pilch\nGrowth Partner\n`;

        console.log(`--------------------------------------------------`);
        console.log(`📧 Sending Lead ${i + 1}/${leads.length} -> ${toEmail}`);
        console.log(`🔒 Using Account: ${currentAccount.user}`);
        console.log(`📝 Subject: ${subject}`);
        console.log(`💬 Body: ${icebreaker.substring(0, 40)}...`);

        try {
          // ---
          // PRODUCTION CODE: 
          // await transporter.sendMail({
          //   from: currentAccount.user,
          //   to: toEmail,
          //   subject: subject,
          //   text: emailBody
          // });
          // ---
          
          // MOCK SEND FOR PORTFOLIO SAFETY
          console.log(`✅ [MOCK] Email successfully sent from ${currentAccount.user} to ${toEmail}`);
        } catch (err) {
          console.error(`❌ Failed to send email to ${toEmail}:`, err.message);
        }

        // Rotate to the next account
        accountIndex = (accountIndex + 1) % SENDER_ACCOUNTS.length;

        // Apply organic delay to avoid Google spam filters (between 6 and 45 mins)
        // For demonstration purposes, if MIN_DELAY_OVERRIDE is passed, we skip the giant wait
        const isDemoMode = true; 
        const nextDelayMs = isDemoMode ? 3000 : getRandomDelay(6, 45); 
        
        if (i < leads.length - 1) {
          const humanDelay = isDemoMode ? "3 seconds (Demo Mode)" : formatMsToTime(nextDelayMs);
          console.log(`⏳ Sleeping for ${humanDelay} to mimic human sending and avoid spam limits...`);
          await delay(nextDelayMs);
        }
      }

      console.log('\n🎉 All emails have been processed and sent in the campaign!');
    });
}

sendEmails();
