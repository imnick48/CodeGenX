import OpenAI from 'openai';
import { buildSysPrompt } from './SysPrompt.js';

let _client = null;


function getGroqClient() {
  if (_client) return _client;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is not set. ' +
      'The CLI client should have resolved the key before starting the server.',
    );
  }

  _client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
  });

  return _client;
}

async function AICon(userPrompt) {
  const client = await getGroqClient();

  const model = process.env.GROQ_MODEL;
  if (!model) {
    throw new Error(
      'GROQ_MODEL is not set. ' +
      'The CLI client should have resolved the model before starting the server.',
    );
  }

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSysPrompt() },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from AI');
  return content;
}

export { AICon, getGroqClient };