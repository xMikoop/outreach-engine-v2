> 💡 **Portfolio Note:** *This tool was originally developed internally in Q3 2025. It has been cleaned of sensitive data, API keys, and internal business logic, and published here as a showcase of my technical stack.*


# ⚡ Cold Outreach Engine (V2 - Code Migration)

**A highly scalable, Node.js & OpenAI powered data enrichment engine. Automatically generates hyper-personalized cold email icebreakers from bulk Apollo.io CSV exports.**

---

### 🚨 The Problem (Why I migrated away from Make.com/Zapier)
In **Version 1**, I built this workflow using No-Code tools (Make.com). It worked perfectly for small batches. However, as the volume grew to 10,000+ leads per week, SaaS automation tools became a bottleneck:
1. **Cost:** Paying per-operation in Make.com gets incredibly expensive at scale.
2. **Rate Limits:** Handling OpenAI's 429 Rate Limit errors visually in a No-Code editor is cumbersome and prone to freezing.
3. **Data Privacy:** Sending proprietary lead lists through third-party iPaaS platforms introduces unnecessary data compliance risks.

### 💡 The Solution (V2 Architecture)
I re-architected the entire pipeline into a custom **Node.js script**. 
By building this in code, I achieved:
- **90% Cost Reduction:** Zero platform execution fees, paying only fractions of a cent directly to the OpenAI API via `gpt-4o-mini`.
- **Full Execution Control:** Implemented custom `setTimeout` delays and batch processing to flawlessly respect API limits.
- **Strict Data Handling:** Forced `response_format: { type: 'json_object' }` on the OpenAI SDK to guarantee the output never breaks the CSV structure.

### 🛠️ Tech Stack
- **Environment:** Node.js (ES Modules)
- **AI Integration:** Official `openai` SDK
- **Web Dashboard:** `express`, `multer` (CSV upload), `cors`
- **Real-time Logs:** Server-Sent Events (SSE) for live terminal output streaming
- **Email Dispatch:** `nodemailer` with Google Workspace SMTP rotation
- **Data Handling:** `csv-parser`, native `fs` streams for memory-efficient processing of large files.

### 🚀 How it Works (Phase 1: Enrichment)
1. Drop a raw export from Apollo or LinkedIn into `data/sample_leads.csv`.
2. The engine parses the data stream and dynamically injects Name, Company, City, and Industry into a highly-tuned system prompt.
3. The LLM acts as a senior copywriter, executing "Plausible Deniability" strategies (shortening company names, implying local familiarity).
4. The output is safely appended to `data/enriched_leads.csv`.

### 📧 How it Works (Phase 2: Automated Dispatch)
1. Run the sender module (`npm run send`).
2. The script loads a configuration of **15 Google Workspace domain accounts**.
3. It iterates through the enriched list, grabbing the AI-generated icebreaker.
4. **Intelligent Rotation & Delays:** To bypass strict Google spam filters, the engine rotates sender accounts dynamically and mimics human behavior by sleeping for a random interval between **6 and 45 minutes** between each email send.
5. All emails are dispatched via Google API/Nodemailer natively.

---
*Built to demonstrate the evolution from No-Code prototyping to robust, code-first automation engineering.*
