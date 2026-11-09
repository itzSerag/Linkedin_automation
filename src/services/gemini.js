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
  const style = config.style || {};
  const isArabic = language === 'AR';

  const aiConfig = config.ai || { provider: 'gemini', geminiModel: 'gemini-2.5-pro', openaiModel: 'gpt-4o' };
  const provider = aiConfig.provider || 'gemini';

  const endingStyle = style.endingStyle || 'strong_conclusion';
  const includeGithub = style.includeGithubInComment === true;

  let endingRule = '';
  if (endingStyle === 'strong_conclusion') {
    endingRule = `DO NOT end with a question! Do NOT ask "What do you think?", "Thoughts?", or "Drop your thoughts below". Instead, conclude with a memorable, sharp, opinionated engineering takeaway or golden principle (e.g., "The best architecture is the one that prevents bugs before you even write tests."). Senior engineers state strong conclusions rather than begging for comments.`;
  } else if (endingStyle === 'question') {
    endingRule = `End with a specific, thought-provoking technical trade-off question addressed to senior developers.`;
  } else {
    endingRule = `Either end with a sharp opinionated engineering conclusion OR a deep technical trade-off question.`;
  }

  let commentRule = '';
  if (includeGithub && profile.githubUrl) {
    commentRule = `Generate a concise, natural first comment with context linking to the author's GitHub/portfolio: "${profile.githubUrl}".`;
  } else {
    commentRule = `DO NOT include any GitHub, portfolio, or external links in the first comment! Leave firstCommentText as "" (empty string) or a tiny 1-line technical afterthought.`;
  }

  const languageRule = isArabic
    ? `CRITICAL ARABIC & TERMINOLOGY RULES:
1. Write in natural, modern professional Arabic spoken among top tech engineers in Egypt and the Gulf.
2. MANDATORY: ALL technical terms, architectural concepts, tool names, databases, metrics, protocols, and keywords MUST BE IN ENGLISH with Latin letters (e.g. "PostgreSQL", "Redis", "Connection Pool", "Index", "Composite Index", "Race Condition", "Locking", "Deadlock", "Query", "ORM", "Heap", "Async/Await", "Docker", "Cache", "Latency", "Throughput").
3. NEVER translate technical concepts into awkward Arabic (do NOT say "حوض اتصالات" or "فهرس مركب", write "Connection Pool" and "Composite Index").
4. Sound 100% human: write like a real senior engineer sharing a hard-earned lesson from production.`
    : `CRITICAL ENGLISH RULES:
1. Write in authentic, crisp American English.
2. Sound like a real engineer writing notes after a real debugging session or system refactor.
3. BAN AI CLICHÉS: NEVER use buzzwords like "delve", "testament", "revolutionize", "game-changer", "tapestry", "landscape", "in conclusion", "vital", "in today's fast-paced world".`;

  const systemInstruction = `
You are an authentic Senior Software Engineer writing personal, high-credibility LinkedIn posts.
The goal of each post is to command the respect of Tech Recruiters, Engineering Managers, and Staff Engineers, demonstrating deep technical maturity, architectural judgment, and high hireability.

AUTHOR PERSONA:
- Name: ${profile.name || 'Software Engineer'}
- Current Role: ${profile.currentRole || 'Backend & Fullstack Engineer'}
- Years of Experience: ${profile.yearsOfExperience || 'Junior to Mid-Senior'}
- Primary Tech Stack: ${profile.primaryTechStack || 'Node.js, PostgreSQL, Docker, Redis, Distributed Systems, Clean Architecture'}
- Target Role: Backend / Fullstack Software Engineer

HUMAN WRITING PRINCIPLES:
1. ${languageRule}
2. HOOK: The first 1-2 lines MUST be an irresistible observation (a counter-intuitive reality, a common senior mistake, or a production battle scar). NEVER start with greetings like "Hello everyone" or "Today let's talk about...".
3. PACING & FORMAT:
   - Double line breaks between short, digestible paragraphs (1-3 lines max).
   - Use clean numbered lists or bullet points.
   - Post Length: Strictly between ${style.targetCharMin || 850} and ${style.targetCharMax || 1300} characters.
4. TONE: Pragmatic, engineering-first, humble yet authoritative. Avoid corporate buzzwords, self-congratulatory brag, or generic AI summaries.
5. ${endingRule}
6. HASHTAGS: Exactly 2 or 3 relevant hashtags at the very bottom (e.g., #softwareengineering #backend #systemdesign).
7. ${commentRule}
8. VISUAL CARD SPEC: Provide data for a modern technical visual card. Pick the best format for the topic: 'code' (if showing a real 6-8 line snippet), 'benchmark' (if comparing Before/Bottleneck vs After/Optimized), or 'takeaways' (3 high-impact architectural principles). All visualCard text, titles, snippets, and takeaways MUST be in English Latin letters even if the post body is Arabic.

REFERENCE INSPIRATION POSTS:
${inspiration || 'No past inspiration posts provided.'}

RECENT PAST POSTS FOR CONTINUITY:
${JSON.stringify(pastPosts.map(p => ({ topic: p.topic, hook: p.hook })), null, 2)}
`;

  const userPrompt = `
Generate a LinkedIn post about this topic:
Topic: "${topic}"
Technical Target Level: ${level}
Target Language: ${isArabic ? 'Arabic (مع الحفاظ الكامل على كافة المصطلحات التقنية بالحروف الإنجليزية)' : 'English'}

You MUST respond strictly in valid JSON matching this schema:
{
  "hook": "The first 1-2 lines of the post",
  "postText": "The complete full post text including hook, body, conclusion, and 2-3 hashtags",
  "firstCommentText": "The first comment text (empty string if no link requested)",
  "charCount": 1100,
  "visualCard": {
    "type": "code" or "takeaways" or "benchmark",
    "theme": "indigo" or "emerald" or "violet" or "amber" or "cyan",
    "title": "Short punchy card title (max 5 words, in English)",
    "subtitle": "Short punchy subtitle or core question (max 8 words, in English)",
    "language": "typescript / sql / bash / javascript",
    "codeSnippet": "6-10 lines of realistic code snippet (if type is code, else empty string)",
    "takeaways": [
      { "tag": "ROOT CAUSE", "text": "Core insight (max 8 words)", "detail": "Context or impact (max 10 words)" },
      { "tag": "SYSTEM FIX", "text": "Core insight (max 8 words)", "detail": "Context or impact (max 10 words)" },
      { "tag": "GOLDEN RULE", "text": "Core insight (max 8 words)", "detail": "Context or impact (max 10 words)" }
    ],
    "comparison": {
      "beforeLabel": "Naive / Bottleneck",
      "beforeText": "Sequential Full Table Scan blocking event loop threads",
      "afterLabel": "Optimized Architecture",
      "afterText": "Composite B-Tree Index with constant memory consumption",
      "metric": "99.4% Latency Reduction (1,450ms -> 4ms)"
    }
  }
}
`;

  // Path A: OpenAI ChatGPT
  if (provider === 'openai') {
    const openai = getOpenAIClient();
    if (!openai) {
      console.warn('[AI] OPENAI_API_KEY is missing. Using template fallback.');
      return getFallbackDraft({ topic, language, level, profile, style });
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
      const fallback = getFallbackDraft({ topic, language, level, profile, style });
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
    return getFallbackDraft({ topic, language, level, profile, style });
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
    const fallback = getFallbackDraft({ topic, language, level, profile, style });
    return {
      ...fallback,
      warning: `Gemini API call failed: ${error.message}. Returned template preview.`
    };
  }
}

// Backward-compatible alias
export const generatePostWithGemini = generatePostWithAI;

function getFallbackDraft({ topic, language, level, profile, style = {} }) {
  const isArabic = language === 'AR';
  const endingStyle = style.endingStyle || 'strong_conclusion';
  const includeGithub = style.includeGithubInComment === true;

  if (isArabic) {
    const ending = endingStyle === 'strong_conclusion'
      ? 'الحل مش دائماً إنك تدفع أكتر لـ AWS. الحل إنك تفهم الـ Bottleneck الحقيقي وتعالجه في الـ Code والـ Database أولاً.'
      : 'إيه أكتر Performance Bottleneck قابلته في شغلك وكان حله مجرد سطر واحد؟';

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

${ending}

#backend #softwareengineering #databases`,
      firstCommentText: includeGithub && profile.githubUrl ? `لو حابب تشوف مشاريع عملية بنيتها، تصفح الـ GitHub بتاعي هنا: ${profile.githubUrl}` : '',
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
    const ending = endingStyle === 'strong_conclusion'
      ? 'Writing clean, atomic primitives will always scale better than throwing hardware at concurrency bugs.'
      : 'What is your most non-standard use case for Redis in production?';

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

${ending}

#backend #systemdesign #softwareengineering`,
      firstCommentText: includeGithub && profile.githubUrl ? `Check out full architectural implementations on my GitHub: ${profile.githubUrl}` : '',
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
