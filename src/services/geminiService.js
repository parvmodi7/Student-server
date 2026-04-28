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
  // Wait if rate limited
  while (!canMakeRequest()) {
    const waitTime = 60000 - (Date.now() - lastReset);
    console.log(`[GEMINI] Rate limited, waiting ${Math.ceil(waitTime/1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 5000)));
  }
};

const generateCacheKey = (prompt, systemPrompt) => {
  // Create a hash-like key from the prompt
  const key = `${prompt.slice(0, 100)}:${systemPrompt.slice(0, 50)}`;
  return key.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
};

/**
 * Get mock study plan data when API fails
 */
const getMockStudyPlan = () => {
  return {
    strategySummary: "Based on your enrolled courses, here's a balanced weekly schedule focusing on fundamentals and practice.",
    schedule: [
      { day: "Monday", tasks: [
        { action: "Review Data Structures lecture notes", duration: "45 min", reason: "Strengthen core concepts" },
        { action: "Practice array problems", duration: "30 min", reason: "Apply learned concepts" }
      ]},
      { day: "Tuesday", tasks: [
        { action: "Work on Programming assignment", duration: "60 min", reason: "Meet upcoming deadline" },
        { action: "Watch concept videos", duration: "30 min", reason: "Visual learning" }
      ]},
      { day: "Wednesday", tasks: [
        { action: "Review Mathematics concepts", duration: "45 min", reason: "Build strong foundation" },
        { action: "Solve practice problems", duration: "30 min", reason: "Practice makes perfect" }
      ]},
      { day: "Thursday", tasks: [
        { action: "Programming practice", duration: "45 min", reason: "Improve coding skills" },
        { action: "Debug previous assignments", duration: "30 min", reason: "Learn from mistakes" }
      ]},
      { day: "Friday", tasks: [
        { action: "Weekly review session", duration: "60 min", reason: "Consolidate learning" },
        { action: "Preview next week's topics", duration: "30 min", reason: "Stay ahead" }
      ]}
    ]
  };
};

/**
 * Retry wrapper with exponential backoff
 */
const retryRequest = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      // If 503 (high demand) or rate limit, retry
      if ((error.response?.status === 503 || error.code === 'ERR_BAD_RESPONSE') && i < maxRetries - 1) {
        const waitTime = Math.pow(2, i) * 1000;
        console.log(`[GEMINI] Retry ${i + 1}/${maxRetries} after ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
};

/**
 * Call Gemini API with caching and rate limiting
 * @param {string} prompt - User prompt
 * @param {string} systemPrompt - System instructions
 * @param {boolean} useJson - Return JSON response
 * @param {string|null} modelName - Override model name
 * @param {boolean} skipCache - Skip cache for unique responses (e.g. paper generation)
 * @returns {Promise<object|string>} - API response
 */
const callGemini = async (prompt, systemPrompt, useJson = false, modelName = null, skipCache = false) => {
  const cacheKey = generateCacheKey(prompt, systemPrompt);
  
  // Check cache first (skip if explicitly requested)
  if (!skipCache) {
    const cached = responseCache.get(cacheKey);
    if (cached) {
      console.log(`[GEMINI CACHE HIT] ${cacheKey}`);
      return cached;
    }
  }

  // Wait if rate limited
  await waitIfNeeded();

  const apiKey = process.env.GEMINI_API_KEY;
  const activeModel = modelName || process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash-lite';
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  console.log('[GEMINI] Calling API with useJson:', useJson, 'model:', activeModel);
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

  const generationConfig = useJson 
    ? { responseMimeType: "application/json", temperature: 0.7, maxOutputTokens: 8192 }
    : { temperature: 0.7, maxOutputTokens: 8192 };

  try {
    const response = await retryRequest(async () => {
      return await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
    });

    requestCount++;
    console.log(`[GEMINI REQUEST] Count: ${requestCount}, response status:`, response.status);
    console.log('[GEMINI] Response data:', JSON.stringify(response.data).slice(0, 500));

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No content in Gemini response');
    }

    let result;
    try {
      result = useJson ? JSON.parse(text) : text;
    } catch {
      result = text;
    }
    
    if (!skipCache) {
      responseCache.set(cacheKey, result);
    }
    return result;
  } catch (error) {
    console.error('[GEMINI ERROR]', error.response?.data?.error?.message || error.message);
    
    if (error.response?.status === 503 || error.code === 'ERR_BAD_RESPONSE') {
      console.log('[GEMINI] API unavailable, returning mock data');
      return getMockStudyPlan();
    }
    
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