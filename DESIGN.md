---
name: BznsFlow
description: An account-book system for a done-for-you AI front office — cream stock, black ink, and numbers set as evidence.
colors:
  paper: "#F6EFDF"
  paper-ruled: "#EBE1C9"
  card: "#FFFFFF"
  ink: "#1A1A1A"
  ink-secondary: "#4B5563"
  ink-muted: "#565E6B"
  rule: "rgba(0, 0, 0, 0.08)"
  rule-strong: "rgba(0, 0, 0, 0.15)"
  annotation-blue: "#5C95C6"
  annotation-green: "#51A47B"
  annotation-orange: "#F28C54"
  annotation-coral: "#E16B71"
  annotation-yellow: "#EEB462"
  whatsapp: "#25D366"
typography:
  display:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(2.6rem, 5vw, 4.4rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  figure:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "'tnum' 1"
  body:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  lede:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  label:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
  arabic:
    fontFamily: "'IBM Plex Sans Arabic', 'Noto Sans Arabic', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: "normal"
rounded:
  none: "0"
  sm: "4px"
  md: "8px"
  pill: "999px"
spacing:
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "16px 28px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "16px 28px"
  button-whatsapp:
    backgroundColor: "{colors.whatsapp}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "16px 28px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "32px"
  chip:
    backgroundColor: "{colors.paper-ruled}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
---

# Design System: BznsFlow

## Overview

**Creative North Star: "The Ledger"**

This is an account book, not a brochure. The page is cream stock, the type is black ink, and the structure is ruled rather than boxed. A ledger earns trust by showing its arithmetic in the open — which is exactly the position the product takes, in its own words: *measure it in arithmetic, not adjectives*. Everything in the system serves that: rules and figures carry the page, colour annotates it, and nothing is decorated to look more certain than it is.

The density is generous but disciplined. Sections are separated by rules and whitespace, not by a stack of floating panels. Where the incumbent site wrapped almost every idea in a white card, the Ledger sets most content directly on the paper and reserves the raised surface for the few things a visitor is meant to act on. Numbers are the visual hero: a measured figure like *242 inquiries, one missed* is set at display scale with tabular figures, given a rule above and below, and attributed to the named business it came from. That treatment is the system's whole argument — a specific, checkable number outranks any adjective available.

The pairing is deliberately unglamorous. Poppins is a plain geometric grotesque that gets out of the way of a figure; IBM Plex Sans Arabic is a serious text face with real Arabic construction rather than a Latin face with Arabic bolted on. Arabic is the original here, not the translation, so the Arabic setting is designed first and the Latin follows it.

Confirmed anti-references: the soft diffuse card shadow, the blue halo glow, and the blue→green gradient ramp that currently runs across 32 declarations and seven of nine section titles. These are the incumbent implementation's tells and the system replaces them outright. Colour, typography and spacing tokens are otherwise inherited from the incumbent code, which already matches the brand system.

**Key Characteristics:**
- Cream paper and black ink; colour is annotation, never surface
- Ruled structure — horizontal rules and alignment do the work panels used to do
- Figures set large, tabular, and always attributed
- Hard offset shadows, reserved for what the visitor acts on
- Arabic-first typography with true RTL mirroring
- Flat by default; elevation is a signal, not a texture

## Colors

A warm, low-contrast paper ground carrying near-black text, with five saturated accents that behave like marks made on top of the page rather than materials the page is built from.

### Primary
- **Ink** (`#1A1A1A`): All body and heading text, every rule and border at full strength, and the fill of the primary button. This is the system's only true "brand colour" — the near-black does the work a corporate accent usually does.

### Secondary
- **Annotation Blue** (`#5C95C6`): The interactive signal. Links, focus rings, the active nav item, and the selected state on any control. Because it is the one colour that means "you can act on this", it never appears as decoration.
- **Annotation Green** (`#51A47B`): Confirmation and positive measurement — an answered inquiry, a met threshold, a completed pipeline stage. Also the WhatsApp path's supporting tint.

### Tertiary
- **Annotation Orange** (`#F28C54`): Emphasis on a figure that matters, and the marker on the recommended plan. Used sparingly enough that it reads as a highlighter stroke.
- **Annotation Coral** (`#E16B71`): The cost of the problem — the missed inquiry, the leak, the gap. Never used for an error state in a form; it carries editorial meaning, not validation.
- **Annotation Yellow** (`#EEB462`): Reserved for in-progress or partial states.

### Neutral
- **Paper** (`#F6EFDF`): The page ground. Almost every section sits directly on it.
- **Paper Ruled** (`#EBE1C9`): The alternating band that separates one section from its neighbour without a border, and the fill of chips and inset figures.
- **Card** (`#FFFFFF`): Reserved for genuinely raised surfaces. Pure white against cream reads as a sheet laid on the desk, which is why it must stay rare.
- **Ink Secondary** (`#4B5563`) and **Ink Muted** (`#565E6B`): Supporting text and captions. Ink Muted is the system's contrast floor and is only legal on Paper or Card, never on Paper Ruled.
- **Rule** (`rgba(0,0,0,0.08)`) and **Rule Strong** (`rgba(0,0,0,0.15)`): Hairlines. Rule Strong marks a structural division; Rule marks a division inside a group.

### Named Rules

**The Annotation Rule.** Accent colours mark the page; they never build it. No accent may be a section background, a card fill, or a large area of colour. If an accent occupies more than roughly 5% of a viewport, it has stopped annotating and become decoration.

**The One Blue Rule.** Annotation Blue means "interactive" and nothing else. A static element may not be blue for emphasis — use Orange, or use weight.

**The Muted Floor Rule.** Ink Muted on Paper Ruled fails WCAG 2.2 AA and is prohibited. Inside a Paper Ruled band, supporting text steps up to Ink Secondary.

## Typography

**Display Font:** Poppins (with Helvetica Neue, Arial, sans-serif)
**Body Font:** Poppins — one Latin family across the whole system
**Arabic Font:** IBM Plex Sans Arabic (with Noto Sans Arabic, sans-serif)

**Character:** Poppins is a geometric grotesque with near-circular bowls and no eccentricity — chosen precisely because it does not compete with a number set beside it. IBM Plex Sans Arabic is drawn as an Arabic text face rather than adapted from Latin, with the open counters and generous descender treatment that keep Arabic legible at small sizes on a phone. The pairing is functional rather than expressive: the system's personality comes from structure and figures, not from letterforms.

### Hierarchy
- **Display** (800, `clamp(2.6rem, 5vw, 4.4rem)`, 1.05, `-0.02em`): The hero statement. Once per page.
- **Headline** (800, `clamp(2rem, 4vw, 3rem)`, 1.15, `-0.015em`): Section titles. Set flush to the grid, never centred over a full-width column.
- **Figure** (700, `clamp(2.5rem, 6vw, 4rem)`, 1, `-0.03em`, tabular): Measured numbers only. Tabular figures are mandatory so digits align in a column.
- **Lede** (400, `1.1rem`, 1.75): The paragraph under a headline. Capped at 65ch.
- **Body** (400, `1rem`, 1.6): Running text. Capped at 70ch.
- **Label** (600, `0.75rem`, 1.2, `0.08em`, uppercase for Latin): Section eyebrows, chips, button text, table headers. **Never uppercase Arabic** — Arabic has no case, and letter-spacing breaks its joins.

### Named Rules

**The Tabular Figure Rule.** Any number presented as evidence uses `font-variant-numeric: tabular-nums`. A figure that shifts width as it animates or updates is not evidence, it is decoration.

**The Arabic-First Rule.** Every type decision is checked in Arabic before it is accepted in English. Arabic line-height is set to 1.8 against Latin's 1.6, because Arabic ascenders and descenders need the room. `letter-spacing` is never applied to an Arabic run.

**The No Gradient Text Rule.** Text is Ink, or it is an accent at full opacity. Gradient-filled type is prohibited — it was the incumbent system's most-repeated tell and it degrades to invisible where background-clip is unsupported.

## Layout

A 12-column grid inside a centred container with 24px side gutters, collapsing to a single column below 768px. Vertical rhythm is one token — `clamp(72px, 9vw, 120px)` — applied as section padding, so the page keeps a steady cadence regardless of a section's internal density.

Sections alternate between Paper and Paper Ruled grounds instead of being separated by cards or borders. That alternation is the primary structural device; a section that needs further division uses a hairline rule, not a container.

Content is set flush to the grid rather than centred. The incumbent hero centres everything in a `100vh` flex box, which is the composition that most reads as generic — the Ledger replaces it with a left-aligned (RTL: right-aligned) statement and a measured figure block that sits on the grid beside it.

Breakpoints consolidate to five: 480, 640, 768, 1024, 1280. The incumbent's fourteen distinct widths — including four near-identical small values at 480/520/560/600 owned by different stylesheets — collapse into this scale.

Spacing is the 8px scale already in the tokens. Grid gaps and card padding use the scale directly rather than raw pixel values.

## Elevation & Depth

**Flat by default.** The page has no ambient depth: surfaces sit on the paper and are separated by tone, rule and whitespace. Elevation is reserved as a signal, and it is structural rather than atmospheric — a hard, unblurred offset in Ink, as though the element were a physical card casting a sharp shadow in raking light.

Only three things are permitted to be raised: the primary and WhatsApp buttons, the recommended plan, and transient overlays (chat panel, modal, mobile menu). Everything else — every content card, chip, list item, and section — is flat.

### Shadow Vocabulary
- **Raised** (`box-shadow: 4px 4px 0 var(--ink)`): The resting state of an actionable element. In RTL this mirrors to `-4px 4px 0` via the existing `--x-sign` token.
- **Pressed** (`box-shadow: 0 0 0 var(--ink)` with `translate(4px, 4px)`): The active state. The element moves into its own shadow and the shadow disappears — a physical displacement, not a colour change.
- **Overlay** (`box-shadow: 8px 8px 0 var(--ink)`): Modals, the chat panel, and the mobile menu, which sit further off the page.
- **Focus** (`outline: 2px solid var(--annotation-blue); outline-offset: 2px`): Keyboard focus is an outline, never a glow. It must be visible against Paper, Paper Ruled, Card, and Ink.

### Named Rules

**The Flat-By-Default Rule.** A surface earns a shadow only by being actionable or transient. If it cannot be clicked and it is always on screen, it is flat.

**The No Blur Rule.** Shadow blur radius is `0`. Any `box-shadow` with a blur value, and any `filter: blur()` used to fake ambient light, is prohibited. This retires `--shadow-glow` and the three radial aurora blobs.

**The Displacement Rule.** Pressing moves the element by exactly the shadow offset, so the sum of element position and shadow is constant. Motion is 120ms, no easing overshoot.

## Shapes

Corners are nearly square. The system uses `4px` as its standard radius and `0` wherever an edge should read as a cut rather than a curve — rules, section bands, and the alternating grounds are always hard-edged. `8px` is the maximum radius for any rectangular surface; the incumbent's 20px and 28px radii are retired because a soft corner under a hard shadow reads as a mistake.

The one exception is the chip, which stays fully rounded (`999px`) so it remains visually distinct from a button at a glance. The incumbent wrote this as both `100px` and `999px` across different sheets; `999px` is now the single token.

Borders are hairlines at `1px`. A border and a shadow never appear on the same element — the shadow already establishes the edge.

Isometric block forms from the brand system are permitted as illustration inside a section, but never as a container for content.

## Components

### Buttons
- **Shape:** Nearly square (`4px` radius), never pill-shaped.
- **Primary:** Ink fill, Paper text, Label typography, `16px 28px` padding, Raised shadow at rest.
- **WhatsApp:** WhatsApp green fill, Ink text — the green is light enough that black text is the accessible pairing, not white. Same shape and shadow as Primary.
- **Secondary:** Paper fill, Ink text, `1px` Ink border, no shadow. Used for the second of the two co-primary actions so the pair reads as a choice rather than a hierarchy.
- **Hover:** No colour change. The shadow deepens from `4px` to `6px` and the element lifts `-2px`. 120ms.
- **Active:** Pressed shadow — element translates into its shadow.
- **Focus:** Blue outline, `2px` offset. Never removed, never replaced with a glow.

### Chips
- **Style:** Paper Ruled fill, Ink Secondary text, Label typography, fully rounded, no border, no shadow.
- **State:** A selected chip inverts to Ink fill with Paper text.

### Cards / Containers
- **Corner Style:** `4px`.
- **Background:** Card white on a Paper section; Paper on a Paper Ruled section. Never Card on Card.
- **Shadow Strategy:** None. Cards are flat and bounded by a hairline Rule.
- **Border:** `1px` Rule.
- **Internal Padding:** `32px`, dropping to `24px` below 768px.
- **Nesting:** Prohibited beyond one level. The incumbent's card → panel → pill chain inside a single pricing cell collapses to one container with typographic hierarchy.

### Inputs / Fields
- **Style:** Card fill, `1px` Rule border, `4px` radius, `14px 16px` padding, Body typography.
- **Focus:** Border steps to Annotation Blue and a `2px` blue outline appears at `2px` offset. No glow, no shadow.
- **Error:** Border and message in Annotation Coral, with a text message always present — colour never carries the meaning alone.
- **Disabled:** Paper Ruled fill, Ink Muted text, no border change.

### Navigation
- **Style:** Transparent over Paper at rest; on scroll it gains a Paper background and a bottom hairline Rule. No blur, no translucency.
- **Typography:** Label, Ink Secondary at rest, Ink when active, with a `2px` Ink underline on the active item.
- **Mobile:** Full-screen Paper panel — not a dark translucent overlay — with the same left-aligned rhythm as the page.
- **Sign-in:** Rendered as a text link, not a filled button. It serves existing users and must not outrank the two conversion actions.

### The Figure Block (signature)
The system's defining component. A measured number set in Figure typography with a hairline rule above and below, a Label-cased caption beneath, and a mandatory attribution line naming the business and the measurement window. It renders on Paper Ruled and carries no shadow.

Rendering one without its attribution and date is prohibited — an unattributed figure is precisely the pattern this system exists to replace.

## Do's and Don'ts

### Do:
- **Do** set every evidence number in tabular figures with an attribution naming the business and the measurement window.
- **Do** separate sections by alternating Paper (`#F6EFDF`) and Paper Ruled (`#EBE1C9`) grounds.
- **Do** keep shadows hard — `4px 4px 0` in Ink, blur `0` — and only on actionable or transient elements.
- **Do** check every type and layout decision in Arabic RTL before accepting it in English.
- **Do** use `outline` for focus, visible against all four grounds.
- **Do** collapse breakpoints onto the five-step scale (480 / 640 / 768 / 1024 / 1280).
- **Do** express direction-sensitive transforms through the existing `--x-sign` token so RTL mirrors automatically.

### Don't:
- **Don't** use a gradient anywhere — not as a background, not as button fill, and never clipped to text.
- **Don't** apply blur: no `box-shadow` blur radius, no `filter: blur()`, no `backdrop-filter`. This retires the aurora blobs and every glass surface.
- **Don't** nest a card inside a card, or a bordered panel inside a bordered card.
- **Don't** put Ink Muted (`#565E6B`) on Paper Ruled (`#EBE1C9`) — it fails AA.
- **Don't** uppercase or letter-space Arabic text.
- **Don't** use a radius above `8px` on a rectangular surface; `20px` and `28px` are retired.
- **Don't** write `transition: all` — name the properties.
- **Don't** centre a hero in a `100vh` flex container.
- **Don't** let the sign-in control render as a primary button.
