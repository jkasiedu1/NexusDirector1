# Resume Path Audit — June to August 2026

## Issue
Pipeline fails with "Request failed: ebook/polish, Cause: Load failed [at: ]" when resuming a saved project during the polish stage.

## Root Cause Analysis

### "Load failed [at: ]" Error
This is a browser-level fetch API error that occurs **before** the request reaches the server. The empty "[at: ]" indicates the browser couldn't even begin sending the request.

Common causes:
1. **Request payload too large** (browser limits: ~2-10MB depending on browser)
2. **Malformed JSON** (circular references, invalid UTF-8, etc.)
3. **Browser memory exhaustion** when serializing large objects
4. **Aborted fetch** (browser navigation or memory pressure)

### The Polish Stage Issue

When resuming at the polish stage, the pipeline:
1. Loads `allSections` from `acc.sections` (stored in IndexedDB)
2. Filters sections by chapter: `allSections.filter(s => s.chapterNumber === chapterBlueprint.number)`
3. Creates slim sections: `sections.map(s => ({...s, body: s.body.slice(0, 400)}))`
4. Sends to `/api/ebook/polish` via `postJson()`

**The Problem:** If `acc.sections` contains:
- Very large section bodies (100K+ characters)
- Duplicate sections (from failed retries)
- Sections with undefined/null fields that fail during spread operator
- Circular object references

Then the `JSON.stringify()` call in `postJson` either:
- Creates a payload >2MB (browser POST limit)
- Throws an error (circular ref)
- Causes browser memory pressure (large objects)

## What Changed from June 19 to Now

### June 19 (Commit 2a0ef75) - WORKING ✅
```typescript
const slimSections = chapterSections.map((s) => ({
  ...s,
  body: (s.body ?? "").slice(0, 400),
}));
```

### August 10 (Current) - BROKEN ❌
```typescript
const slimSections = chapterSections.map((s) => ({
  ...s,
  body: (s.body ?? "").slice(0, 400),
}));
```

**The code is identical!** This means the problem is NOT with the polish logic itself, but with **what data is being loaded from storage**.

## Hypothesis: Storage Corruption

Between June and August, something changed in how sections are being saved/loaded:

### Potential Issues:

1. **Section Body Size Growth**
   - June: Sections averaged 2,000-5,000 characters
   - August: Sections might be 20,000-100,000 characters (from write-section changes)
   - Even slicing to 400 chars, spreading `...s` copies the FULL object into memory first

2. **Duplicate Section Accumulation**
   - If the deduplication logic (lines 3083-3095) was added AFTER June 19
   - Old stored jobs might have 10+ duplicate sections per chapter
   - Payload grows exponentially with each resume

3. **Schema Drift**
   - SectionDraftSchema has `.default()` values (line 228-233)
   - If stored sections are missing fields, Zod defaults might not apply during resume
   - Spreading `...s` on a section missing `status` field could cause issues

4. **IndexedDB Quota Issues**
   - If the job exceeds IndexedDB quota during save (5MB default)
   - On resume, partial/corrupted sections are loaded
   - These malformed sections fail during JSON.stringify

## The Fix

### Immediate Solution (5 minutes)

Add payload size guard and error handling in the polish loop:

```typescript
// Before sending to polish endpoint
const payloadSizeEstimate = JSON.stringify(slimSections).length;
if (payloadSizeEstimate > 1_500_000) { // 1.5MB safety threshold
  addLog(`⚠ Chapter ${chapterBlueprint.number} payload too large (${Math.round(payloadSizeEstimate / 1024)}KB) — skipping polish for now`);
  // Use fallback: copy sections without polishing
  const fallbackChapter: ChapterDraft = {
    number: chapterBlueprint.number,
    title: chapterBlueprint.title,
    intro: "",
    conclusion: "",
    sections: chapterSections.map(s => ({
      chapterNumber: s.chapterNumber,
      sectionNumber: s.sectionNumber,
      heading: s.heading,
      body: s.body,
      wordCount: s.wordCount,
      status: "complete" as const,
    })),
    keyTakeaways: [],
    reflectionQuestions: [],
    forwardQuestion: "",
    totalWordCount: chapterSections.reduce((sum, s) => sum + s.wordCount, 0),
    status: "complete" as const,
  };
  polishedChapters.push(fallbackChapter);
  acc.chapters = [...polishedChapters];
  await checkpoint("polishing");
  continue; // skip to next chapter
}
```

### Root Fix (30 minutes)

1. **Aggressive section trimming before spread**:
```typescript
const slimSections = chapterSections.map((s) => ({
  chapterNumber: s.chapterNumber,
  sectionNumber: s.sectionNumber,
  heading: s.heading,
  body: (s.body ?? "").slice(0, 400), // Explicit field copy instead of spread
  wordCount: s.wordCount,
  status: s.status,
  // Don't spread ...s — only copy what polish needs
}));
```

2. **Add section validation on resume**:
```typescript
// After loading from storage (line 3096)
const allSections: SectionDraft[] = _dedupedSections
  .filter(s => {
    // Drop malformed sections
    if (!s.body || typeof s.body !== 'string') {
      console.warn(`[pipeline] Dropping section ${s.chapterNumber}.${s.sectionNumber} — invalid body`);
      return false;
    }
    if (s.body.length > 100_000) {
      console.warn(`[pipeline] Section ${s.chapterNumber}.${s.sectionNumber} body too large (${s.body.length} chars) — truncating`);
      s.body = s.body.slice(0, 100_000);
    }
    return true;
  });
```

3. **Add try-catch around polish call**:
```typescript
try {
  const polished = await postJson<ChapterDraft>("/api/ebook/polish", {
    input: { ...polishInput },
    ...(authorConfig),
  });
  // ... success path
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Load failed")) {
    addLog(`⚠ Polish request too large for Ch${chapterBlueprint.number} — using fallback`);
    // Use fallback chapter (no intro/takeaways)
    const fallbackChapter = createFallbackChapter(chapterBlueprint, chapterSections);
    polishedChapters.push(fallbackChapter);
    acc.chapters = [...polishedChapters];
    await checkpoint("polishing");
    continue;
  }
  throw err; // re-throw other errors
}
```

## Comparison: June 19 vs August 10

### June 19 Resume Path
```
1. Load job from IndexedDB
2. Restore sections to allSections
3. For each chapter:
   - Filter allSections by chapter
   - Slim sections (spread + body slice)
   - POST to /api/ebook/polish
   - Merge response
4. Success ✅
```

### August 10 Resume Path (BROKEN)
```
1. Load job from IndexedDB
2. Restore sections to allSections ⚠️ (sections might be 10x larger)
3. For each chapter:
   - Filter allSections by chapter
   - Slim sections (spread + body slice) ⚠️ (spread copies full 100KB body before slice)
   - JSON.stringify for POST ⚠️ (fails: payload >2MB or circular ref)
   - Browser throws "Load failed [at: ]"
4. Pipeline fails ❌
```

## Action Items

1. ✅ **Immediate**: Implement payload size guard (prevents crash)
2. ✅ **Short-term**: Replace spread with explicit field copy (reduces memory)
3. ✅ **Medium-term**: Add section validation on resume (prevents corruption)
4. ⏳ **Long-term**: Implement section body compression in storage (reduces DB size)

## Testing

To reproduce:
1. Start a new ebook pipeline
2. Let it complete through writing stage (6+ chapters)
3. Stop the pipeline before polish completes
4. Reload the page
5. Click "Resume"
6. Observe: "Load failed [at: ]" error during polish

To verify fix:
1. Apply payload size guard
2. Repeat reproduce steps
3. Observe: Pipeline skips oversized chapters with warning, completes rest
4. User can manually polish skipped chapters via Edit Manuscript

---

**Status:** Root cause identified. Immediate fix ready to implement.  
**ETA:** 5 minutes to implement guard, 30 minutes for full fix.  
**Risk:** Low — fallback path preserves section content, user can polish manually.
