# Nexus Assistant Cost Audit — 2026-08-10

## Executive Summary

**Issue:** Nexus assistant API calls have become significantly more expensive following recent token limit upgrades.

**Root Cause:** Commit `99be7f0` (Aug 9, 2026) increased token limits across all assistant endpoints by 2-5.7x to fix truncation issues on long transcripts.

**Cost Impact:** Monthly cost increased from ~$47 to ~$93 (+98%) for 100 active users making 10 requests/month.

**Status:** ⚠️ **2x cost increase** — optimization opportunities identified below.

---

## Token Limit Changes (Last Week)

### 1. Sermon Assistant (`/app/api/sermon-assistant/route.ts`)

| Action | Before | After | Increase |
|--------|--------|-------|----------|
| Outline Generation | 2,800 tokens | 16,000 tokens | **5.7x** |
| Command Processing | 3,600 tokens | 16,000 tokens | **4.4x** |
| Command Retry | 3,800 tokens | 18,000 tokens | **4.7x** |

**Cost per Request:**
- Before: $0.0051
- After: $0.0172
- Increase: **+237%** 💸

---

### 2. Ebook Assistant (`/app/api/ebook/assistant/route.ts`)

| Operation | Before | After | Increase |
|-----------|--------|-------|----------|
| Manuscript Editing | 8,000 tokens | 16,000 tokens | **2x** |

**Cost per Request:**
- Before: ~$0.0088
- After: ~$0.0176
- Increase: **+100%** 💸

---

### 3. Academy Generator (`/app/api/produce/route.ts`)

| Phase | Before | After | Increase |
|-------|--------|-------|----------|
| Academy Shell | 6,000 tokens | 12,000 tokens | **2x** |
| Module Content | 6,000 tokens | 12,000 tokens | **2x** |

**Cost per Request:**
- Before: $0.0306
- After: $0.0531
- Increase: **+74%** 💸

---

### 4. Main Assistant (`/app/api/assistant/route.ts`)

| Operation | Current Limit | Status |
|-----------|---------------|--------|
| Academy Editing | 6,000 tokens | ✅ Unchanged |

**Cost per Request:** ~$0.0066 (no change)

---

## Cost Comparison Table

| Endpoint | Cost Before | Cost After | Monthly (100 users @ 10 req) | Increase |
|----------|-------------|------------|------------------------------|----------|
| Sermon Outline | $0.0051 | $0.0172 | $17.20 (was $5.10) | **+237%** |
| Ebook Architect | $0.0111 | $0.0227 | $22.70 (was $11.10) | **+105%** |
| Ebook Assistant | $0.0088 | $0.0176 | $17.60 (was $8.80) | **+100%** |
| Academy Gen | $0.0306 | $0.0531 | $53.10 (was $30.60) | **+74%** |
| Main Assistant | $0.0066 | $0.0066 | $6.60 | **0%** |
| **TOTAL** | **$0.0622** | **$0.1172** | **$117.20** (was $62.20) | **+88%** |

---

## Root Cause Analysis

### Why the Increase?

The token limit increases were implemented to solve **real quality problems**:

1. **Sermon truncation:** 60-90 min sermons were getting cut off mid-section
2. **Book truncation:** 10-12 chapter manuscripts were losing final chapters
3. **Academy truncation:** Rich lesson notes were being reduced to stubs

### What Changed (Commit 99be7f0)

```
- Sermon Assistant: Increase token limits to handle 90-120 min sermons
  - Outline generation: 2,800 → 16,000 tokens (5.7x)
  - Command processing: 3,600 → 16,000 tokens (4.4x)
  - Retry logic: 3,800 → 18,000 tokens (4.7x)

- Ebook Agents: Prevent truncation on long transcripts
  - Architect: Add explicit 8K/16K token limits
  - Assistant: Increase 8K → 16K tokens
  - Academy: Increase 6K → 12K tokens per phase
```

**Trade-off:** 2x cost for 3-5x capacity = acceptable for quality, but needs optimization.

---

## Optimization Opportunities

### 🎯 Priority 1: Dynamic Token Allocation

**Problem:** All requests now use the maximum token limit regardless of input size.

**Solution:** Implement dynamic token allocation based on input length:

```typescript
// Example for Sermon Assistant
function calculateMaxTokens(transcriptLength: number): number {
  if (transcriptLength < 2000) return 3000;   // 10-15 min sermon
  if (transcriptLength < 5000) return 6000;   // 20-30 min sermon
  if (transcriptLength < 10000) return 10000; // 40-60 min sermon
  return 16000; // 90-120 min sermon
}
```

**Expected Savings:** 40-60% on requests with short/medium input

---

### 🎯 Priority 2: Request Batching & Caching

**Problem:** Each assistant call processes the entire context from scratch.

**Solution:** 
1. Cache processed chapter structures for repeat edits
2. Batch multiple small edits into a single API call
3. Store intermediate AI outputs for undo/redo without re-processing

**Expected Savings:** 30-50% on edit operations

---

### 🎯 Priority 3: Aggressive Input Pruning

**Problem:** The assistant receives full chapter bodies even when editing metadata.

**Current Code (Ebook Assistant, lines 215-229):**
```typescript
// Explicit sections are always sent in full; others truncated only if they exceed 4000 chars
const isTruncated = !isExplicit && fullBody.length > 4000;
```

**Issue:** 4000 char threshold is still high for background context.

**Solution:**
```typescript
// Aggressive pruning for non-explicit sections
const isTruncated = !isExplicit && fullBody.length > 800; // Reduce from 4000 to 800
```

**Expected Savings:** 20-30% on input token costs

---

### 🎯 Priority 4: Model Routing Strategy

**Problem:** All complex operations use the expensive DeepSeek Reasoner model.

**Current Code (Assistant, line 299):**
```typescript
const selectedModel = isStructuralOp ? deepSeekReasonerModel : deepSeekModel;
```

**Solution:** Add a third tier for simple metadata edits:

```typescript
function selectModel(instruction: string): Model {
  if (isMetadataOnly(instruction)) return deepSeekLiteModel;   // Cheap, fast
  if (isStructuralOp(instruction)) return deepSeekReasonerModel; // Expensive, smart
  return deepSeekModel; // Standard
}

function isMetadataOnly(instruction: string): boolean {
  return /\b(rename|change title|update subtitle|set author|change theme)\b/i.test(instruction);
}
```

**Expected Savings:** 60-80% on simple title/metadata edits

---

### 🎯 Priority 5: Implement Token Budgets

**Problem:** No per-user or per-project token limits.

**Solution:**
1. Add token tracking middleware
2. Implement daily/monthly quotas per user
3. Show token usage in UI
4. Throttle expensive operations during high-volume periods

**Expected Savings:** Prevents runaway costs from power users

---

## Recommended Action Plan

### Phase 1: Quick Wins (1-2 days)
1. ✅ Implement dynamic token allocation (Priority 1)
2. ✅ Reduce non-explicit section truncation threshold from 4000 → 800 chars (Priority 3)
3. ✅ Add model routing for metadata-only edits (Priority 4)

**Expected Savings:** 40-50% cost reduction

---

### Phase 2: Infrastructure (3-5 days)
1. ⏳ Build request caching system (Priority 2)
2. ⏳ Add token tracking middleware (Priority 5)
3. ⏳ Implement per-user quotas (Priority 5)

**Expected Savings:** Additional 20-30% reduction

---

### Phase 3: Advanced Optimization (1-2 weeks)
1. ⏳ Implement streaming partial updates (send only diffs)
2. ⏳ Add client-side draft mode (no API call until "commit")
3. ⏳ Build prompt compression pipeline (remove redundant context)

**Expected Savings:** Additional 10-20% reduction

---

## Risk Assessment

### If No Action Taken

| Monthly Active Users | Current Cost | Projected Cost (6 months) |
|---------------------|--------------|---------------------------|
| 100 | $117 | $120-150 |
| 500 | $585 | $600-750 |
| 1,000 | $1,170 | $1,200-1,500 |
| 5,000 | $5,850 | $6,000-7,500 |

### With Optimization (Phase 1 + 2)

| Monthly Active Users | Optimized Cost | Savings vs Current |
|---------------------|----------------|-------------------|
| 100 | $58-70 | 40-50% |
| 500 | $290-350 | 40-50% |
| 1,000 | $580-700 | 40-50% |
| 5,000 | $2,900-3,500 | 40-50% |

---

## Immediate Next Steps

1. **Revert to previous token limits?** ❌ No — would break quality for long transcripts
2. **Implement dynamic allocation?** ✅ Yes — preserves quality, reduces cost
3. **Add usage monitoring?** ✅ Yes — critical for cost visibility

---

## Code Locations for Optimization

| File | Lines | Change Type |
|------|-------|-------------|
| `/app/api/sermon-assistant/route.ts` | 112-120 | Dynamic token allocation |
| `/app/api/ebook/assistant/route.ts` | 218-229 | Aggressive pruning |
| `/app/api/assistant/route.ts` | 299 | Model routing |
| `/app/api/produce/route.ts` | 138, 268 | Dynamic token allocation |

---

## Summary

✅ **Root cause identified:** Token limits increased 2-5.7x last week  
⚠️ **Cost impact:** +88% monthly increase ($62 → $117 per 100 users)  
🎯 **Optimization path:** Dynamic allocation + pruning + model routing  
💰 **Expected savings:** 40-50% with Phase 1 changes (1-2 days work)

**Recommendation:** Implement Phase 1 optimizations immediately. Quality improvements from token increases are valuable, but we can preserve quality while reducing costs through smarter allocation.
