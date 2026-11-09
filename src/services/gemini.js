import { GoogleGenAI } from '@google/genai';
import { loadEnv, loadConfig, loadInspiration, loadPosts } from '../config.js';

function getGeminiClient() {
  const env = loadEnv();
  if (!env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

export async function generatePostWithGemini({ topic, language = 'EN', level = 'Mid' }) {
  const ai = getGeminiClient();
  const config = loadConfig();
  const inspiration = loadInspiration();
  const pastPosts = loadPosts().slice(-5);

  const profile = config.profile || {};
  const isArabic = language === 'AR';

  const systemInstruction = `
You are an expert Ghostwriter and Senior Software Engineer creating high-engagement LinkedIn posts for a tech professional.
The goal of each post is to attract Tech Recruiters, Engineering Managers, and Senior Engineers, establishing deep technical authority, architectural thinking, and high hireability.

AUTHOR PERSONA:
- Name: ${profile.name || 'Software Engineer'}
- Current Role: ${profile.currentRole || 'Backend & Fullstack Engineer'}
- Years of Experience: ${profile.yearsOfExperience || 'Junior to Mid-Senior'}
- Primary Tech Stack: ${profile.primaryTechStack || 'Node.js, PostgreSQL, Docker, Redis, Distributed Systems, Fullstack'}
- Target Role: Software Engineer / Backend / Fullstack
- Portfolio / GitHub: ${profile.githubUrl || 'https://github.com'}

WRITING RULES:
1. LANGUAGE: Write completely in ${isArabic ? 'Egyptian/Modern Standard Arabic (smooth Arabic with technical English terms in Latin letters like Database, Query, Redis, Cache, Async/Await)' : 'Clear, crisp American English'}. DO NOT mix languages awkwardly.
2. HOOK: The first 1-2 lines MUST be an irresistible hook (a counter-intuitive observation, a common mistake, or a real engineering battle-tested lesson). NO generic greetings like "Hello network" or "Today I want to talk about...".
3. PACING & FORMAT:
   - Use double line breaks between short 1-3 line paragraphs.
   - Use clean bullet points or numbered lists for readability.
   - Length: Strictly between 850 and 1300 characters.
4. TONE: Pragmatic, engineering-first, humble yet authoritative. Avoid corporate buzzwords, self-congratulatory brag, or generic AI fluff ("In the fast-paced world of technology...").
5. CALL TO ACTION: End with a specific thought-provoking technical question to trigger comments from senior developers.
6. HASHTAGS: Exactly 2 or 3 relevant hashtags at the very bottom (e.g., #softwareengineering #backend #systemdesign).
7. FIRST COMMENT: Generate a natural first comment that shares the author's GitHub / Portfolio / Project link with context so the main post has zero external links.
8. VISUAL CARD SPEC: Provide data for a visual technical card to accompany the post (either code snippet or 3 key takeaway bullet points).

REFERENCE INSPIRATION POSTS:
${inspiration || 'No past inspiration posts provided.'}

RECENT PAST POSTS FOR VOICE CONTINUITY:
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

  if (!ai) {
    // Graceful fallback mock if API key isn't provided yet
    return getFallbackDraft({ topic, language, level, profile });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
      topic
    };
  } catch (error) {
    console.error('Gemini generation error:', error);
    // Return fallback mock on error
    const fallback = getFallbackDraft({ topic, language, level, profile });
    return {
      ...fallback,
      warning: `Gemini API call failed: ${error.message}. Returned template preview.`
    };
  }
}

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
      firstCommentText: `لو حابب تشوف أمثلة عملية لمشاريع Backend و System Design بنيتها، تقدر تطلع على الـ GitHub بتاعي هنا: ${profile.githubUrl || 'https://github.com'}`,
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
  if (!ai) return { success: false, message: 'GEMINI_API_KEY is not set in .env' };
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Ping test. Reply with: OK',
    });
    return { success: true, message: 'Gemini connected successfully!', reply: response.text?.trim() };
  } catch (error) {
    return { success: false, message: error.message || 'Gemini connection failed' };
  }
}
