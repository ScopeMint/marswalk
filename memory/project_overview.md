---
name: project-overview
description: 2026 NASA Space Apps Challenge — EVA Planner web app for Mars Marswalk at Gale Crater / Mount Sharp
metadata:
  type: project
---

**Project:** EVA Planner — layered Mars surface EVA planning tool for the NASA Space Apps 2026 challenge, theme "The Next Frontier."

**Why:** Build a hyper-local Mars map (6 km x 6 km) for studying boxwork formations at Gale Crater / Mount Sharp. Existing tools (JPL Mars Trek) are global-scale only. This fills the gap at astronaut walking scale.

**Stack:** Static HTML + CSS + plain JavaScript + Leaflet. Python scripts for data prep. GitHub Pages hosting. No server, no API keys.

**Five data layers:** (1) topography/slope, (2) optical HiRISE/CTX tiles, (3) thermal THEMIS, (4) radiation RAD + temperature REMS, (5) spectral CRISM [optional].

**Key features:** slope-aware route planner (A*), walk-back-time map, EVA budget with 25% reserve, safety checklist, real Curiosity POV photos, all numbers sourced or labeled "our assumption."

**Team:** Dark Matter Devs. 4 members total, 2 primary builders (Data+Route / Map+UI), 1 on research/sources, 1 on story/demo.

**Event timeline:** Hackathon Sat Nov 14 – Sun Nov 15, 2026. No code before 9 AM Sat. Submit by Sun 6 PM.

**Hard rules:** Cite every source in docs/SOURCES.md. Log AI use in docs/AI_USE.md. No NASA logos. No invented numbers. Public GitHub Pages link required.

**How to apply:** Every code session should reference CLAUDE.md. All numbers must come from config.js or data files. Commit after each working step. Update SOURCES.md and AI_USE.md as files are created.
