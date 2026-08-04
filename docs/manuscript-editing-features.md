# Ebook Manuscript Editing Features

This document outlines the three major features added to give you complete control over your ebook manuscript.

## 1. Audio Source Manager (Coming in Phase 2)

**Location:** Will be added to EbookPipeline component

**Capabilities:**
- View all 6 audio source slots with their transcription status
- Retranscribe individual audio sources without affecting others
- Manually edit transcript text for any source
- Remove audio sources from the pipeline
- Real-time word count tracking

**Usage:**
1. Upload audio files to any of the 6 slots
2. If a transcript needs correction, select the slot
3. Upload a new audio file to retranscribe OR edit the transcript manually
4. Changes trigger manuscript regeneration for only affected sections

## 2. Manual Section/Chapter Insertion

**Location:** Edit Manuscript tab → Chapters section

**Capabilities:**
- Add new chapters at any position
- Add new sections within chapters
- Full control over section ordering
- Delete chapters or sections
- Each section has independent heading and body

**Usage:**
1. Go to "Edit Manuscript" tab
2. Select "Chapters" from the top menu
3. Click "+ Add Chapter" to insert a new chapter
4. Within a chapter, click "+ Add Section" to add sections
5. Edit heading and body for each section
6. Delete unwanted chapters/sections with the Delete button

## 3. Complete Manuscript Editor

**Location:** Edit Manuscript tab (new tab in ebook workspace)

**What's Editable:**

### Book Metadata
- Book Title
- Subtitle  
- Author Name

### Front Matter
- Preface
- Introduction
- Conclusion
- About the Author
- Resources List

### Chapters (for each chapter)
- Chapter Title
- Chapter Intro (opening statement)
- Epigraph (opening scripture/quote)
- All section headings and bodies
- Forward Question (bridge to next chapter)
- Key Takeaways (bullet list)
- Reflection Questions (bullet list)

### Back Matter
- Recommended Resources
- Glossary Terms
- Scripture Index (auto-generated, manual override available)

## How the Changes Flow to PDF

Every field edited in the Manuscript Editor directly maps to the PDF export:

| UI Field | PDF Location |
|----------|-------------|
| Book Title | Title page, headers, copyright page |
| Subtitle | Title page |
| Author Name | Title page, copyright page, "About the Author" |
| Preface | Preface section (recto-forced) |
| Introduction | Introduction section (recto-forced) |
| Chapter Title | Chapter opener page, running header |
| Chapter Intro | First paragraph(s) of chapter |
| Epigraph | Quote block before chapter body |
| Section Heading | Section subheadings within chapter |
| Section Body | Main chapter content |
| Forward Question | Chapter closing |
| Key Takeaways | Sidebar/callout box at chapter end |
| Reflection Questions | Discussion guide at chapter end |
| Conclusion | Conclusion section |
| About the Author | About the Author page |
| Resources List | Resources appendix |
| Glossary | Glossary appendix |

## Workflow

### Standard Editing Workflow
1. Run the pipeline to generate the initial manuscript
2. Review the generated content
3. Switch to "Edit Manuscript" tab
4. Make any needed corrections:
   - Fix book metadata
   - Refine front/back matter
   - Edit chapter content
   - Add/remove sections as needed
5. Click "Save" to persist changes to your project
6. Export to PDF/EPUB to see your edits

### Retranscribe Workflow (Phase 2)
1. Identify problematic audio source
2. Go to "Audio Sources" section in Pipeline
3. Select the slot to retranscribe
4. Upload new audio file OR edit transcript manually
5. Pipeline automatically regenerates affected sections
6. Review changes in Edit Manuscript tab
7. Save project

## Key Benefits

1. **No More Full Pipeline Reruns**: Fix individual audio sources without reprocessing everything
2. **Manual Content Control**: Insert custom sections, testimonies, or commentary anywhere
3. **Every PDF Element is Editable**: Nothing in the final book is locked - you have complete control
4. **Non-Destructive Editing**: Original pipeline output is preserved, edits are tracked separately
5. **Fast Iterations**: Make quick fixes and re-export without waiting for full regeneration

## Technical Notes

- All edits are stored in the EbookManifest structure
- Manifest is saved to IndexedDB when you save the project
- The PDF generator reads directly from the manifest, so all edits appear immediately in exports
- Undo/Redo is available at the section level in the Transcript Source Map Panel
- Chapter/section deletion includes confirmation prompts to prevent accidents

## Future Enhancements

Potential additions based on user feedback:
- Bulk chapter reordering with drag-and-drop
- Section templates for common patterns
- Find/replace across entire manuscript
- Style preset management (formatting saved with manuscript)
- Collaborative editing with change tracking
