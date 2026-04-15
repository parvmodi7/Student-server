/**
 * Gemini AI Service
 * Optimized service with caching to minimize API calls and prevent key exhaustion
 */
const axios = require('axios');
const NodeCache = require('node-cache');

// Response cache - stores last 500 requests
const responseCache = new NodeCache({ stdTTL: 600, checkperiod: 60 }); // 10 min default

// Request tracking for rate limiting
let requestCount = 0;
let lastReset = Date.now();

const resetCounter = () => {
  const now = Date.now();
  if (now - lastReset >= 60000) {
    requestCount = 0;
    lastReset = now;
  }
};

const canMakeRequest = () => {
  resetCounter();
  const maxRequests = parseInt(process.env.GEMINI_MAX_PER_MINUTE) || 15;
  return requestCount < maxRequests;
};

const waitIfNeeded = async () => {
  while (!canMakeRequest()) {
    const waitTime = 60000 - (Date.now() - lastReset);
    await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 5000)));
  }
};

const generateCacheKey = (prompt, systemPrompt) => {
  // Create a hash-like key from the prompt
  const key = `${prompt.slice(0, 100)}:${systemPrompt.slice(0, 50)}`;
  return key.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
};

/**
 * Call Gemini API with caching and rate limiting
 * @param {string} prompt - User prompt
 * @param {string} systemPrompt - System instructions
 * @param {boolean} useJson - Return JSON response
 * @returns {Promise<object|string>} - API response
 */
const callGemini = async (prompt, systemPrompt, useJson = false) => {
  const cacheKey = generateCacheKey(prompt, systemPrompt);
  
  // Check cache first
  const cached = responseCache.get(cacheKey);
  if (cached) {
    console.log(`[GEMINI CACHE HIT] ${cacheKey}`);
    return cached;
  }

  // Wait if rate limited
  await waitIfNeeded();

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: useJson ? { responseMimeType: "application/json" } : {}
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    requestCount++;
    console.log(`[GEMINI REQUEST] Count: ${requestCount}`);

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No content in Gemini response');
    }

    const result = useJson ? JSON.parse(text) : text;
    
    // Cache successful response
    responseCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('[GEMINI ERROR]', error.message);
    throw error;
  }
};

/**
 * Clear Gemini cache
 */
const clearGeminiCache = () => {
  responseCache.flushAll();
  console.log('[GEMINI CACHE] Cleared');
};

module.exports = { callGemini, clearGeminiCache };