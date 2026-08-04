/**
 * scripture-formatter.ts
 * Unified scripture formatting for PDF, EPUB, DOCX, and LLM prompts.
 * 
 * CANONICAL FORMATS (Chicago Manual + Premium Print Standard):
 * 
 * 1. SHORT INLINE (under 40 words, woven into sentence):
 *    *"verse text"* (Book Chapter:Verse Translation)
 *    Example: Paul writes *"I can do all things through Christ who strengthens me"* (Philippians 4:13 NIV).
 * 
 * 2. SHORT STANDALONE (under 40 words, quoted as own statement):
 *    > Verse text here.
 *    > — Book Chapter:Verse (Translation)
 * 
 * 3. LONG BLOCK (40+ words — mandatory blockquote, no quotation marks):
 *    > Verse text here, continuing across
 *    > multiple lines as needed.
 *    > — Book Chapter:Verse (Translation)
 * 
 * CRITICAL RULES:
 * - Reference ALWAYS ends with translation in parentheses: (NIV), (KJV), (ESV)
 * - Reference ALWAYS preceded by em-dash: \u2014 or — in markdown
 * - Block quotes NEVER use quotation marks around the verse text
 * - Block quotes ALWAYS have reference on separate line
 * - Inline quotes ALWAYS have reference immediately after closing quote, same line
 */

export type ScriptureQuote = {
  text: string;
  reference?: string;
  translation?: string;
};

const BIBLE_BOOK_PATTERN = /\b(?:[1-3]\s+)?(?:genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalms?|proverbs?|ecclesiastes|song of solomon|song of songs|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation)\s+\d+:\d+/i;

/**
 * Parse a markdown blockquote paragraph (lines starting with '> ') into
 * a normalized ScriptureQuote object. Returns null if not a blockquote.
 */
export function parseMarkdownBlockquote(paragraph: string): ScriptureQuote | null {
  if (!paragraph.startsWith("> ") && !paragraph.startsWith(">")) return null;
  
  // Strip ALL leading '>' levels — handles nested '> > text' and LLM '> > ref' formats
  const lines = paragraph.split("\n")
    .map((l) => l.replace(/^(>\s*)+/, "").trim())
    .filter(Boolean);
  
  if (lines.length === 0) return null;

  // Reference detection: em-dash prefix OR a bare scripture citation (Book Chapter:Verse)
  const refPattern = /^[\u2014\-\u2013]|^\*[\u2014\-\u2013]|^(?:[1-9]\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+\d+:\d+/;
  let refLineIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (refPattern.test(lines[i].trim())) { 
      refLineIdx = i; 
      break; 
    }
  }

  // Handle inline ">.  BookName chapter:verse" separators embedded at the end of a verse line
  let verseLines = refLineIdx > 0 ? lines.slice(0, refLineIdx) : lines;
  let inlineRef = "";
  
  if (refLineIdx < 0 && verseLines.length > 0) {
    const lastLine = verseLines[verseLines.length - 1];
    const inlineMatch = lastLine.match(
      /^(.*?)\s*>\.?\s+((?:[1-9]\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+\d+:\d+(?:[:\u2013\-]\d+)?\s*(?:\([^)]*\))?)\s*$/
    );
    if (inlineMatch && inlineMatch[1].trim()) {
      verseLines = [...verseLines.slice(0, -1), inlineMatch[1].trim()];
      inlineRef = inlineMatch[2].trim();
    }
  }

  // Strip any remaining stray ">" symbols from the verse text itself
  const cleanedVerseLines = verseLines.map((line) => 
    line.replace(/>\s+/g, " ").replace(/>\./g, "").trim()
  );

  const refRaw = inlineRef || (refLineIdx >= 0 ? lines[refLineIdx] : "");
  const refClean = refRaw.replace(/^\*?[\u2014\-\u2013]\s*/, "").replace(/\*$/, "").trim();
  
  // Extract translation from parentheses at end: "John 3:16 (NIV)"
  const transMatch = refClean.match(/^(.+?)\s*\(([^)]+)\)\s*$/);

  return {
    text: cleanedVerseLines.join("\n").trim(),
    reference: transMatch ? transMatch[1].trim() : (refClean || undefined),
    translation: transMatch ? transMatch[2].trim() : undefined,
  };
}

/**
 * Format a scripture reference with translation consistently.
 * Always returns: "— Reference (Translation)" or "— Reference" if no translation.
 */
export function formatScriptureReference(reference: string | undefined, translation: string | undefined): string {
  if (!reference) return "";
  const trans = translation ? ` (${translation})` : "";
  return `\u2014 ${reference}${trans}`;
}

/**
 * Detect if text contains a Bible reference.
 */
export function containsScripture(text: string): boolean {
  return BIBLE_BOOK_PATTERN.test(text);
}

/**
 * Canonical prompt text for scripture formatting rules.
 * Use this exact string in all LLM prompts (write-section, polish, etc).
 */
export const SCRIPTURE_FORMATTING_RULES = `═══ SCRIPTURE FORMATTING (Chicago Manual + Premium Print) ═══
SHORT INLINE (under 40 words, woven into sentence): *"verse text"* (Book Chapter:Verse Translation)
SHORT STANDALONE (under 40 words, quoted as own statement):
> Verse text here.
> — Book Chapter:Verse (Translation)

LONG BLOCK (40+ words—mandatory blockquote, no quotation marks):
> Verse text here, continuing across
> multiple lines as needed.
> — Book Chapter:Verse (Translation)

CRITICAL RULES:
• Reproduce scripture EXACTLY as the speaker quoted it. Never paraphrase scripture.
• When a central passage anchors the section, place it as a standalone block near the opening—before explanatory words.
• No post-quote restatement. The sentence after scripture must advance, apply, or land an implication—not echo what was just said.
• Include original Greek/Hebrew terms exactly as the speaker stated them: the Greek word *transliteration*, meaning "definition."
• Quote each scripture ONCE per section. Subsequent references use shorthand only: "As Jesus said in John 15:5..."
• Never add biblical background (historical setting, authorial intent, cultural context) unless the speaker explicitly stated it.
• Every scripture must complete TEXT → TRUTH → APPLICATION within 2-3 paragraphs of the quotation.
• Always include translation abbreviation: (NIV), (KJV), (ESV), etc.`;
