import OpenAI from 'openai';
import { buildSysPrompt } from './SysPrompt.js';

let _client = null;


function getOpenAIClient() {
  if (_client) return _client;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. ' +
      'The CLI client should have resolved the key before starting the server.',
    );
  }

  _client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://sagnickportfolio48.vercel.app/',
      'X-Title': 'CodeGenX',
    },
  });

  return _client;
}

async function AICon(userPrompt) {
  const client = await getOpenAIClient();

  const model = process.env.OPENROUTER_API_MODEL;
  if (!model) {
    throw new Error(
      'OPENROUTER_API_MODEL is not set. ' +
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

export { AICon, getOpenAIClient };