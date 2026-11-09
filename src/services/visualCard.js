import sharp from 'sharp';

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function generateVisualCard({
  type = 'code',
  title = 'System Architecture & Backend Tip',
  codeSnippet = '',
  language = 'TypeScript',
  takeaways = [],
  authorName = 'Software Engineer',
  authorRole = 'Backend / Fullstack',
  isArabic = false
}) {
  const width = 1200;
  const height = 630;

  let contentSvg = '';

  if (type === 'code' && codeSnippet) {
    const rawLines = codeSnippet.split('\n').slice(0, 11);
    const codeLinesSvg = rawLines
      .map((line, idx) => {
        const escaped = escapeXml(line);
        const y = 210 + idx * 30;
        return `
          <text x="140" y="${y}" fill="#64748B" font-family="monospace" font-size="18">${idx + 1}</text>
          <text x="180" y="${y}" fill="#E2E8F0" font-family="monospace" font-size="19">${escaped}</text>
        `;
      })
      .join('\n');

    contentSvg = `
      <!-- Code Window Outer -->
      <rect x="90" y="130" width="1020" height="420" rx="16" fill="#0D1117" stroke="#30363D" stroke-width="2" />
      
      <!-- Window Title Bar -->
      <path d="M 90 146 A 16 16 0 0 1 106 130 L 1094 130 A 16 16 0 0 1 1110 146 L 1110 178 L 90 178 Z" fill="#161B22" />
      <circle cx="120" cy="154" r="7" fill="#FF5F56" />
      <circle cx="142" cy="154" r="7" fill="#FFBD2E" />
      <circle cx="164" cy="154" r="7" fill="#27C93F" />
      
      <!-- File/Language Badge -->
      <rect x="970" y="142" width="115" height="26" rx="6" fill="#21262D" />
      <text x="1027" y="160" text-anchor="middle" fill="#58A6FF" font-family="sans-serif" font-weight="600" font-size="13">${escapeXml(language.toUpperCase())}</text>
      
      <!-- Code Lines -->
      ${codeLinesSvg}
    `;
  } else {
    // Concept / Key Takeaways Card
    const defaultTakeaways = takeaways.length > 0 ? takeaways : [
      'Understand the bottleneck before scaling servers',
      'Optimize database queries & composite indexes first',
      'Use atomic primitives (Redis / DB Locks) for concurrency'
    ];

    const takeawayCardsSvg = defaultTakeaways.slice(0, 3).map((item, idx) => {
      const y = 220 + idx * 95;
      const num = idx + 1;
      return `
        <rect x="90" y="${y}" width="1020" height="78" rx="12" fill="#131B2E" stroke="#1E293B" stroke-width="1.5" />
        <rect x="110" y="${y + 16}" width="46" height="46" rx="10" fill="#2563EB" />
        <text x="133" y="${y + 45}" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-weight="bold" font-size="22">${num}</text>
        <text x="180" y="${y + 46}" fill="#F1F5F9" font-family="sans-serif" font-weight="500" font-size="20">${escapeXml(item)}</text>
      `;
    }).join('\n');

    contentSvg = `
      <!-- Takeaways List -->
      ${takeawayCardsSvg}
    `;
  }

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#080C15" />
          <stop offset="50%" stop-color="#0F172A" />
          <stop offset="100%" stop-color="#050811" />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3B82F6" />
          <stop offset="50%" stop-color="#60A5FA" />
          <stop offset="100%" stop-color="#06B6D4" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="60" result="blur" />
        </filter>
      </defs>

      <!-- Base Canvas Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

      <!-- Subtle Ambient Glow -->
      <circle cx="1100" cy="100" r="180" fill="#1D4ED8" opacity="0.22" filter="url(#glow)" />
      <circle cx="100" cy="550" r="150" fill="#0E7490" opacity="0.18" filter="url(#glow)" />

      <!-- Top Header Row -->
      <g transform="translate(90, 60)">
        <rect x="0" y="0" width="130" height="30" rx="8" fill="#1E293B" />
        <circle cx="15" cy="15" r="4" fill="#38BDF8" />
        <text x="70" y="20" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-weight="bold" font-size="12" letter-spacing="1.5">ENGINEERING</text>
        
        <text x="0" y="55" fill="#F8FAFC" font-family="sans-serif" font-weight="800" font-size="28">${escapeXml(title)}</text>
      </g>

      <!-- Center Dynamic Content (Code or Takeaways) -->
      ${contentSvg}

      <!-- Bottom Author & Brand Bar -->
      <line x1="90" y1="565" x2="1110" y2="565" stroke="#1E293B" stroke-width="1.5" />
      <g transform="translate(90, 580)">
        <!-- Author Avatar Placeholder Icon -->
        <circle cx="18" cy="16" r="16" fill="#2563EB" />
        <text x="18" y="22" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-weight="bold" font-size="14">${escapeXml(authorName.charAt(0))}</text>
        
        <text x="46" y="15" fill="#F1F5F9" font-family="sans-serif" font-weight="600" font-size="16">${escapeXml(authorName)}</text>
        <text x="46" y="32" fill="#64748B" font-family="sans-serif" font-weight="400" font-size="13">${escapeXml(authorRole)}</text>

        <!-- Accent Brand Badge -->
        <text x="1020" y="24" text-anchor="end" fill="url(#accentGrad)" font-family="sans-serif" font-weight="700" font-size="15">LinkedIn Engineering Series</text>
      </g>
    </svg>
  `;

  const pngBuffer = await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toBuffer();

  return pngBuffer;
}
