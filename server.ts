import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getClient(customApiKey?: string) {
  const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // 1. Validate API Key & Discover Models via real Gemini Models API
  app.post('/api/gemini/models', async (req, res) => {
    try {
      const { apiKey } = req.body || {};
      const ai = getClient(apiKey);
      const pager = await ai.models.list();
      const discovered: Array<{
        id: string;
        displayName: string;
        description: string;
        inputTokenLimit: number;
        outputTokenLimit: number;
        supportedActions: string[];
        supportsVision: boolean;
      }> = [];

      for await (const m of pager) {
        const rawName = m.name || '';
        const id = rawName.replace(/^models\//, '');
        if (!id) continue;
        // Filter out deprecated 1.5 / 2.0 models and keep modern Gemini models
        if (
          id.includes('gemini-1.5') ||
          id.includes('gemini-2.0') ||
          id === 'gemini-pro'
        ) {
          continue;
        }
        const actions = m.supportedActions || [];
        if (actions.length > 0 && !actions.includes('generateContent')) {
          continue;
        }
        discovered.push({
          id,
          displayName: m.displayName || id,
          description: m.description || 'Google Gemini multimodal reasoning model',
          inputTokenLimit: m.inputTokenLimit || 1048576,
          outputTokenLimit: m.outputTokenLimit || 8192,
          supportedActions: actions.length ? actions : ['generateContent'],
          supportsVision: !id.includes('embedding') && !id.includes('tts'),
        });
      }

      // Ensure recommended current models are always present at top of list
      const coreModels = [
        {
          id: 'gemini-3.8-flash',
          displayName: 'Gemini 3.8 Flash',
          description: 'Fast, high-intelligence multimodal model for Smali analysis, Hinglish chat, and screen debugging.',
          inputTokenLimit: 1048576,
          outputTokenLimit: 65536,
          supportedActions: ['generateContent', 'countTokens'],
          supportsVision: true,
        },
        {
          id: 'gemini-3.1-flash-lite',
          displayName: 'Gemini 3.1 Flash Lite',
          description: 'Ultra-low latency model ideal for rapid Smali opcode lookups and quick floating assistant queries.',
          inputTokenLimit: 1048576,
          outputTokenLimit: 32768,
          supportedActions: ['generateContent'],
          supportsVision: true,
        },
        {
          id: 'gemini-flash-latest',
          displayName: 'Gemini Flash Latest',
          description: 'Latest stable Flash release with balanced speed, code diff generation, and multimodal vision.',
          inputTokenLimit: 1048576,
          outputTokenLimit: 65536,
          supportedActions: ['generateContent'],
          supportsVision: true,
        },
      ];

      const mergedMap = new Map<string, (typeof coreModels)[0]>();
      for (const cm of coreModels) {
        mergedMap.set(cm.id, cm);
      }
      for (const dm of discovered) {
        if (!mergedMap.has(dm.id)) {
          mergedMap.set(dm.id, dm);
        }
      }

      res.json({
        ok: true,
        models: Array.from(mergedMap.values()),
        usingEnvironmentKey: !(apiKey && apiKey.trim()) && Boolean(process.env.GEMINI_API_KEY),
      });
    } catch (error: any) {
      const status = error?.status || 500;
      const rawMessage = error?.message || 'Failed to validate credentials or fetch Gemini models.';
      // Redact any accidental key strings
      const safeMessage = rawMessage.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');
      res.status(status >= 400 && status < 600 ? status : 500).json({
        ok: false,
        error: safeMessage,
      });
    }
  });

  // 2. Validate API Key with a lightweight real Gemini test request
  app.post('/api/gemini/validate', async (req, res) => {
    try {
      const { apiKey, model } = req.body || {};
      const ai = getClient(apiKey);
      const targetModel = model || 'gemini-3.8-flash';
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: 'Respond with exact word: ONLINE',
      });
      res.json({
        ok: true,
        status: 'VERIFIED',
        model: targetModel,
        reply: (response.text || 'ONLINE').trim(),
      });
    } catch (error: any) {
      const safeMessage = (error?.message || 'API key validation failed.').replace(
        /AIza[0-9A-Za-z-_]{35}/g,
        '[REDACTED_KEY]'
      );
      res.status(400).json({
        ok: false,
        error: safeMessage,
      });
    }
  });

  // 3. Chat & Multimodal Analysis (Text, Smali, Code Diffs, Screen Capture Image)
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const {
        apiKey,
        model = 'gemini-3.8-flash',
        systemInstruction,
        history = [],
        message,
        imageBase64,
        imageMimeType = 'image/png',
      } = req.body || {};

      if (!message && !imageBase64) {
        res.status(400).json({ ok: false, error: 'Prompt message or screen image is required.' });
        return;
      }

      const ai = getClient(apiKey);

      const contents: any[] = [];
      for (const item of history.slice(-12)) {
        if (!item || !item.text) continue;
        contents.push({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(item.text) }],
        });
      }

      const currentParts: any[] = [];
      if (imageBase64) {
        const cleanBase64 = imageBase64.includes(',')
          ? imageBase64.split(',')[1]
          : imageBase64;
        currentParts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: imageMimeType,
          },
        });
      }
      if (message) {
        currentParts.push({ text: String(message) });
      }

      contents.push({
        role: 'user',
        parts: currentParts,
      });

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction:
            systemInstruction ||
            'You are JARVIS, an advanced Android development, APK modding, and Smali reverse-engineering AI assistant. Address the user as Sir. Default to clear, natural Hinglish unless asked otherwise.',
          temperature: 0.35,
        },
      });

      const text = response.text || 'Sir, no text output was returned by the model.';
      res.json({
        ok: true,
        text,
        model,
      });
    } catch (error: any) {
      const safeMessage = (error?.message || 'Gemini generation request failed.').replace(
        /AIza[0-9A-Za-z-_]{35}/g,
        '[REDACTED_KEY]'
      );
      res.status(500).json({
        ok: false,
        error: safeMessage,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JARVIS AI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
