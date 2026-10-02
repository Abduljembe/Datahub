import { Dataset, ColumnMeta } from '../types';

export interface QualitativeTheme {
  id: string;
  name: string;
  description: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  prevalencePct: number;
  count: number;
  exampleQuotes: string[];
}

export interface QualitativeSentimentSummary {
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  mixedPct: number;
  dominantEmotion: string;
  emotionBreakdown: { emotion: string; count: number; percentage: number }[];
}

export interface WordFrequency {
  text: string;
  value: number;
}

export interface NGramFrequency {
  phrase: string;
  count: number;
}

export interface CodedTextResponse {
  rowIndex: number;
  originalText: string;
  wordCount: number;
  characterCount: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentimentScore: number; // -1.0 to 1.0
  dominantEmotion: string;
  assignedThemes: string[];
  isNonSubstantive: boolean;
  nonSubstantiveReason?: string;
  isGibberish: boolean;
}

export interface QualitativeReport {
  columnName: string;
  totalResponsesAudited: number;
  substantiveResponsesCount: number;
  nonSubstantiveCount: number;
  avgWordCount: number;
  avgCharCount: number;
  themes: QualitativeTheme[];
  sentiment: QualitativeSentimentSummary;
  topWords: WordFrequency[];
  topBigrams: NGramFrequency[];
  topTrigrams: NGramFrequency[];
  codedResponses: CodedTextResponse[];
  executiveSummary: string;
  keyInsights: string[];
  recommendedActions: string[];
  isAiGenerated: boolean;
  modelUsed?: string;
  analyzedAt: string;
}

// Stop words for NLP tokenization
export const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can\'t', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he',
  'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its',
  'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t',
  'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d',
  'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
  'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t',
  'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
  'also', 'just', 'like', 'get', 'got', 'even', 'really', 'much', 'many', 'well', 'would', 'could', 'said'
]);

// Non-substantive / placeholder phrase patterns
const NON_SUBSTANTIVE_EXACT = new Set([
  'none', 'n/a', 'na', 'no', 'nope', 'idk', 'nothing', 'not sure', 'null', 'nil',
  'no comment', 'dont know', 'don\'t know', 'cant say', 'can\'t say', 'asdf', 'test',
  'everything', 'ok', 'okay', 'good', 'fine', 'yes', 'sure', 'whatever', 'same', 'nil'
]);

// Positive & Negative lexicons for heuristic sentiment
const POSITIVE_LEXICON = new Set([
  'great', 'good', 'excellent', 'amazing', 'love', 'loved', 'awesome', 'fantastic', 'easy', 'helpful',
  'fast', 'smooth', 'intuitive', 'clear', 'best', 'wonderful', 'perfect', 'satisfied', 'pleased', 'enjoy',
  'enjoyed', 'super', 'impressive', 'friendly', 'reliable', 'quick', 'efficient', 'outstanding', 'valuable'
]);

const NEGATIVE_LEXICON = new Set([
  'bad', 'terrible', 'horrible', 'poor', 'hate', 'hated', 'slow', 'difficult', 'confusing', 'frustrated',
  'frustrating', 'annoying', 'broken', 'buggy', 'crash', 'crashes', 'expensive', 'useless', 'unhelpful',
  'worst', 'disappointed', 'disappointing', 'clunky', 'delayed', 'error', 'failed', 'complicated', 'hard',
  'issue', 'problem', 'issues', 'problems'
]);

/**
 * Identify all qualitative text columns in a dataset
 */
export function detectQualitativeColumns(dataset: Dataset): ColumnMeta[] {
  if (!dataset || !dataset.columns) return [];

  const textKeywords = ['feedback', 'comment', 'review', 'notes', 'interview', 'transcript', 'quote', 'response', 'reason', 'description', 'detail', 'opinion', 'observation', 'summary', 'message', 'text'];

  return dataset.columns.filter(col => {
    // Check type
    if (col.type !== 'string' && (col.type as any) !== 'text') return false;

    // Check name keyword hint
    const colNameLower = col.name.toLowerCase();
    const hasKeyword = textKeywords.some(kw => colNameLower.includes(kw));

    // Sample data to inspect average string length and word count
    const values = dataset.data
      .map(r => r[col.name])
      .filter(v => typeof v === 'string' && v.trim().length > 0) as string[];

    if (values.length === 0) return hasKeyword;

    const avgLength = values.reduce((sum, v) => sum + v.length, 0) / values.length;
    const avgWords = values.reduce((sum, v) => sum + v.trim().split(/\s+/).length, 0) / values.length;

    // A column is qualitative if it has narrative length (> 2 words on average) or matching name
    return avgWords >= 2.5 || avgLength >= 20 || hasKeyword;
  });
}

/**
 * Test if a string is non-substantive or gibberish
 */
export function checkNonSubstantive(text: string): { isNonSubstantive: boolean; isGibberish: boolean; reason?: string } {
  if (!text || typeof text !== 'string') {
    return { isNonSubstantive: true, isGibberish: false, reason: 'Empty response' };
  }

  const trimmed = text.trim().toLowerCase();

  if (trimmed.length === 0) {
    return { isNonSubstantive: true, isGibberish: false, reason: 'Empty string' };
  }

  // Exact match check
  if (NON_SUBSTANTIVE_EXACT.has(trimmed) || NON_SUBSTANTIVE_EXACT.has(trimmed.replace(/[^a-z]/g, ''))) {
    return { isNonSubstantive: true, isGibberish: false, reason: `Placeholder answer ("${text}")` };
  }

  // Repeated single character (e.g. "aaaaa", ".....", "?????")
  if (/^(.)\1{3,}$/.test(trimmed)) {
    return { isNonSubstantive: true, isGibberish: true, reason: 'Repeated characters' };
  }

  // Keyboard mash check (e.g. "asdfghjkl", "qwertyuiop", "zxcvbnm")
  if (/^(asdf|qwerty|zxcv|1234)/i.test(trimmed) && trimmed.length > 5 && !trimmed.includes(' ')) {
    return { isNonSubstantive: true, isGibberish: true, reason: 'Keyboard mash pattern' };
  }

  // Extremely short response without meaningful content
  if (trimmed.length < 3 && !/^(ok|no|hi)$/i.test(trimmed)) {
    return { isNonSubstantive: true, isGibberish: false, reason: 'Below minimum length' };
  }

  return { isNonSubstantive: false, isGibberish: false };
}

/**
 * Score sentiment and emotion of a single text string
 */
export function scoreTextSentiment(text: string): {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  score: number;
  dominantEmotion: string;
} {
  const tokens = text.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
  if (tokens.length === 0) {
    return { sentiment: 'neutral', score: 0, dominantEmotion: 'Neutral' };
  }

  let posCount = 0;
  let negCount = 0;

  tokens.forEach(tok => {
    if (POSITIVE_LEXICON.has(tok)) posCount++;
    if (NEGATIVE_LEXICON.has(tok)) negCount++;
  });

  const total = posCount + negCount;
  if (total === 0) {
    return { sentiment: 'neutral', score: 0, dominantEmotion: 'Neutral' };
  }

  const score = (posCount - negCount) / total;

  let sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' = 'neutral';
  let dominantEmotion = 'Neutral';

  if (posCount > 0 && negCount > 0) {
    sentiment = 'mixed';
    dominantEmotion = 'Constructive / Mixed';
  } else if (score >= 0.3) {
    sentiment = 'positive';
    dominantEmotion = posCount >= 2 ? 'Joy / Delight' : 'Satisfaction';
  } else if (score <= -0.3) {
    sentiment = 'negative';
    dominantEmotion = negCount >= 2 ? 'Frustration / Friction' : 'Disappointment';
  } else {
    sentiment = 'neutral';
    dominantEmotion = 'Objective Observation';
  }

  return { sentiment, score, dominantEmotion };
}

/**
 * Extract word frequency and n-grams
 */
export function extractTextFrequencies(texts: string[]): {
  topWords: WordFrequency[];
  topBigrams: NGramFrequency[];
  topTrigrams: NGramFrequency[];
} {
  const wordMap: Record<string, number> = {};
  const bigramMap: Record<string, number> = {};
  const trigramMap: Record<string, number> = {};

  texts.forEach(raw => {
    if (!raw || typeof raw !== 'string') return;
    const cleanTokens = (raw.toLowerCase().match(/\b[a-z]{3,}\b/g) || []).filter(t => !STOP_WORDS.has(t));

    // Single words
    cleanTokens.forEach(word => {
      wordMap[word] = (wordMap[word] || 0) + 1;
    });

    // Bigrams
    for (let i = 0; i < cleanTokens.length - 1; i++) {
      const phrase = `${cleanTokens[i]} ${cleanTokens[i + 1]}`;
      bigramMap[phrase] = (bigramMap[phrase] || 0) + 1;
    }

    // Trigrams
    for (let i = 0; i < cleanTokens.length - 2; i++) {
      const phrase = `${cleanTokens[i]} ${cleanTokens[i + 1]} ${cleanTokens[i + 2]}`;
      trigramMap[phrase] = (trigramMap[phrase] || 0) + 1;
    }
  });

  const topWords: WordFrequency[] = Object.entries(wordMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 35)
    .map(([text, value]) => ({ text, value }));

  const topBigrams: NGramFrequency[] = Object.entries(bigramMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([phrase, count]) => ({ phrase, count }));

  const topTrigrams: NGramFrequency[] = Object.entries(trigramMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase, count]) => ({ phrase, count }));

  return { topWords, topBigrams, topTrigrams };
}

/**
 * Run heuristic qualitative synthesis locally
 */
export function buildHeuristicQualitativeReport(
  dataset: Dataset,
  columnName: string,
  researchGoal?: string
): QualitativeReport {
  const rows = dataset.data;
  const rawValues = rows.map((r, idx) => ({ text: String(r[columnName] ?? ''), rowIndex: idx }));
  const nonEmpties = rawValues.filter(v => v.text.trim().length > 0);

  let substantiveCount = 0;
  let nonSubstantiveCount = 0;
  let totalWords = 0;
  let totalChars = 0;

  let posCount = 0;
  let neuCount = 0;
  let negCount = 0;
  let mixedCount = 0;

  const emotionCounts: Record<string, number> = {};

  const codedResponses: CodedTextResponse[] = nonEmpties.map(({ text, rowIndex }) => {
    const check = checkNonSubstantive(text);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;

    totalWords += words;
    totalChars += chars;

    if (check.isNonSubstantive) {
      nonSubstantiveCount++;
    } else {
      substantiveCount++;
    }

    const { sentiment, score, dominantEmotion } = scoreTextSentiment(text);

    if (sentiment === 'positive') posCount++;
    else if (sentiment === 'negative') negCount++;
    else if (sentiment === 'mixed') mixedCount++;
    else neuCount++;

    emotionCounts[dominantEmotion] = (emotionCounts[dominantEmotion] || 0) + 1;

    return {
      rowIndex,
      originalText: text,
      wordCount: words,
      characterCount: chars,
      sentiment,
      sentimentScore: score,
      dominantEmotion,
      assignedThemes: [],
      isNonSubstantive: check.isNonSubstantive,
      nonSubstantiveReason: check.reason,
      isGibberish: check.isGibberish,
    };
  });

  const totalAudited = nonEmpties.length;
  const avgWordCount = totalAudited > 0 ? Math.round((totalWords / totalAudited) * 10) / 10 : 0;
  const avgCharCount = totalAudited > 0 ? Math.round(totalChars / totalAudited) : 0;

  const validCount = Math.max(totalAudited, 1);
  const positivePct = Math.round((posCount / validCount) * 100);
  const neutralPct = Math.round((neuCount / validCount) * 100);
  const negativePct = Math.round((negCount / validCount) * 100);
  const mixedPct = Math.round((mixedCount / validCount) * 100);

  // Extract words and n-grams
  const substantiveTexts = codedResponses.filter(c => !c.isNonSubstantive).map(c => c.originalText);
  const { topWords, topBigrams, topTrigrams } = extractTextFrequencies(substantiveTexts);

  // Identify heuristic themes from top words & n-grams
  const themes: QualitativeTheme[] = [];
  const topSeeds = topBigrams.slice(0, 4).concat(topTrigrams.slice(0, 2));

  topSeeds.forEach((seed, idx) => {
    const matching = codedResponses.filter(c => c.originalText.toLowerCase().includes(seed.phrase));
    if (matching.length >= 2) {
      const pos = matching.filter(m => m.sentiment === 'positive').length;
      const neg = matching.filter(m => m.sentiment === 'negative').length;
      const themeSentiment: 'positive' | 'neutral' | 'negative' | 'mixed' =
        pos > neg ? 'positive' : neg > pos ? 'negative' : 'neutral';

      themes.push({
        id: `theme_${idx + 1}`,
        name: seed.phrase.charAt(0).toUpperCase() + seed.phrase.slice(1),
        description: `Recurring pattern identified in responses mentioning "${seed.phrase}".`,
        sentiment: themeSentiment,
        count: matching.length,
        prevalencePct: Math.round((matching.length / validCount) * 100),
        exampleQuotes: matching.slice(0, 3).map(m => m.originalText),
      });

      matching.forEach(m => {
        if (!m.assignedThemes.includes(seed.phrase)) {
          m.assignedThemes.push(seed.phrase);
        }
      });
    }
  });

  // If no bigrams matched well, create top-word themes
  if (themes.length === 0 && topWords.length > 0) {
    topWords.slice(0, 3).forEach((word, idx) => {
      const matching = codedResponses.filter(c => c.originalText.toLowerCase().includes(word.text));
      themes.push({
        id: `theme_word_${idx + 1}`,
        name: `Topic: ${word.text.toUpperCase()}`,
        description: `High-frequency mention of "${word.text}" across responses.`,
        sentiment: 'neutral',
        count: matching.length,
        prevalencePct: Math.round((matching.length / validCount) * 100),
        exampleQuotes: matching.slice(0, 2).map(m => m.originalText),
      });
    });
  }

  // Emotion breakdown
  const emotionBreakdown = Object.entries(emotionCounts).map(([emotion, count]) => ({
    emotion,
    count,
    percentage: Math.round((count / validCount) * 100),
  })).sort((a, b) => b.count - a.count);

  const dominantEmotion = emotionBreakdown[0]?.emotion || 'Neutral';

  const executiveSummary = `Qualitative audit of column '${columnName}' across ${totalAudited} responses (${substantiveCount} substantive, ${nonSubstantiveCount} placeholder/low-quality). Sentiment is ${positivePct}% positive, ${negativePct}% negative, and ${neutralPct}% neutral with '${dominantEmotion}' as the primary emotional posture. Core themes center around ${themes.map(t => `"${t.name}"`).join(', ') || 'general feedback'}.`;

  const keyInsights = [
    `${substantiveCount} of ${totalAudited} responses (${Math.round((substantiveCount / validCount) * 100)}%) contain substantive narrative content with an average length of ${avgWordCount} words.`,
    nonSubstantiveCount > 0
      ? `Found ${nonSubstantiveCount} non-substantive or placeholder responses ("none", "n/a", "idk") that can be filtered to preserve qualitative rigor.`
      : 'All collected responses demonstrate high semantic completeness with no placeholder dropouts.',
    themes.length > 0
      ? `Primary emergent topic: "${themes[0]?.name}" (${themes[0]?.prevalencePct}% prevalence) with predominantly ${themes[0]?.sentiment} tone.`
      : 'Responses exhibit high lexical diversity without a single concentrated theme.',
    `Emotional posture: ${dominantEmotion} represents ${emotionBreakdown[0]?.percentage || 0}% of all expressions.`
  ];

  const recommendedActions = [
    nonSubstantiveCount > 0
      ? `Filter out the ${nonSubstantiveCount} placeholder/non-substantive entries using the Qualitative Cleaner to clean narrative reports.`
      : 'Preserve complete response verbatims for executive presentation decks.',
    themes.length > 0
      ? `Conduct deeper cohort analysis on "${themes[0]?.name}" to isolate specific underlying drivers.`
      : 'Apply structured qualitative coding categories to upcoming survey cycles.',
    'Export the generated Qualitative Codebook to share qualitative findings with research and product stakeholders.'
  ];

  return {
    columnName,
    totalResponsesAudited: totalAudited,
    substantiveResponsesCount: substantiveCount,
    nonSubstantiveCount,
    avgWordCount,
    avgCharCount,
    themes,
    sentiment: {
      positivePct,
      neutralPct,
      negativePct,
      mixedPct,
      dominantEmotion,
      emotionBreakdown,
    },
    topWords,
    topBigrams,
    topTrigrams,
    codedResponses,
    executiveSummary,
    keyInsights,
    recommendedActions,
    isAiGenerated: false,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Fetch Deep Gemini AI Qualitative Synthesis with robust server fallback
 */
export async function fetchGeminiQualitativeAudit(
  dataset: Dataset,
  columnName: string,
  researchGoal?: string
): Promise<QualitativeReport> {
  const localReport = buildHeuristicQualitativeReport(dataset, columnName, researchGoal);

  // Grab substantive text samples (up to 75)
  const samples = localReport.codedResponses
    .filter(c => !c.isNonSubstantive)
    .slice(0, 75)
    .map(c => c.originalText);

  if (samples.length === 0) {
    return localReport;
  }

  try {
    const response = await fetch('/api/gemini/qualitative-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        columnName,
        textSamples: samples,
        customResearchGoal: researchGoal,
        baselineStats: {
          totalResponses: localReport.totalResponsesAudited,
          avgWordCount: localReport.avgWordCount,
          substantiveCount: localReport.substantiveResponsesCount,
        }
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result && result.themes && result.executiveSummary) {
        return {
          ...localReport,
          themes: result.themes.map((t: any, idx: number) => ({
            id: t.id || `ai_theme_${idx + 1}`,
            name: t.name,
            description: t.description,
            sentiment: t.sentiment || 'neutral',
            prevalencePct: t.prevalencePct || 25,
            count: Math.round((t.prevalencePct || 25) * localReport.substantiveResponsesCount / 100),
            exampleQuotes: Array.isArray(t.exampleQuotes) ? t.exampleQuotes : [],
          })),
          executiveSummary: result.executiveSummary,
          keyInsights: Array.isArray(result.keyInsights) && result.keyInsights.length > 0 ? result.keyInsights : localReport.keyInsights,
          recommendedActions: Array.isArray(result.recommendedActions) && result.recommendedActions.length > 0 ? result.recommendedActions : localReport.recommendedActions,
          isAiGenerated: true,
          modelUsed: result.modelUsed || 'gemini-3.8-flash',
        };
      }
    }
  } catch (err) {
    console.warn('Gemini Qualitative API unavailable, using embedded engine:', err);
  }

  return localReport;
}
