# Design QA

- Source visual truth:
  - `F:/设计方案/2026作品集/作品集/网页版/2x/1资源 1@2x.png`
  - `C:/Users/Lenovo/AppData/Local/Temp/codex-clipboard-af0cd633-3c72-42d2-93bf-73e13c48046d.png`
  - `C:/Users/Lenovo/AppData/Local/Temp/codex-clipboard-fa3d4451-6971-4db2-80dd-39e2007df11f.png`
  - `C:/Users/Lenovo/AppData/Local/Temp/codex-clipboard-ad0ce613-0173-4d53-93e1-b10da8e5aa21.png`
  - `F:/设计方案/2026作品集/将军账号ui/VI/2x/1画板 1@2x.png`
  - `F:/设计方案/2026作品集/将军账号ui/VI/2x/1画板 7@2x.png`
  - `F:/设计方案/2026作品集/将军账号ui/VI/2x/1画板 8@2x.png`
  - `F:/设计方案/2026作品集/将军账号ui/VI/2x/1画板 9@2x.png`
  - `F:/设计方案/2026作品集/将军账号ui/VI/2x/1画板 10@2x.png`
  - `F:/设计方案/2026作品集/将军账号ui/VI/2x/1画板 11@2x.png`
  - `F:/设计方案/2026作品集/将军账号ui/VI/2x/1画板 12@2x.png`
  - `C:/Users/Lenovo/AppData/Local/Temp/codex-clipboard-7b1dcf81-2b39-46f3-9715-89d8f03631db.png`
  - `D:/桌面/2x/资源 6@2x.png`
  - `D:/桌面/2x/资源 7@2x.png`
  - `C:/Users/Lenovo/AppData/Local/Temp/codex-clipboard-7a6261b3-47c4-440b-8001-77bb36017f25.png`
  - `C:/Users/Lenovo/AppData/Local/Temp/codex-clipboard-1514192e-3d2c-4559-aa28-831e889e3bef.png`
  - `C:/Users/Lenovo/AppData/Local/Temp/codex-clipboard-58c158f1-2ca0-46f0-aa21-af46b3f0cd30.png`
  - `D:/桌面/2x/资源 8@2x.png`
  - `D:/桌面/2x/资源 10@2x.png`
  - `D:/桌面/2x/资源 6@2x.png`
  - `http://127.0.0.1:4173/head-turn-demo/`
  - `http://127.0.0.1:4173/head-turn-demo/?v=instant-4`
- Implementation: `http://127.0.0.1:5176/`
- Intended viewport: fixed proportional 16:9 desktop canvas
- Implementation screenshot: unavailable from the active in-app browser tooling
- State: white 2026 portfolio system with layered pointer-responsive IP animation on the home and ending pages, crisp native foreground typography/shapes reconstructed from the supplied artboards, restored About Me project marquee, one resume IP, resume accordion, and project gallery cards

## Full-view comparison evidence

- Home and ending use the same vendored `instant-4` animation as the final/back visual layer at 97.2% canvas scale. Each instance plays the native source from 4–6 seconds on its first viewport entry, then uses 43 copied native JPG frames with the demo's nonlinear angle map, 24ms response, and at most two frame steps per display update.
- The supplied `资源 6@2x.png` and `资源 10@2x.png` are now visual references rather than scaled full-page foreground bitmaps. Their visible text, pills, line, tags, metadata and labels are reconstructed as native HTML/CSS so they stay sharp.
- The home native foreground is displayed at 90% scale and the ending native foreground at 90.25%; the former three transparent home navigation hotspots remain removed.
- The ending page overrides the legacy hidden-cursor rule with a visible crosshair cursor for the head-turn interaction.
- Cover, About Me, resume, and ending use the same 16:9 canvas and preserve a single proportional composition across viewport sizes.
- Pages 1, 2, 3, and 5 share the same full-width 16:9 dimensions. Page 4 keeps the same width but remains intentionally content-height so all eight project cards stay visible without compressing the card system.
- All page surfaces are light gray-white with black typography; project cards are borderless light gray.

## Focused interaction evidence

- About Me copy and the restored eight-project marquee enter from left to right; the marquee loops, pauses on hover, enlarges the focused image by 30%, and opens the matching project.
- Resume uses three date-and-role work-experience sections with the supplied content.
- Resume rows are bottom-aligned, omit the old 01/02/03 prefixes and expand labels, open the first role by default, and expand one company/detail block at a time from a black date-and-role title.
- Resume uses the latest supplied transparent pouting IP as one static image; the prior hover crossfade is removed.
- Project cards use a dedicated bottom information row so number, project title, description, and a high-contrast open control remain in normal layout flow instead of being clipped by absolute positioning.
- The resume list width is reduced to move every experience heading and description farther right of the IP.
- Card numbers and titles share a typographic baseline and sit slightly higher. Every description/control row is anchored to the same bottom inset so the first card cannot lose its longer three-line introduction; the visible button bottom aligns with the description bottom. The open control uses a precisely cropped view of the supplied `点击观看` reference image rather than an approximate text-and-glyph recreation.
- Card bottom rows are direct children of each card and use card-relative positioning; headings are shifted upward by exactly 3px. Every two-digit number and Watch control is then shifted downward by exactly 5px as the latest annotation requests.
- Every project-name label is shifted downward by 2px. Both main English title groups are reduced by 20%, use a lighter weight, and move upward by 3px; the shared top-right category pill now has the full reference height and radius. The home profile block moves downward by 5px, and the ending divider line is removed.
- The large home/ending title lines, `Design Project`, and `Curriculum Vitae` are widened horizontally by 10% without a height change. Main-title tracking is slightly widened; the two section headings use the About Me heading's neutral tracking. The home title's `<2026>` moves down 2px, and the ending Chinese copy uses increased line spacing.
- Latest annotation offsets: home title `<2026>` another 2px down; ending title `<2026>` 5px up and 2px left; every card's right-edge English word 5px down and 2px left.
- Final incremental offsets: home title `<2026>` another 1px down; ending title `<2026>` another 5px up; every right-edge English card word another 5px left.
- The project-list heading reads `Design Project`; the far-right uppercase `MY DESIGN` label matches the resume page's small gray `About Me` treatment.
- Card numbers and project titles are inline. Cards 02–06 use their first gallery image, project 07 uses its fourth image, and projects 01/08 retain their existing covers.
- Project 04 opens the eight supplied 将军账号 UI artboards in the requested sequence, with the latest supplied `/07_界面展示` artboard as its final image.

## Findings

- [Blocked] Browser-rendered comparison capture unavailable
  - Location: all five main sections and modal state.
  - Evidence: all four references were opened at original resolution, but the active in-app browser does not expose a screenshot capture tool to this task.
  - Impact: exact placement, crop, hover interpolation, and responsive proportionality cannot be certified through a same-state visual comparison.
  - Fix: capture the live 16:9 home, About Me hover, resume hover, project list, and one opened modal when browser capture becomes available, then compare them beside the references.

## Technical checks

- Production build passed.
- Sites packaging tests passed: 4/4.
- Local preview responds with HTTP 200 at `http://127.0.0.1:5176/`.
- The eight 将军账号 UI image assets were copied into `public/assets/jiangjun/` in the requested order and are project-local.
- The latest supplied home, ending, About Me, and project 04 ending assets are copied into the project and referenced directly.
- The `instant-4` source video and all 43 interaction frames are vendored into the project, so the home and ending animation does not depend on the separate port-4173 demo remaining online.

final result: blocked
