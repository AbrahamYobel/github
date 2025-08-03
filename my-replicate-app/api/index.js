import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

let history = [];

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
  userAgent: 'https://www.npmjs.com/package/create-replicate'
});

const model = 'ibm-granite/granite-3.3-8b-instruct:a325a0cacfb0aa9226e6bad1abe5385f1073f4c7f8c36e52ed040e5409e6c034';

app.post('/api/analyze', async (req, res) => {
  const userText = req.body.text;

  if (!userText) {
    return res.status(400).json({ error: 'Text is required in request body.' });
  }

  const prompt = `
You are an intelligent assistant. Given the text below, do two things:

1. Classify the text into one category from this list:
   - Sports
   - Music
   - Politics
   - Technology
   - Health
   - Education
   - Economy
   - Social
   - Entertainment

2. Summarize the text in 2–3 sentences.
3. If the inputted text has no meaning and contains random letters like "adjfijfbwbf fbwihdf wdfhwdbf iwdfwbdfbwq f hdfqhuwbfhbw". Then you only need to write the categories: None and Summary: Sentence has no meaning at all

Format your response in JSON like this:
{
  "category": "<best category>",
  "summary": "<short summary here>"
}

Text:
"""
${userText}
"""
`;

  const input = {
    prompt,
    top_k: 50,
    top_p: 0.9,
    max_tokens: 600,
    min_tokens: 10,
    temperature: 0.4,
    presence_penalty: 0,
    frequency_penalty: 0
  };

  try {
    const output = await replicate.run(model, { input });
    const raw = output.join("").trim();

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response', raw });
    }

    res.json(result);
  } catch (error) {
    console.error('Error running model:', error);
    res.status(500).json({ error: 'AI model failed to respond.' });
  }
});

app.post('/api/save-history', (req, res) => {
  const { input, category, summary } = req.body;

  if (!input || !category || !summary) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const newEntry = {
    id: uuidv4(),
    input,
    category,
    summary,
    timestamp: new Date().toISOString(),
  };

  history.push(newEntry);
  res.status(201).json({ message: 'Saved to history', entry: newEntry });
});

app.get('/api/history', (req, res) => {
  res.json(history);
});

app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  const index = history.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  history.splice(index, 1);
  res.json({ message: 'Deleted successfully' });
});

// ✅ EKSPOR UNTUK VERCEL
export default app;
