import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { loadEnv, loadConfig, loadInspiration, loadPosts } from '../config.js';

function getGeminiClient() {
  const env = loadEnv();
  if (!env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

function getOpenAIClient() {
  const env = loadEnv();
  if (!env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

export async function generatePostWithAI({ topic, language = 'EN', level = 'Mid' }) {
  const config = loadConfig();
  const env = loadEnv();
  const inspiration = loadInspiration();
  const pastPosts = loadPosts().slice(-5);
  const profile = config.profile || {};
  const isArabic = language === 'AR';

  const aiConfig = config.ai || { provider: 'gemini', geminiModel: 'gemini-2.5-pro', openaiModel: 'gpt-4o' };
  const provider = aiConfig.provider || 'gemini';

  const systemInstruction = `
You are an elite Ghostwriter and Principal Software Engineer creating viral, high-credibility LinkedIn posts for a tech professional.
The goal of each post is to command the attention of Tech Recruiters, Engineering Managers, and Staff Engineers, demonstrating deep technical maturity, architectural judgment, and hireability.

AUTHOR PERSONA:
- Name: ${profile.name || 'Software Engineer'}
- Current Role: ${profile.currentRole || 'Backend & Fullstack Engineer'}
- Years of Experience: ${profile.yearsOfExperience || 'Junior to Mid-Senior'}
- Primary Tech Stack: ${profile.primaryTechStack || 'Node.js, PostgreSQL, Docker, Redis, Distributed Systems, Clean Architecture'}
- Target Role: Backend / Fullstack Software Engineer
- Portfolio / GitHub: ${profile.githubUrl || 'https://github.com'}

WRITING RULES:
1. LANGUAGE: Write completely in ${isArabic ? 'Egyptian/Modern Standard Arabic (fluent, natural Arabic with technical industry terms in English like Database, Index, Connection Pool, Cache, Redis, Concurrency, Docker)' : 'Crisp, authoritative American English'}. DO NOT awkwardly mix languages.
2. HOOK: The first 1-2 lines MUST be an irresistible hook (a counter-intuitive insight, a common senior mistake, or a production battle scar). NEVER start with greetings like "Hello everyone" or "Today let's talk about...".
3. PACING & FORMAT:
   - Double line breaks between short, digestible paragraphs (1-3 lines max).
   - Use clean numbered lists or bullet points.
   - Post Length: Strictly between 900 and 1300 characters.
4. TONE: Pragmatic, engineering-first, humble yet authoritative. Avoid corporate buzzwords, self-congratulatory fluff, or generic AI summaries.
5. CALL TO ACTION: End with a specific thought-provoking technical question to trigger comments from senior developers.
6. HASHTAGS: Exactly 2 or 3 relevant hashtags at the very bottom (e.g., #softwareengineering #backend #systemdesign).
7. FIRST COMMENT: A short, natural comment sharing the author's GitHub / Portfolio project link with context.
8. VISUAL CARD SPEC: Provide data for a visual technical card to accompany the post (either a code snippet or 3 key takeaway bullet points).

REFERENCE INSPIRATION POSTS:
${inspiration || 'No past inspiration posts provided.'}

RECENT PAST POSTS FOR CONTINUITY:
${JSON.stringify(pastPosts.map(p => ({ topic: p.topic, hook: p.hook })), null, 2)}
`;

  const userPrompt = `
Generate a LinkedIn post about this topic:
Topic: "${topic}"
Technical Target Level: ${level}
Target Language: ${isArabic ? 'Arabic (العربية مع الحفاظ على المصطلحات التقنية بالإنجليزية)' : 'English'}

You MUST respond strictly in valid JSON matching this schema:
{
  "hook": "The first 1-2 lines of the post",
  "postText": "The complete full post text including hook, body, CTA question, and 2-3 hashtags",
  "firstCommentText": "The first comment text with portfolio/github reference",
  "charCount": 1100,
  "visualCard": {
    "type": "code" or "takeaways",
    "title": "Short punchy card title (max 5 words)",
    "language": "typescript / sql / bash / javascript",
    "codeSnippet": "6-10 lines of realistic code snippet (if type is code, else empty string)",
    "takeaways": ["Takeaway 1 (max 8 words)", "Takeaway 2 (max 8 words)", "Takeaway 3 (max 8 words)"]
  }
}
`;

  // Path A: OpenAI ChatGPT
  if (provider === 'openai') {
    const openai = getOpenAIClient();
    if (!openai) {
      console.warn('[AI] OPENAI_API_KEY is missing. Using template fallback.');
      return getFallbackDraft({ topic, language, level, profile });
    }

    try {
      const model = aiConfig.openaiModel || 'gpt-4o';
      console.log(`[AI] Generating post with OpenAI model: ${model}`);
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });

      const parsed = JSON.parse(completion.choices[0].message.content.trim());
      return {
        success: true,
        ...parsed,
        language,
        topic,
        modelUsed: `OpenAI ${model}`
      };
    } catch (error) {
      console.error('OpenAI generation error:', error);
      const fallback = getFallbackDraft({ topic, language, level, profile });
      return {
        ...fallback,
        warning: `OpenAI API call failed: ${error.message}. Returned template preview.`
      };
    }
  }

  // Path B: Google Gemini
  const ai = getGeminiClient();
  if (!ai) {
    console.warn('[AI] GEMINI_API_KEY is missing. Using template fallback.');
    return getFallbackDraft({ topic, language, level, profile });
  }

  try {
    const model = aiConfig.geminiModel || 'gemini-2.5-pro';
    console.log(`[AI] Generating post with Gemini model: ${model}`);
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text.trim());
    return {
      success: true,
      ...parsed,
      language,
      topic,
      modelUsed: `Gemini ${model}`
    };
  } catch (error) {
    console.error('Gemini generation error:', error);
    const fallback = getFallbackDraft({ topic, language, level, profile });
    return {
      ...fallback,
      warning: `Gemini API call failed: ${error.message}. Returned template preview.`
    };
  }
}

// Backward-compatible alias
export const generatePostWithGemini = generatePostWithAI;

function getFallbackDraft({ topic, language, level, profile }) {
  const isArabic = language === 'AR';
  if (isArabic) {
    return {
      success: true,
      isMock: true,
      topic,
      language: 'AR',
      hook: 'أغلب المشاكل في الـ Backend مش بتتحل بسيرفرات أكبر، بتتحل بكود أحسن.',
      postText: `أغلب المشاكل في الـ Backend مش بتتحل بسيرفرات أكبر، بتتحل بكود أحسن.

أول ما الـ API يبدأ يستجيب ببطء مع ضغط الترافيك، أول حل بيخطر على البال: "نزود RAM أو نعمل Horizontal Scaling لسيرفرات جديدة".

بس لما تعمل Profiling حقيقي، بتكتشف 3 أسباب شائعة:

1. الـ N+1 Query Problem:
بدل ما تجيب البيانات بـ JOIN أو بـ Query واحد، الـ ORM بيبعت 150 استعلام للـ Database في كل Request.

2. غياب الـ Composite Indexes:
فلترة على أكتر من حقل بدون فهرس مركب بتجبر الـ Database تعمل Full Table Scan على ملايين السجلات.

3. غياب الـ Connection Pooling المناسب:
كل Request بيحاول يفتح TCP Connection جديد للـ Database بدل ما يستغل الـ Pool المفتوح مسبقاً.

الحل مش دائماً إنك تدفع أكتر لـ AWS أو Azure.
الحل إنك تفهم الـ Bottleneck الحقيقي وتعالجه في الكود والـ Database أولاً.

إيه أغرب Performance Bug حليته وكان سببه استعلام بسيط في الـ DB؟

#backend #softwareengineering #databases`,
      firstCommentText: `لو حابب تشوف مشاريع عملية بنيتها في الـ Backend و System Design، تصفح الـ GitHub بتاعي هنا: ${profile.githubUrl || 'https://github.com'}`,
      charCount: 980,
      visualCard: {
        type: 'takeaways',
        title: 'Backend Scaling Bottlenecks',
        language: 'sql',
        codeSnippet: '',
        takeaways: [
          'Fix N+1 queries before scaling instances',
          'Add composite indexes for compound filters',
          'Tune database connection pool limits'
        ]
      }
    };
  } else {
    return {
      success: true,
      isMock: true,
      topic,
      language: 'EN',
      hook: 'Most junior developers think Redis is just for caching.',
      postText: `Most junior developers think Redis is just for caching.

Here is how experienced backend engineers actually leverage it:

1. Distributed Locks (Redlock)
Preventing two background workers from charging the same credit card or modifying inventory simultaneously.

2. Sliding Window Rate Limiting
Protecting critical endpoints using atomic ZADD and ZREMRANGEBYSCORE.

3. Ephemeral Idempotency Keys
Storing deduplication tokens with a 120-second TTL to safely ignore duplicate network retries.

4. Pub/Sub & Lightweight Task Buffers
Handling high-throughput messaging before needing the operational overhead of Kafka.

Caching key-value pairs is merely 10% of Redis's power.
The real superpower is atomic, in-memory concurrency primitives.

What is your most non-standard use case for Redis in production?

#backend #systemdesign #softwareengineering`,
      firstCommentText: `Check out full architectural implementations and benchmarks on my GitHub: ${profile.githubUrl || 'https://github.com'}`,
      charCount: 950,
      visualCard: {
        type: 'code',
        title: 'Redis Distributed Locking',
        language: 'typescript',
        codeSnippet: `// Acquire atomic distributed lock with 5s TTL
const acquired = await redis.set(
  \`lock:\${resourceId}\`,
  workerId,
  'NX',
  'PX',
  5000
);

if (!acquired) {
  throw new ConcurrencyConflictError();
}

try {
  await processPayment(resourceId);
} finally {
  await releaseLock(resourceId, workerId);
}`,
        takeaways: []
      }
    };
  }
}

export async function testGeminiConnection() {
  const ai = getGeminiClient();
  const config = loadConfig();
  const model = config.ai?.geminiModel || 'gemini-2.5-pro';
  if (!ai) return { success: false, message: 'GEMINI_API_KEY is not set in .env' };
  try {
    const response = await ai.models.generateContent({
      model,
      contents: 'Ping test. Reply with: OK',
    });
    return { success: true, message: `Connected to Gemini (${model})!`, reply: response.text?.trim() };
  } catch (error) {
    return { success: false, message: error.message || 'Gemini connection failed' };
  }
}

export async function testOpenAIConnection() {
  const openai = getOpenAIClient();
  const config = loadConfig();
  const model = config.ai?.openaiModel || 'gpt-4o';
  if (!openai) return { success: false, message: 'OPENAI_API_KEY is not set in .env' };
  try {
    const completion = await openai.chat.completions.create({
      model: model.startsWith('o') ? model : 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Ping test. Reply with: OK' }],
      max_tokens: 10
    });
    return {
      success: true,
      message: `Connected to OpenAI (${model})!`,
      reply: completion.choices[0].message.content.trim()
    };
  } catch (error) {
    return { success: false, message: error.message || 'OpenAI connection failed' };
  }
}
