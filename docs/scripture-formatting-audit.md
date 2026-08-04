# Scripture Formatting Audit & Unification
**Date:** 2026-08-04

## Inconsistencies Found

### 1. Reference Line Format Variations
- **PDF**: Used `\u2014 Reference (Translation)` correctly
- **EPUB**: Used `&mdash; Reference (Translation)` (HTML entity)
- **DOCX**: Used `\u2014 Reference (Translation)` correctly
- **Write-section prompt**: Mixed commas and no-comma variants

**Issue**: Comma placement inconsistent in inline format: `(Book Chapter:Verse, Translation)` vs `(Book Chapter:Verse Translation)`

### 2. Verse Text Cleaning Logic
- **PDF**: Stripped `>` markers in `writeScriptureBlock`
- **EPUB**: Stripped `>` markers in `quoteParagraphsToHtml`
- **DOCX**: Stripped `>` markers in `docxScriptureBlock`
- **Issue**: Three separate implementations with slight differences

### 3. Inline Scripture Detection
- **PDF**: Used `markInlineScriptureRefs` to bold references
- **EPUB**: Used `markupInlineScripture` with HTML spans
- **DOCX**: Used `markInlineScriptureRefs` with TextRun bold
- **Issue**: Different function names and implementations for same logic

### 4. Parsing Logic Duplication
- `parseMarkdownBlockquote` existed as standalone function in `ebook-generator.tsx`
- No shared utility for reference extraction and formatting

---

## Solution: Unified Scripture Formatter

Created `/lib/scripture-formatter.ts` with:

### Canonical Types
```typescript
export type ScriptureQuote = {
  text: string;
  reference?: string;
  translation?: string;
};
```

### Unified Functions
1. **`parseMarkdownBlockquote(paragraph: string): ScriptureQuote | null`**
   - Single implementation for all generators
   - Handles nested `>` markers, inline references, em-dash variants

2. **`formatScriptureReference(reference?: string, translation?: string): string`**
   - Always returns: `— Reference (Translation)` or `— Reference`
   - Consistent em-dash usage across PDF, EPUB, DOCX

3. **`containsScripture(text: string): boolean`**
   - Detects Bible references with canonical book name pattern

4. **`SCRIPTURE_FORMATTING_RULES: string`**
   - Canonical prompt text for LLM instructions
   - Single source of truth for all routes

---

## Canonical Format (Chicago Manual + Premium Print Standard)

### 1. SHORT INLINE (under 40 words, woven into sentence)
```
*"verse text"* (Book Chapter:Verse Translation)
```
**Example**: Paul writes *"I can do all things through Christ"* (Philippians 4:13 NIV).

**Note**: No comma before translation abbreviation.

### 2. SHORT STANDALONE (under 40 words, quoted as own statement)
```
> Verse text here.
> — Book Chapter:Verse (Translation)
```

### 3. LONG BLOCK (40+ words — mandatory blockquote, no quotation marks)
```
> Verse text here, continuing across
> multiple lines as needed.
> — Book Chapter:Verse (Translation)
```

### Critical Rules
- Reference line format: `— Book Chapter:Verse (Translation)` with em-dash (—), space before book name, translation in parentheses
- Block quotes NEVER use quotation marks around verse text
- Block quotes ALWAYS have reference on separate line
- Inline quotes ALWAYS have reference immediately after closing quote, same line
- Translation abbreviation REQUIRED on all scriptures

---

## Files Updated

### 1. `/lib/scripture-formatter.ts` (NEW)
- Canonical types and functions
- Single source of truth for scripture parsing/formatting

### 2. `/lib/ebook-generator.tsx`
- Imported `parseMarkdownBlockquote`, `formatScriptureReference`, `ScriptureQuote`
- Removed duplicate `parseMarkdownBlockquote` function declaration
- Updated `writeScriptureBlock` to use `ScriptureQuote` type
- Updated reference formatting to use `formatScriptureReference()`
- EPUB generator now uses unified reference formatter
- DOCX generator now uses unified reference formatter

### 3. `/lib/editorial-style-bible.ts`
- Updated scripture formatting rules to match canonical format
- Added explicit reference format specification
- Removed comma from inline format

### 4. `/app/api/ebook/write-section/route.ts`
- Updated scripture formatting rules in prompt
- Added explicit reference format specification
- Removed comma from inline format

---

## Benefits

### 1. Consistency
- All generators (PDF, EPUB, DOCX) produce identical scripture formatting
- LLM prompts match actual implementation

### 2. Maintainability
- Single place to update scripture parsing logic
- Changes propagate to all generators automatically

### 3. Quality
- Canonical format matches professional publishing standards (Chicago Manual)
- Reference formatting consistent with premium theological books

### 4. Debuggability
- Scripture parsing issues surface in one place
- Type safety ensures consistent data flow

---

## Testing Checklist

- [ ] PDF: Block quotes render with em-dash reference
- [ ] PDF: Inline quotes have translation without comma
- [ ] EPUB: Block quotes render with HTML entity em-dash
- [ ] EPUB: Inline quotes styled correctly
- [ ] DOCX: Block quotes use NxBlockQuote style
- [ ] DOCX: Reference line right-aligned with correct format
- [ ] Write-section: LLM follows canonical format
- [ ] Polish: Epigraphs use canonical reference format
- [ ] All formats: Translation abbreviation required and consistent

---

## Future Enhancements

1. **Scripture Index Auto-Population**: Use `containsScripture()` to scan all chapters and auto-build `scriptureIndex` array in backmatter

2. **Translation Harmonization**: Detect when same verse quoted in multiple translations across chapters, flag for editorial review

3. **Reference Validator**: Check that all scripture references follow `Book Chapter:Verse` pattern, flag malformed ones

4. **Greek/Hebrew Term Extractor**: Parse inline Greek/Hebrew terms from scripture explanations for glossary generation
