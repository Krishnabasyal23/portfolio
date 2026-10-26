# Decisions

- 2026-10-25 Theme: Nepal-inspired scroll (prayer flags, Himalayan ridge, dhaka pattern, pagoda, mandala) with stamp statuses. Distinctive, culturally mine, and the stamps carry the "verify" theme.
- 2026-10-25 Plain HTML/CSS/JS, no framework. Small enough to explain every line; opens from file://, hosts anywhere static.
- 2026-10-25 Projects written directly in HTML, not a JSON file. fetch() breaks on file://, and five panels don't justify a data layer.
- 2026-10-25 Ornament only, no deities. Sacred imagery is easy to get disrespectfully wrong.
- 2026-10-25 Stamps are spans, not links, until repos are public. No dead links.

- 2026-10-25 Skills are split into "in use" and "applying next". Only claim what a project already demonstrates; SQL and pandas wait for DineSafe Atlas.
- 2026-10-25 Experience names the role, not the employer, and keeps kitchen detail generic. Nothing from a workplace belongs on a public site.
- 2026-10-25 Visual checks use headless Edge screenshots at desktop width and in a 390px iframe; mid-animation captures can clip the mandala, so check with reduced motion too.
- 2026-10-25 One cat drawing defined once as an SVG symbol and reused (string, footer, game runner, plate). Colour and fill come from CSS, so there is a single set of paths to explain.
- 2026-10-25 Vintage look is CSS only: an SVG noise filter as a data-URI background for paper grain, an inset shadow for edge wear, a hatching pattern for the engraved plate. No image files.
- 2026-10-25 The pocket game commits to SHA-256(secret) before the round and derives the crash from a second hash of the same secret. Deriving it from the published seal would leak the crash point.
- 2026-10-25 The game has no money, accounts or server. Best score is stored in localStorage inside try/catch and the page works without it.
- 2026-10-26 Chinese hanging-scroll motifs (rods, unrolling paper, peach blossoms, lanterns, red seal) are original drawings in the spirit of the genre. No characters, logos or artwork from any film.
- 2026-10-26 Panel reveal uses a scroll-position check, not IntersectionObserver: a panel clipped to nothing before it unrolls is reported as not visible and would never open. Everything also opens at the bottom of the page, and the hidden state only exists when JS has added the armed class.
- 2026-10-26 Falling petals, swaying flags and lanterns all stop under prefers-reduced-motion; the branch and lanterns are hidden on narrow screens.
- 2026-10-26 The red seal reads 验 (verify), tying the "don't trust, verify" theme to the scroll motif. Its font is loaded with a text= subset so only that one glyph is downloaded.
- 2026-10-26 404 page keeps its styles inline because GitHub Pages serves it at any path, where relative links to styles.css would break.
- 2026-10-26 Section links open a portal ring (orange spark rings, original artwork) at the click, jump while it is open, then dissolve it at the destination. It is skipped for reduced motion and modifier-clicks, ignores clicks mid-animation, and moves focus to the target so keyboard users land in the right place. No film names, logos or artwork are used.
- 2026-10-26 Portal rebuilt on a canvas and lengthened to about 3 seconds: a spark draws the ring, geometric rings spin, sparks shower, the ring swells over the screen, the page jumps, then the ring reopens at the destination and fades. The first CSS version (about 0.7s) was too quick to read as an effect. Click or Escape skips ahead, scrolling is blocked while it runs, and reduced-motion visitors get a plain jump.
