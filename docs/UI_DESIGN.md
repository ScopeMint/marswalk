UI DESIGN PLAN (words only, no code)

DESIGN GOAL: a judge opens the link and understands it in 10 seconds, and sees a working route in 30.
Main target screen: laptop, about 1440 x 900. Works down to about 1100 px wide. Phones are not a priority;
show a friendly "best on a laptop or tablet" note on small screens.

1. FIRST IMPRESSION (very important)
- The page opens ALREADY showing an example mission, "Boxwork Survey": habitat marked, one target chosen,
  route drawn, summary card filled in. No empty screen.
- A small button "Try your own mission" clears it. A button "Reload example" brings it back.
- A dismissible 3-step welcome card: (1) Pick a target. (2) Set limits. (3) Read the safety summary.

2. SCREEN LAYOUT (four regions)
TOP BAR (height about 56 px)
  Left: project name + tagline "Walk Mars safely: a layered EVA planner"
  Middle: "Mission: Boxwork Survey - Gale Crater, Mount Sharp"
  Right: buttons: "About and Sources", "Assumptions", "Reload example"

LEFT PANEL - MISSION SETUP (width about 300 px)
  1. Science goal (a short dropdown, one choice at first: "Study boxwork formations")
  2. Target list: 4-6 cards, each with name, one-line why-it-matters, distance from habitat.
     Click a card = select it, map flies to it, route draws.
  3. Limits (sliders with live numbers):
       Slope limit: 5 to 25 degrees (default 15)
       EVA length: 2 to 8 hours (default 6)
       Walking speed on flat ground: slow / normal / fast (3 presets, shows km/h)
       EVA start time: local Mars time of day (default morning)
  4. Button: "Move habitat" (click map to place it), small note it resets walk-back map.
  5. Button: "Draw no-go zone" (draw a polygon over ground that looks too rocky; list with delete buttons)

CENTER - THE MAP (fills the rest)
  - Leaflet map, Mars imagery base.
  - Study-area outline (thin white box), outside area slightly darkened.
  - Habitat icon (a house/dome shape), target icons (numbered circles), route line (thick, bright),
    no-go zones (hatched amber).
  - Scale bar in meters/kilometers. Coordinates readout at bottom-left of the map.
  - Hover on the map: tooltip with elevation (m), slope (degrees), and walk-back time (min).
  - Floating SUMMARY CARD, top-right of the map (see section 4).

RIGHT PANEL - LAYERS (width about 260 px)
  - List of layers with an on/off switch and an opacity slider each:
      1. Imagery (HiRISE/CTX)         default ON
      2. Slope classes                 default ON, 60 percent
      3. Walk-back time                default OFF
      4. Thermal (THEMIS day/night)    default OFF  (with a day/night toggle)
      5. Minerals (CRISM)              only if we have it
      6. Science targets               default ON
  - Each layer has an "i" button: what it shows, which NASA mission, resolution, source link.
  - Legend block updates to the layers that are on.

BOTTOM BAR (height about 200 px, collapsible)
  Left: ELEVATION PROFILE of the route (distance across, height up), steep parts shaded amber/red.
  Right: TEMPERATURE CHART for the EVA window (hours across, temperature up), EVA time shaded.

3. KEY INTERACTIONS (user story)
  1. Visitor lands on example mission and sees the route.
  2. Clicks a different target card -> map flies there -> route and summary update in under 1 second.
  3. Drags the slope limit down to 8 degrees -> route detours or turns "No walkable route" with message.
  4. Toggles "Walk-back time" -> colored zones show how far from home each place is in minutes.
  5. Opens POV drawer -> sees a real Curiosity photo near the target, with credit.
  6. Reads the safety checklist and warnings.
  7. Clicks "Download mission plan" (stretch).

4. SUMMARY CARD (top-right of the map)
  Title: "Mission summary"
  Rows (large numbers, small labels):
   - Route distance (km)
   - Walking time one way (minutes)
   - Steepest slope on route (degrees) with a small "limit 15" tag
   - Total climb / total descent (meters)
   - Walk-back time from the target (minutes)
   - EVA time used (percent) as a progress bar
   - Estimated radiation dose for this EVA (value + unit) with a source icon
   - Temperature range during the EVA (min to max) with a source icon
  Below: SAFETY CHECKLIST with three states per line: pass (green check), caution (amber triangle),
  fail (red X). Always an icon AND words, never color alone.
   Examples: "Slope within limit", "Round trip fits in EVA time", "Reserve time kept",
   "Temperature in range", "Route avoids no-go zones".
  Button: "Show photo from this target" opens the POV drawer.

5. POV DRAWER (slides in from the right)
  - Large photo, caption (what it shows, which camera, which sol), credit line, link to NASA.
  - Next/previous arrows across the target photos.
  - Text under the photo: "What you should expect on arrival" (2-3 lines from our science notes).
  - If no photo for that target: say "No surface photo near this target yet".

6. ASSUMPTIONS PANEL (modal)
  - Table: assumption name, value, why we chose it, "our assumption" or "sourced from ...".
  - Items: study area size, cell size, slope limit, walking speed, reserve rule, no-go zone idea,
    radiation baseline note, temperature note.
  - A line that says plainly: "This is a planning concept, not flight software."

7. ABOUT AND SOURCES PAGE (modal or sub-page)
  - One paragraph: what this is and what challenge it answers.
  - The 5 data layers with mission names.
  - Full list of sources and licenses (copy from docs/SOURCES.md).
  - AI-use statement (copy from docs/AI_USE.md).
  - Limits and honesty notes.
  - Team names and the challenge name.

8. VISUAL STYLE
  Mood: calm mission-control, tablet-in-a-habitat. Dark theme so imagery pops and screen is easy on eyes.
  Colors (names + hex, all in one list at the top of styles.css):
    Background           #0F1115
    Panel                #181B22
    Panel border         #2A2F3A
    Main text            #E8E6E3
    Muted text           #A3A8B3
    Accent (Mars orange) #D9622B
    Route line           #3FD0C9  (bright cyan: stands out against orange/brown Mars imagery)
    Safe / pass          #46C37B
    Caution              #F2B134
    Danger / fail        #E5484D
  Slope classes (each also gets a label in the legend):
    0-5 degrees   very gentle   #2E7D5B
    5-10          gentle        #8FBF4D
    10-15         moderate      #F2B134
    15-20         steep         #E8742E
    over 20       very steep    #E5484D
  Rule: class edges follow the slope-limit slider when possible, so the "red" starts at the limit.
  Fonts: system sans-serif for text; a monospace font for numbers so digits line up.
  Sizes: body text at least 14 px; summary numbers 24-28 px.
  Contrast: text against its background should meet 4.5:1 (a standard accessibility ratio).
  Spacing: 8 px grid (all gaps are multiples of 8).
  Motion: short (about 200 ms) fly-to and fade. Respect "reduce motion" setting.

9. ACCESSIBILITY BASICS
  - Everything clickable works with Tab and Enter.
  - Buttons and sliders have text labels (for screen readers).
  - Never use color alone to carry meaning (icons and words too).
  - Focus outline visible.

10. MICROCOPY (exact words to use)
  Tagline: "Walk Mars safely: a layered EVA planner"
  Empty route: "Pick a target to plan a route."
  Blocked: "No walkable route at this slope limit. Try raising the limit or choosing a closer target."
  Outside area: "Pick a point inside the study area."
  Loading: "Loading Mars data..."
  Footer line: "Data: NASA Mars missions. A planning concept, not flight software."

11. STRETCH UI (only if time)
  - "Visor mode": a simplified, high-contrast view with big arrows and just distance, time, warnings.
  - "Compare two routes": different slope limits side by side.
  - Print or download the mission plan.
