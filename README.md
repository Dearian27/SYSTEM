# SYSTEM Engine — Documentation

## Overview

This is a custom productivity system built on top of Obsidian.

The system treats markdown notes as **source data** and uses a Node.js + TypeScript engine to:

- parse daily work sessions
- aggregate effort
- compute sprint analytics
- generate dashboards (markdown + excalidraw)

---

## Core Concept

```
Daily Notes (source of truth)
        ↓
Sessions Parser
        ↓
Aggregations (spent, stats)
        ↓
Sprint Analytics
        ↓
Dashboard (markdown + visuals)
```

---

## Folder Structure

```
SYSTEM/
├─ Daily Reports/       # daily logs (source of truth)
├─ Tickets/             # tasks / habits / work units
├─ sprints/             # sprint definitions (date ranges)
├─ dashboard/           # generated UI (markdown + charts)

└─ .engine/             # data engine
   ├─ src/
   │  ├─ config.ts
   │  ├─ types/
   │  ├─ utils/
   │  ├─ readTickets.ts
   │  ├─ readSprints.ts
   │
   ├─ scripts/
   │  ├─ parseDailySessions.ts
   │  ├─ buildTicketSpent.ts
   │  ├─ buildTicketStats.ts
   │  ├─ buildCurrentSprintSummary.ts
   │  ├─ buildDashboard.ts
   │  ├─ buildBurndown.ts
   │  ├─ buildBurndownExcalidraw.ts
   │  ├─ syncSpentToTickets.ts
   │
   ├─ .generated/       # computed data (JSON)
   ├─ package.json
   └─ tsconfig.json
```

---

## Data Model

### Sessions (from daily notes)

```
`09:00` | [[Ticket Name]]
```

Parsed into:

```ts
type SessionEntry = {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  ticketName: string;
  sourceFile: string;
};
```

---

### Tickets

Stored as markdown with frontmatter:

```yaml
---
type: ticket
area: programming
status: in-progress
estimate: 8
spent: 0
---
```

---

### Sprint

```yaml
---
type: sprint
name: Sprint-2026-03
start: 2026-03-01
end: 2026-03-31
---
```

---

## Key Design Decisions

### 1. Sessions are source of truth

- No manual tracking of effort
- Everything derived from daily logs

---

### 2. Sprint = date range

- Tickets are NOT assigned to sprint manually
- A ticket belongs to sprint if it has sessions in that period

---

### 3. Derived fields

These are computed automatically:

- spent
- remaining
- sprint stats

---

## Scripts Pipeline

```
parse:sessions
→ build:ticket-spent
→ build:ticket-stats
→ build:sprint-summary
→ build:dashboard
→ build:burndown
→ build:burndown-excalidraw
→ sync:spent
```

---

## Generated Files

```
_engine/.generated/
├─ sessions.json
├─ ticket-spent.json
├─ ticket-stats.json
├─ sprint-summary.json
├─ burndown-data.json
```

---

## Dashboard

Generated into:

```
SYSTEM/dashboard/
├─ sprint-dashboard.md
├─ burndown.md
├─ burndown.excalidraw
```

---

## Burndown Logic

```
sessions (filtered by sprint)
→ group by day
→ cumulative spent
→ remaining = estimate - spent
```

---

## Excalidraw Integration

Burndown chart is generated as:

```
burndown.excalidraw
```

Contains:

- frame
- polyline (graph)
- optional labels

NOTE:
Inline preview requires `.excalidraw.md` format.

---

## Performance Strategy (future)

Planned optimizations:

- archive old daily notes
- incremental rebuild
- cached baseline effort

---

## Run Commands

```
npm run build:all
npm run sync:spent
npm run build:burndown
```

---

## Future Improvements

- daily dashboard
- velocity tracking
- ideal burndown line
- excalidraw axes + labels
- UI control panel

---

## Philosophy

This system behaves like:

```
markdown → database
engine → backend
dashboard → frontend
```

---

## Notes

- `.engine` should be excluded from Obsidian search
- `.generated` should not be committed to git
- prefer simplicity over premature optimization

---

## Terminology

- Effort points (EF) – measures the effort (30mins of work), wasted in the tickets, it gets calculated for doing analytics
