# Transcript Source Map Rewrite Path Audit

**Date:** 2026-08-04  
**Component:** `TranscriptSourceMapPanel.tsx` + `/api/ebook/rewrite-section`  
**Reporter:** User (jkasiedu1)

---

## Issues Identified

### 1. All Three Buttons Activate Together ❌

**Symptom:** When clicking one button, all three show "Working..." simultaneously.

**Root Cause:**  
Single `rewriteBusy` state variable controls ALL three action buttons (Critique Section, Refine Paragraph, Rewrite Section).

**Location:**  
- [TranscriptSourceMapPanel.tsx](app/components/TranscriptSourceMapPanel.tsx#L102) — Line 102: `const [rewriteBusy, setRewriteBusy] = useState(false);`
- [TranscriptSourceMapPanel.tsx](app/components/TranscriptSourceMapPanel.tsx#L252-L294) — Lines 252-294: `applyAssistant` function uses single state for all modes
- [TranscriptSourceMapPanel.tsx](app/components/TranscriptSourceMapPanel.tsx#L541-L577) — Lines 541-577: All three buttons check `disabled={rewriteBusy}`

**Fix:**  
Replace with three independent state variables:
```tsx
const [critiqueBusy, setCritiqueBusy] = useState(false);
const [refineBusy, setRefineBusy] = useState(false);
const [rewriteBusy, setRewriteBusy] = useState(false);

// In applyAssistant function:
const setBusyState = (busy: boolean) => {
  if (mode === "critiqueSection") setCritiqueBusy(busy);
  else if (mode === "refineParagraph") setRefineBusy(busy);
  else setRewriteBusy(busy);
};

setBusyState(true);
try {
  // ... existing logic ...
} finally {
  setBusyState(false);
}
```

Update button disabled states:
```tsx
// Critique button
disabled={critiqueBusy}

// Refine button  
disabled={refineBusy || selectedParagraphIndex === null}

// Rewrite button
disabled={rewriteBusy}
```

---

### 2. Rewrite Doesn't Respect Boundaries ❌

**Symptom:**  
When user selects specific unused excerpts and asks to "include unused transcript and rewrite section", the LLM rewrites the ENTIRE section (all chapters) instead of preserving existing prose and adding only the selected excerpts.

**Root Cause:**  
The rewrite prompt has NO boundary instructions. It always performs a full section rewrite regardless of which excerpts are marked `[MUST INCLUDE]`.

**Location:**  
- [route.ts](app/api/ebook/rewrite-section/route.ts#L154-L182) — Lines 154-182: `rewritePrompt` construction
- [route.ts](app/api/ebook/rewrite-section/route.ts#L74-L77) — Lines 74-77: `includeExcerptNumbers` mapping logic

**Current Logic:**
```typescript
const excerptBlock = assignment.transcriptExcerpts
  .map((excerpt, index) => {
    const number = index + 1;
    const forced = includeSet.has(number) ? " [MUST INCLUDE]" : "";
    return `Excerpt ${number}${forced}:\n${excerpt}`;
  })
  .join("\n\n");
```

This marks excerpts but doesn't tell the LLM to preserve existing prose.

**Fix:**  
Add mode detection and boundary instructions:

```typescript
// After line 131, add:
const rewriteMode = includeExcerptNumbers.length > 0 ? "additive" : "full";

const boundaryInstructions = rewriteMode === "additive" 
  ? `
═══ ADDITIVE REWRITE MODE ═══

You are ADDING new content to an existing section, NOT replacing it entirely.

PRESERVATION RULES:
1. KEEP all existing paragraphs that are well-grounded in transcript excerpts
2. KEEP the existing argument flow and paragraph sequence
3. KEEP existing scripture quotes and their exact formatting
4. KEEP existing stories, illustrations, and applications

ADDITION RULES:
1. Write NEW paragraphs ONLY for excerpts marked [MUST INCLUDE]
2. Insert new paragraphs at the NATURAL POSITION where these ideas appear in the transcript sequence
3. If a [MUST INCLUDE] excerpt extends or enriches an existing paragraph, MERGE it into that paragraph rather than duplicating
4. If a [MUST INCLUDE] excerpt is already substantially covered in the existing prose, DO NOT add it

OUTPUT REQUIREMENT:
Return the FULL section body with both preserved and new content in proper sequence.
`
  : `
═══ FULL SECTION REWRITE MODE ═══

You are rewriting the entire section from scratch using all provided transcript excerpts.
`;

// Add to system prompt after line 148:
const rewriteSystem = `You are an elite developmental editor and ghostwriter rewriting one section of a published teaching book.

${boundaryInstructions}

THE STANDARD: The rewritten section must read like a professionally published book...`;
```

Additionally, when in additive mode, filter the excerpt block to show only selected excerpts:
```typescript
const excerptBlock = rewriteMode === "additive"
  ? assignment.transcriptExcerpts
      .map((excerpt, index) => {
        const number = index + 1;
        if (!includeSet.has(number)) return null;
        return `Excerpt ${number} [MUST INCLUDE]:\n${excerpt}`;
      })
      .filter(Boolean)
      .join("\n\n")
  : assignment.transcriptExcerpts
      .map((excerpt, index) => {
        const number = index + 1;
        const forced = includeSet.has(number) ? " [MUST INCLUDE]" : "";
        return `Excerpt ${number}${forced}:\n${excerpt}`;
      })
      .join("\n\n");
```

---

### 3. No Scripture Included in Rewrites ❌

**Symptom:**  
Rewrites never include scripture references even when they exist in the transcript excerpts.

**Root Cause:**  
The rewrite-section route has ZERO scripture infrastructure. It doesn't:
- Provide scripture formatting rules to the LLM
- Include primary translation information
- Enforce scripture sequence positions
- Deduplicate already-quoted verses
- Apply Chicago Manual scripture formatting standards

**Comparison with write-section route:**

| Feature | write-section ✅ | rewrite-section ❌ |
|---------|-----------------|-------------------|
| Scripture formatting rules (Chicago Manual) | ✓ Lines 391-409 | **MISSING** |
| Primary translation block | ✓ Lines 486-498 | **MISSING** |
| Scripture sequence positions | ✓ Lines 564-574 | **MISSING** |
| Scripture deduplication | ✓ Lines 647-661 | **MISSING** |
| Post-quote advancement rule | ✓ Line 389 | **MISSING** |
| Scripture protection (never filter out) | ✓ Lines 318-321 | **MISSING** |

**Fix:**

Import scripture utilities:
```typescript
// Add to imports at top of route.ts:
import { formatScriptureReference, parseMarkdownBlockquote } from "@/lib/scripture-formatter";
import { stripAudienceLanguage } from "@/lib/editorial-style-bible";
```

Add scripture formatting rules to system prompt (after line 148):
```typescript
const scriptureFormattingRules = `
═══ SCRIPTURE FORMATTING (Chicago Manual + Premium Print) ═══

SHORT INLINE (under 40 words, woven into sentence):
*"verse text"* (Book Chapter:Verse Translation)
Example: Paul writes *"I can do all things through Christ who strengthens me"* (Philippians 4:13 NIV).

SHORT STANDALONE (under 40 words, quoted as own statement):
> Verse text here.
> — Book Chapter:Verse (Translation)

LONG BLOCK (40+ words — mandatory blockquote, no quotation marks):
> Verse text here, continuing across
> multiple lines as needed.
> — Book Chapter:Verse (Translation)

CRITICAL RULES:
• Reference ALWAYS ends with translation in parentheses: (NIV), (KJV), (ESV)
• Reference ALWAYS preceded by em-dash: — 
• Block quotes NEVER use quotation marks around verse text
• Reproduce scripture EXACTLY as the speaker quoted it. Never paraphrase scripture.
• After scripture quotes, ADVANCE the argument—never restate what the verse just said.
• Quote each scripture ONCE per section. Subsequent references use shorthand: "As Jesus said in John 15:5..."
• Every scripture must complete TEXT → TRUTH → APPLICATION within 2-3 paragraphs of the quotation.
`;

const rewriteSystem = `You are an elite developmental editor and ghostwriter rewriting one section of a published teaching book.

${scriptureFormattingRules}

THE STANDARD: The rewritten section must read like a professionally published book — not a cleaned-up transcript...`;
```

Add primary translation block to prompt (before excerptBlock):
```typescript
// After line 154, add:
const primaryTranslationBlock = assignment.primaryTranslation
  ? `
PRIMARY BIBLE TRANSLATION FOR THIS BOOK
The speaker's dominant Bible translation is: ${assignment.primaryTranslation}

When you see scripture in the transcript with no translation specified, assume ${assignment.primaryTranslation}.
Format every scripture citation with its translation in parentheses: (${assignment.primaryTranslation})
`
  : "";
```

Add scripture positions block:
```typescript
// After primaryTranslationBlock:
const scripturePositions = assignment.scripturePositions ?? [];
const scripturePositionsBlock = scripturePositions.length > 0
  ? `
SCRIPTURE SEQUENCE POSITIONS — DO NOT MOVE EARLIER

Each scripture below appears at a specific position in the transcript (by excerpt number). Do NOT use a scripture before you reach the paragraph that corresponds to its excerpt position. The verse belongs where the speaker placed it in their argument — not where it feels rhetorically convenient:

${scripturePositions.map((p) => 
  `• "${p.reference}" — appears in Excerpt ${p.excerptIndex + 1}. Do not use it in paragraphs anchored to earlier excerpts.`
).join("\n")}
`
  : "";
```

Add scripture deduplication (if assignment has `usedQuotes`):
```typescript
// After scripturePositionsBlock:
const usedScriptures = assignment.usedQuotes?.filter(q => 
  q.reference && /\d+:\d+/.test(q.reference)
) ?? [];

const scriptureDeduplicationBlock = usedScriptures.length > 0
  ? `
SCRIPTURES ALREADY QUOTED IN FULL (inline reference only)

The following verse texts have ALREADY BEEN REPRODUCED IN FULL in an earlier section of this book. You are ABSOLUTELY FORBIDDEN from printing them again — not one word of the verse, not a paraphrase, not a near-quote. If you reference the scripture at all, use ONLY its citation inline (e.g. "as John 3:16 states"). Never reprint the text:

${usedScriptures.map(q => `• ${q.reference} — DO NOT REPRODUCE TEXT`).join("\n")}
`
  : "";
```

Update rewritePrompt array to include all scripture blocks:
```typescript
const rewritePrompt = [
  `CHAPTER ${assignment.chapterNumber}: ${assignment.chapterTitle}`,
  `SECTION ${assignment.sectionNumber}: ${assignment.heading}`,
  `TARGET WORD COUNT: ${assignment.targetWordCount}`,
  "",
  "CURRENT SECTION BODY:",
  currentBody || "(empty)",
  "",
  instruction.trim() ? `USER REWRITE INSTRUCTION:\n${instruction.trim()}\n` : "",
  authorConfig?.instructions?.trim()
    ? `AUTHOR WRITING INSTRUCTION:\n${authorConfig.instructions.trim()}\n`
    : "",
  authorConfig?.targetAudience?.trim()
    ? `TARGET AUDIENCE:\n${authorConfig.targetAudience.trim()}\n`
    : "",
  primaryTranslationBlock,           // ← NEW
  scripturePositionsBlock,            // ← NEW
  scriptureDeduplicationBlock,        // ← NEW
  "TRANSCRIPT EXCERPTS:",
  excerptBlock,
  "",
  "Return:",
  "- paragraphs: array of paragraph strings",
  "- excerptUsage: array of excerpt numbers used in the same order as paragraphs",
]
  .filter(Boolean)
  .join("\n");
```

---

## Priority

**P0 (Critical):** Issue #1 (button state) — breaks UX, user can't tell what's running  
**P0 (Critical):** Issue #2 (boundary violation) — destroys existing work  
**P1 (High):** Issue #3 (scripture missing) — core content type not handled

---

## Testing Checklist

After fixes:
- [ ] Click "Critique Section" — only that button shows "Working..."
- [ ] Click "Refine Paragraph" — only that button shows "Working..."
- [ ] Click "Rewrite Section" — only that button shows "Working..."
- [ ] Select 2 unused excerpts, add instruction "include these two excerpts without rewriting existing prose" → existing paragraphs preserved
- [ ] Select unused excerpt containing scripture reference → rewrite includes scripture with proper formatting
- [ ] Verify scripture appears at correct position (not moved earlier in argument)
- [ ] Verify primary translation is applied to scripture citations

---

## Git Commit Pattern

After implementing fixes:
```bash
git add app/components/TranscriptSourceMapPanel.tsx app/api/ebook/rewrite-section/route.ts
git commit -m "fix(ebook): isolate source map button states, respect rewrite boundaries, add scripture support

- Split rewriteBusy into three independent states (critiqueBusy, refineBusy, rewriteBusy)
- Add additive vs full rewrite mode detection based on selected excerpts
- Preserve existing prose when includeExcerptNumbers > 0
- Import scripture formatting rules from editorial-style-bible
- Add primary translation, scripture positions, and deduplication blocks to rewrite prompt
- Prevent scripture from being moved earlier than transcript sequence position"

git push origin main
```
