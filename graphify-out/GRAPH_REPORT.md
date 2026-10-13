# Graph Report - MyAhorrosClaude  (2026-10-10)

## Corpus Check
- Corpus is ~47,382 words - fits in a single context window. You may not need a graph.

## Summary
- 233 nodes · 512 edges · 15 communities (12 shown, 3 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Core & Backup
- AI Statement Import
- Charts & Budget Logic
- AI Provider Client
- Privacy & CSP Rationale
- Storage Shim Internals
- Google Drive Sync
- Storage Mode Dialogs
- Drive Sign-in
- Data Serialisation
- Folder & Drive Flush
- Conflict Detection
- Service Worker

## God Nodes (most connected - your core abstractions)
1. `t()` - 26 edges
2. `driveSync()` - 23 edges
3. `moveTo()` - 19 edges
4. `driveRestore()` - 17 edges
5. `flushFolder()` - 15 edges
6. `backup()` - 14 edges
7. `bar()` - 13 edges
8. `startDrive()` - 13 edges
9. `keepCopy()` - 12 edges
10. `json()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Privacy page (English and Spanish)` --references--> `Yearly Budget Tracker web version`  [INFERRED]
  privacy.html → README.md
- `Figures never reach the website` --semantically_similar_to--> `Storage options (folder, Google Drive, browser)`  [INFERRED] [semantically similar]
  privacy.html → README.md
- `Reading statements with AI (optional)` --semantically_similar_to--> `AI for reading statements`  [INFERRED] [semantically similar]
  privacy.html → README.md
- `Google sign-in (short-lived token)` --conceptually_related_to--> `drive.file OAuth scope`  [INFERRED]
  privacy.html → README.md
- `Part 3: Google Drive OAuth setup` --references--> `Privacy page (English and Spanish)`  [EXTRACTED]
  README.md → privacy.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three user-chosen storage backends** — readme_local_folder_storage, readme_google_drive_storage, readme_browser_storage [EXTRACTED 1.00]
- **AI statement reading options** — readme_ai_providers, readme_ai_statement_reading, js_web_ai [INFERRED 0.85]
- **Local-first privacy model** — privacy_figures_never_reach_site, privacy_google_sign_in, privacy_ai_statement_reading, readme_content_security_policy [INFERRED 0.75]
- **AI statement import flow** — index_ai_import, index_aireadfile, index_aiprompt, index_airun, index_aitxresult, index_aiapply, index_finishimport [EXTRACTED 1.00]
- **Transaction import and categorisation pipeline** — index_modalimport, index_parsecsv, index_keyword_matching, index_ml_guess, index_importchecks, index_addimported [INFERRED 0.85]
- **Persistence and sync flow** — index_markdirty, index_flush, index_bodyfor, index_subscribe, index_syncstatus, index_window_claude_runtime [EXTRACTED 1.00]

## Communities (15 total, 3 thin omitted)

### Community 0 - "App Core & Backup"
Cohesion: 0.06
Nodes (30): aiPrompt() / aiContext(), Yearly Budget Tracker (index.html SPA), Backup JSON (backupJson, downloadBackup, parseBackup, modalRestore), boot(), Config documents (categories, keywords, settings, networth), Currency & number formatting (fmtNum, fmtEUR, setCurrency), DEFAULT_CATS / DEFAULT_CATS_ES, Desktop/web host events (ybt-replace-data, ybt-lang, ybt-local-render) (+22 more)

### Community 1 - "AI Statement Import"
Cohesion: 0.08
Nodes (28): AI statement import (modalAi), Editable AI rules saved in settings.aiRules (aiRulesFor), Statement balance reconciliation check (opening/closing vs found), aiApply(), aiReadFile(), aiRun(), aiTxResult(), exportXlsx() / saveWorkbook (+20 more)

### Community 2 - "Charts & Budget Logic"
Cohesion: 0.08
Nodes (27): ACTIONS data-action event dispatcher, agg() aggregation, Category budget limits (limitFor/setLimit), Custom SVG charts (drawColumns, drawLines, drawNwChart), DEFAULT_TARGETS budget split (30/30/20/20), drawNwChart(), drawOverviewCharts(), goalGrowthCalc() net worth goal projection (+19 more)

### Community 3 - "AI Provider Client"
Cohesion: 0.19
Nodes (24): aiForget(), aiSetup(), cfg(), delta(), ensure(), extra(), get(), json() (+16 more)

### Community 4 - "Privacy & CSP Rationale"
Cohesion: 0.09
Nodes (25): Reading statements with AI (optional), Deleting your data, Figures never reach the website, GoatCounter analytics script, Google sign-in (short-lived token), No accounts, analytics, ads or cookies claim, Not financial advice disclaimer, Privacy page (English and Spanish) (+17 more)

### Community 5 - "Storage Shim Internals"
Cohesion: 0.15
Nodes (14): askPersist(), enqueue(), file(), keepCurrent(), keepLocal(), lang(), normalise(), replaceAll() (+6 more)

### Community 6 - "Google Drive Sync"
Cohesion: 0.22
Nodes (20): api(), backup(), backupsDir(), del(), driveRestore(), ensureFolder(), findFile(), findFolder() (+12 more)

### Community 7 - "Storage Mode Dialogs"
Cohesion: 0.26
Nodes (12): askConfirm(), askConflict(), askExisting(), changeStorage(), chooseMode(), countTx(), has(), panel() (+4 more)

### Community 8 - "Drive Sign-in"
Cohesion: 0.31
Nodes (9): backups(), bar(), connectDrive(), extra(), loadGis(), signIn(), status(), syncNow() (+1 more)

### Community 9 - "Data Serialisation"
Cohesion: 0.53
Nodes (9): download(), moveTo(), parseData(), read(), serialise(), setMode(), start(), startDrive() (+1 more)

### Community 10 - "Folder & Drive Flush"
Cohesion: 0.32
Nodes (8): cache(), driveSync(), flushFolder(), get(), markSynced(), note(), notify(), scheduleUpload()

### Community 11 - "Conflict Detection"
Cohesion: 0.40
Nodes (5): changedElsewhere(), openOther(), pickFile(), readAt(), text()

## Ambiguous Edges - Review These
- `No accounts, analytics, ads or cookies claim` → `GoatCounter analytics script`  [AMBIGUOUS]
  privacy.html · relation: conceptually_related_to
- `loadDataset()` → `Guided tour (startTour, tourGo)`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to

## Knowledge Gaps
- **41 isolated node(s):** `Browser-only storage`, `Part 2: Custom domain and DNS`, `config.js (Google Client ID)`, `Drive sync behavior and conflict handling`, `Content security restrictions (scripts and network)` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 61 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Storage options (folder, Google Drive, browser)` connect `Privacy & CSP Rationale` to `Storage Shim Internals`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **What connects `Browser-only storage`, `Part 2: Custom domain and DNS`, `config.js (Google Client ID)` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Core & Backup` be split into smaller, more focused modules?**
  _Cohesion score 0.06417112299465241 - nodes in this community are weakly interconnected._
- **Should `AI Statement Import` be split into smaller, more focused modules?**
  _Cohesion score 0.07741935483870968 - nodes in this community are weakly interconnected._
- **Should `Charts & Budget Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `No accounts, analytics, ads or cookies claim` and `GoatCounter analytics script`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `loadDataset()` and `Guided tour (startTour, tourGo)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._