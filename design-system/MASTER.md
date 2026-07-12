# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** LifeOS Agent
**Generated:** 2026-07-10 13:31:13
**Category:** SaaS (General)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable | Notes |
|------|-----|--------------|-------|
| Primary | `#4F8CFF` | `--color-primary` | Bright indigo blue for CTAs and links |
| On Primary | `#FFFFFF` | `--color-on-primary` | Text on primary backgrounds |
| Secondary | `#7C6FF0` | `--color-secondary` | Deep perple for secondary elements |
| Accent/CTA | `#F59E0B` | `--color-accent` | Warm amber — cozy, not cold green |
| Background | `#0B1121` | `--color-background` | Deep navy — true dark mode canvas |
| Foreground | `#F1F5F9` | `--color-foreground` | Near-white for primary text |
| Muted | `#1E293B` | `--color-muted` | Surface/card backgrounds |
| Border | `#334155` | `--color-border` | Subtle borders on dark |
| Destructive | `#EF4444` | `--color-destructive` | Red for errors/alerts |
| Ring | `#4F8CFF` | `--color-ring` | Focus ring matching primary |

**Color Notes:** Deep indigo canvas + warm amber accent (cosy premium feel — user preference override from light mode default)

### Typography

- **Heading Font:** Inter
- **Body Font:** Inter
- **Mood:** dark, cinematic, technical, precision, clean, premium, developer, professional, high-end utility
- **Google Fonts:** [Inter + Inter](https://fonts.google.com/share?selection.family=Inter:wght@300;400;500;600;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #059669;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #2563EB;
  border: 2px solid #2563EB;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #2563EB;
  outline: none;
  box-shadow: 0 0 0 3px #2563EB20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Modern Dark (Cinema Mobile)

**Keywords:** dark mode, cinematic, ambient light, glassmorphism, deep black, indigo, glow, blur, atmospheric, reanimated, haptic, premium, layered, frosted glass, linear gradient

**Best For:** Developer tools, pro productivity apps, fintech/trading dashboards, media/streaming platforms, AI tool interfaces, high-end gaming companion apps

**Key Effects:** Expo.out Bezier(0.16,1,0.3,1) easing; spring modals (damping:20 stiffness:90); haptic-linked press (Impact Light/Medium); animated ambient light blobs (Reanimated translateX/Y slow oscillation); BlurView glassmorphism headers/nav (intensity 20); scale press 0.97 → 1.0; avoid pure #000000 (OLED smear)

### Page Pattern

**Pattern Name:** App Store Style Landing

- **Conversion Strategy:** Show real screenshots. Include ratings (4.5+ stars). QR code for mobile. Platform-specific CTAs.
- **CTA Placement:** Download buttons prominent (App Store + Play Store) throughout
- **Section Order:** 1. Hero with device mockup, 2. Screenshots carousel, 3. Features with icons, 4. Reviews/ratings, 5. Download CTAs

---

## Anti-Patterns (Do NOT Use)

- ❌ Excessive animation
- ❌ ~~Dark mode by default~~ **OVERRIDDEN** — User preference: dark-mode-first. See User Preferences section.

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Brand/social icons from `lucide-react`** — `lucide-react` no longer ships brand/social logos (GitHub, X/Twitter, LinkedIn, Facebook, Instagram, YouTube, Discord, etc.) and importing them breaks the build. Use `react-icons/si` (Simple Icons) for brand logos; keep Lucide/Phosphor for generic UI icons
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Domain Guidelines — Landing Page & Conversion

### Above the Fold (Hero)
- The hero must answer "what is this, who is it for, why should I care" in under 5 seconds.
- One primary CTA above the fold — not two. If there's a secondary, make it visually subordinate (ghost/outline style).
- Headline: outcome-focused, not feature-focused. "Build apps in minutes" beats "Our AI platform".
- Place social proof near the CTA: logos, user count, or star rating. Position immediately below or beside the CTA.

### Conversion Hierarchy
- CTA button: high contrast, minimum 44px height, action verb ("Start Free", "Get Access", not "Submit").
- Repeat the primary CTA at the bottom of every major section — not just once at the top.
- Pricing: highlight the recommended plan with a border, badge, or color distinction.
- Testimonials need photo + name + title/company. Anonymous quotes have near-zero conversion impact.

### Visual Flow
- Users scan in an F or Z pattern — key content lives along these paths, not in the corners.
- Use whitespace aggressively between sections — cramped sections signal low quality.
- Alternate section backgrounds (white / off-white / light gray) to visually separate content.

### Conversion Psychology (LIFT · Cialdini · Fogg)
- **5-second test**: The hero must pass it — show it to someone unfamiliar for 5 seconds and ask: "What is this?", "Is it for you?", "What do you do next?" If any answer is unclear, the hero fails before anything else matters.
- **LIFT model**: Five factors modulate conversion. Increase Relevance (page matches what the visitor searched for), Clarity (message is instantly understandable), and Urgency (reason to act now rather than later). Decrease Anxiety (unaddressed fears block action) and Distraction (one goal per fold — strip anything that competes with the primary CTA).
- **Missing social proof in folds 1–3** is the single most common conversion killer across all verticals. Testimonials, review counts, and client logos must appear before the user has scrolled far.
- **Cialdini — Social Proof**: Numbers build trust faster than words. "Trusted by 12,000 teams" outperforms a paragraph of copy. Photo + name + company title is the minimum for testimonials — anonymous quotes convert at near zero.
- **Cialdini — Authority**: Media mentions ("As seen in…"), sourced statistics, certifications, and expert endorsements. Position authority signals before the pricing section.
- **Cialdini — Commitment**: Small yes before big yes. A quiz, calculator, or free tool gets the visitor invested before asking for sign-up. Each micro-commitment increases the likelihood of the final conversion.
- **Cialdini — Scarcity/Urgency**: Limited availability or time-based offers increase action rates — but only when real. False scarcity destroys trust permanently and poisons every future visit.
- **Fogg B=MAP**: Behavior happens when Motivation × Ability × Prompt converge at the same moment. If the CTA is visible but they are not convinced yet (low Motivation) → add proof, value, and risk-reduction language. If convinced but the form is buried (low Ability) → surface and simplify the CTA. When both are high → add a Prompt: sticky bar, scroll-triggered element, or chat widget.
- **The fold 3–5 rule**: Most "I have enough information to act" moments happen between the 3rd and 5th screenful. Content beyond fold 6 is seen by fewer than 20% of visitors — front-load your strongest proof, not your weakest.
- **Anti-patterns:** auto-playing video with sound, pop-up on load, no mobile nav, hero images without alt text, CTAs that go nowhere, pricing with no explanation of what you get, forms asking for more than email on first touchpoint, no risk-reduction language (money-back, free trial, no credit card) near the final CTA.

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] UI icons from a consistent set (Heroicons/Lucide/Phosphor); brand/social logos from `react-icons/si` (never `lucide-react`)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile


---

## User Preferences (authoritative)

These override any conflicting default above:

- Modern, clean dark-mode-first interface with a conversational feel. Deep indigo/navy primary with warm accent colors. Feels like a premium productivity tool — think Superhuman x Notion. Should feel cozy, intelligent, and calm.

---

## Tailwind v4 Tokens (applied to `src/index.css`)

These tokens are the rendering source of truth and are written into `src/index.css` for you. Build with them (`bg-primary`, `text-foreground`, `font-heading`, …); don't move or duplicate the `@import`/`@theme`.

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-heading: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --color-primary: oklch(0.5461 0.2152 262.88);
  --color-on-primary: oklch(1.0 0 0);
  --color-secondary: oklch(0.54 0.16 277.12);
  --color-accent: oklch(0.72 0.16 68);
  --color-background: oklch(0.14 0.028 264);
  --color-foreground: oklch(0.96 0.008 264);
  --color-muted: oklch(0.24 0.02 264);
  --color-border: oklch(0.34 0.018 264);
  --color-destructive: oklch(0.637 0.208 27.33);
  --color-ring: oklch(0.5461 0.2152 262.88);
}
```
