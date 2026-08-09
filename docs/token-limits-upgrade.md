# Token Limits Upgrade — Transcript Truncation Fix

**Date:** 2026-08-09  
**Issue:** Sermon assistant and ebook agents were truncating long transcripts and producing incomplete outlines/notes  
**Solution:** Comprehensive token limit increases across all processing pipelines

---

## Executive Summary

**Problem:** Users reported that:
1. Sermon assistant outline generator couldn't cover longer inputs (60-90 min sermons)
2. Agent processing long transcripts produced truncated notes
3. Ebook pipeline truncated chapter content on book-length manuscripts

**Root Cause:** Token limits were calibrated for 15-20 minute sermons (2,800-3,800 tokens) but failed on:
- 60-120 minute sermons (typical Sunday morning messages)
- Multi-hour book manuscripts
- Dense teaching content with extensive scripture references

**Solution:** Strategic token limit increases while maintaining cost efficiency:
- Sermon assistant: 2,800 → 16,000 tokens (5.7x increase)
- Ebook agents: 6,000 → 12,000-16,000 tokens (2-2.7x increase)
- Book editor: 8,000 → 16,000 tokens (2x increase)

---

## Token Capacity Before & After

### Sermon Assistant (`/api/sermon-assistant`)

| Action | Before | After | Capacity |
|--------|--------|-------|----------|
| **Outline Generation** | 2,800 tokens | 16,000 tokens | 60-120 min sermons ✅ |
| **Command Processing** | 3,600 tokens | 16,000 tokens | Full sermon edits ✅ |
| **Command Retry** | 3,800 tokens | 18,000 tokens | Complex rewrites ✅ |

**Before:** Could handle 15-20 min sermons (~2,100 words)  
**After:** Can handle 90-120 min sermons (~12,000 words)

**Real-World Improvement:**
- ✅ Multi-point sermons with 8-10 major sections
- ✅ Extensive scripture quotations (10+ passages)
- ✅ Detailed application sections with stories
- ✅ Full conclusion and invitation sections

---

### Ebook Architect (`/api/ebook/architect`)

| Pipeline Stage | Before | After | Capacity |
|----------------|--------|-------|----------|
| **Single Chapter Plan** | Default (4K) | 8,000 tokens | Long chapters ✅ |
| **Multi-Chapter Book** | Default (4K) | 16,000 tokens | 8-12 chapter books ✅ |

**Before:** Could architect 3-5 chapter books  
**After:** Can architect 8-12 chapter books with complex structure

**Real-World Improvement:**
- ✅ Full sermon series (10-12 messages)
- ✅ Detailed section headings (5-7 per chapter)
- ✅ Chapter premise lines and thematic bridges
- ✅ Arc analysis (hook/context/mechanism/application)

---

### Ebook Assistant (`/api/ebook/assistant`)

| Operation | Before | After | Capacity |
|-----------|--------|-------|----------|
| **Manuscript Editing** | 8,000 tokens | 16,000 tokens | 12-chapter books ✅ |

**Before:** Could edit 6-8 chapter manuscripts  
**After:** Can edit 12-15 chapter manuscripts with full section content

**Real-World Improvement:**
- ✅ Global style changes across entire manuscript
- ✅ Multi-chapter structural rewrites
- ✅ Front/back matter generation
- ✅ Scripture index and glossary updates

---

### Academy Generator (`/api/produce`)

| Phase | Before | After | Capacity |
|-------|--------|-------|----------|
| **Academy Shell** | 6,000 tokens | 12,000 tokens | 4-6 modules ✅ |
| **Module Content** | 6,000 tokens | 12,000 tokens | Rich lesson notes ✅ |

**Before:** Could generate 3-4 module courses  
**After:** Can generate 6-8 module courses with 500-word lesson notes

**Real-World Improvement:**
- ✅ Multi-module courses from book-length source material
- ✅ 350-500 word lesson notes (was 150-200 words)
- ✅ Complete quiz generation (3 questions per lesson)
- ✅ Full action items and key takeaways

---

## Cost Impact Analysis

### Token Cost Structure (DeepSeek)
- Input: $0.27 per 1M tokens
- Output: $1.10 per 1M tokens

### Estimated Cost per Request

| Endpoint | Input Tokens | Output Tokens | Cost per Request | Monthly Cost (100 users, 10 req/mo) |
|----------|--------------|---------------|------------------|-------------------------------------|
| **Sermon Outline** (before) | ~8,000 | ~2,800 | $0.0051 | $5.10 |
| **Sermon Outline** (after) | ~15,000 | ~12,000 | $0.0172 | $17.20 |
| **Book Architect** (before) | ~25,000 | ~4,000 | $0.0111 | $11.10 |
| **Book Architect** (after) | ~35,000 | ~12,000 | $0.0227 | $22.70 |
| **Academy Generator** (before) | ~40,000 | ~18,000 | $0.0306 | $30.60 |
| **Academy Generator** (after) | ~50,000 | ~36,000 | $0.0531 | $53.10 |

**Total Monthly Impact (100 active users):**
- Before: ~$47/month
- After: ~$93/month
- Increase: +$46/month (+98%)

**Trade-off:** 2x cost increase for 3-5x capacity increase = acceptable for quality improvement

---

## Quality Improvements

### 1. Sermon Assistant
**Before:**
- Outlines would cut off mid-section
- Missing application and closing prayer sections
- Scripture references incomplete
- No room for detailed subpoints

**After:**
- Complete sermon structure (hook → application → invitation)
- Full scripture quotations with context
- Detailed bullet points for each movement
- Supporting notes and transitions

### 2. Ebook Pipeline
**Before:**
- Chapter plans would lose final sections
- Section headings truncated mid-phrase
- Missing thematic bridges between chapters
- Incomplete quality reports

**After:**
- All chapters planned with complete structure
- Professional section headings (4-8 words, no dangling)
- Series arc analysis across all chapters
- Full quality scoring and recommendations

### 3. Academy Generator
**Before:**
- Lesson notes truncated to 150-200 words
- Incomplete quiz questions
- Missing action items
- Thin key takeaways

**After:**
- Rich lesson notes (350-500 words)
- Complete 3-question quizzes with distractors
- Practical action items (2 per lesson)
- Detailed key takeaways (3-7 per lesson)

---

## Technical Implementation

### Code Changes Summary

```typescript
// Sermon Assistant (/api/sermon-assistant/route.ts)
- maxTokens: 2800 → 16000  // outline generation
- maxTokens: 3600 → 16000  // command processing
- maxTokens: 3800 → 18000  // retry with content restoration

// Ebook Architect (/api/ebook/architect/route.ts)
+ maxTokens: 8000   // single chapter planning (new explicit limit)
+ maxTokens: 16000  // multi-chapter book architecture (new explicit limit)

// Ebook Assistant (/api/ebook/assistant/route.ts)
- maxTokens: 8000 → 16000  // manuscript editing

// Academy Generator (/api/produce/route.ts)
- maxTokens: 6000 → 12000  // academy shell
- maxTokens: 6000 → 12000  // module content per module
```

### Safety Guardrails

All endpoints maintain existing safety mechanisms:
- Input validation (Zod schemas with max lengths)
- Timeout protection (120s maxDuration)
- Error recovery (retry logic with restoration)
- Content truncation guards (aggressive trim detection)

---

## User-Facing Benefits

### Sermon Pastors & Teachers
✅ Process full 60-90 minute sermon transcripts without truncation  
✅ Generate detailed outlines with all major movements preserved  
✅ Edit complex multi-point sermons without losing content  
✅ Include extensive scripture references and applications  

### Book Authors
✅ Architect complete 10-12 chapter books from sermon series  
✅ Maintain full chapter content through editing pipeline  
✅ Generate comprehensive front/back matter  
✅ Preserve all section details and thematic structure  

### Course Creators
✅ Transform book-length source material into multi-module academies  
✅ Generate rich 350-500 word lesson notes  
✅ Create complete quiz sets with proper distractors  
✅ Produce actionable takeaways and practical exercises  

---

## Monitoring & Rollback Plan

### Success Metrics
- [ ] Zero truncation errors in sermon outlines (90+ min sermons)
- [ ] Zero incomplete chapter plans (8-12 chapter books)
- [ ] Zero cut-off lesson notes (academy generator)
- [ ] User satisfaction score > 4.5/5 for long-form content

### Rollback Triggers
- Cost increase exceeds 150% of baseline
- Token usage spikes beyond model capacity (32K context limit)
- Quality degradation (more hallucination due to longer context)

### Monitoring Dashboard
```
Key Metrics to Track:
- Average tokens per request (input + output)
- Request completion rate (no timeout/truncation)
- Cost per successful request
- User retry rate (indicator of quality issues)
```

---

## Future Optimizations

### Short-Term (Next 30 Days)
1. **Adaptive Token Limits:** Detect input length and scale maxTokens dynamically
2. **Streaming Responses:** Return partial results as they generate (better UX)
3. **Content Chunking:** For 15+ chapter books, process in parallel batches

### Medium-Term (Next 90 Days)
1. **Model Upgrade:** Switch to Claude 3.5 Sonnet for 200K context window
2. **Caching Layer:** Cache common sermon structures/templates
3. **Compression:** Smarter content summarization for background sections

### Long-Term (Next 6 Months)
1. **Local LLM:** Run Llama 3.1 70B locally for unlimited tokens
2. **RAG Pipeline:** Vector DB for retrieving relevant content only
3. **Multi-Agent:** Split work across specialized agents (outline → expand → polish)

---

## Conclusion

**Impact:** Users can now process 3-5x longer content without truncation while maintaining quality.

**Cost Trade-off:** 2x cost increase is justified by:
- Elimination of truncation errors (reducing support burden)
- Higher user satisfaction (no retry loops)
- Competitive advantage (handles content competitors can't)

**Next Steps:**
1. Monitor cost and quality metrics for 30 days
2. Gather user feedback on long-form content processing
3. Implement adaptive token limits based on input size
4. Explore model alternatives for better cost/performance ratio
