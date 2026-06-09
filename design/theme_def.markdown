---
name: Neo-Arcade Edu-Tech
colors:
  surface: '#0e1323'
  surface-dim: '#0e1323'
  surface-bright: '#34394a'
  surface-container-lowest: '#080d1d'
  surface-container-low: '#161b2b'
  surface-container: '#1a1f30'
  surface-container-high: '#25293a'
  surface-container-highest: '#2f3446'
  on-surface: '#dee1f9'
  on-surface-variant: '#ccc3d8'
  inverse-surface: '#dee1f9'
  inverse-on-surface: '#2b3041'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d2bbff'
  primary: '#d2bbff'
  on-primary: '#3f008e'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#732ee4'
  secondary: '#5de6ff'
  on-secondary: '#00363e'
  secondary-container: '#00cbe6'
  on-secondary-container: '#00515d'
  tertiary: '#98da27'
  on-tertiary: '#213600'
  tertiary-container: '#4b7200'
  on-tertiary-container: '#b6fb49'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#a2eeff'
  secondary-fixed-dim: '#2fd9f4'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#b2f746'
  tertiary-fixed-dim: '#98da27'
  on-tertiary-fixed: '#121f00'
  on-tertiary-fixed-variant: '#334f00'
  background: '#0e1323'
  on-background: '#dee1f9'
  surface-variant: '#2f3446'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  stat-label:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
  button-text:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-edge: 40px
  max-width: 1280px
---

## Brand & Style

The design system is engineered for an energetic, high-stakes educational environment that mirrors the excitement of modern gaming interfaces. It targets a younger demographic (kids and teens) by blending a premium "Space-Tech" aesthetic with the friendly approachability of a learning tool.

The visual style is a hybrid of **Glassmorphism** and **Futuristic Minimalism**. It utilizes deep, immersive backgrounds to reduce eye strain during long study sessions, while high-vibrancy electric accents guide the user's attention toward critical learning actions and gamified milestones. The emotional response is one of momentum, achievement, and cosmic exploration.

## Colors

The palette is built on a "Deep Space" foundation to make foreground elements pop with neon-like intensity.

- **Primary (Violet):** Used for core branding, "Hero" actions, and major navigation states.
- **Secondary (Cyan):** Reserved for interactivity, focus states, and "Active" status indicators.
- **Tertiary (Lime):** Exclusively for positive reinforcement (Success, XP gain, Level up).
- **Accents:** Magenta is used for errors or critical warnings, while Amber signifies premium status or streak milestones.
- **Surface Color:** All containers use a glassmorphic treatment (White at 8% opacity) rather than solid fills to maintain a sense of depth and luminosity.

## Typography

Typography balances technical precision with high readability. 

- **Headlines:** Use Space Grotesk for its geometric, futuristic terminals. It should always feel structural and "tech-forward."
- **Body:** Inter is the workhorse for all instructional text in Spanish, ensuring high legibility even on lower-resolution Chromebook screens.
- **Accents/Labels:** Plus Jakarta Sans provides a softer, friendlier alternative for metadata, scores, and labels, counteracting the sharpness of the display type.
- **Hierarchy:** Maintain large font sizes for primary instructions to accommodate the horizontal screen orientation of Chromebooks, ensuring users aren't overwhelmed by dense text blocks.

## Layout & Spacing

This design system is optimized for a **Landscape-First** orientation. It employs a 12-column fluid grid system specifically tuned for wide-aspect ratios (16:9 and 16:10).

- **Horizontal Rhythm:** Content should be grouped into side-by-side modules rather than vertical stacks. Use a wide 40px margin on the outer edges to prevent UI elements from getting lost in the screen bezel.
- **Vertical Constraints:** Since vertical space is limited on Chromebooks, prioritize a single "Hero" action per view. Avoid deep scrolling; favor tabbed interfaces or side-scrolling carousels for lesson selection.
- **Scaling:** Use an 8px base grid for all padding and internal element spacing to maintain a consistent density across the UI.

## Elevation & Depth

Depth is created through light and transparency rather than traditional drop shadows.

- **The Base:** Background is a subtle vertical gradient from Indigo to Navy.
- **Surface Layer:** "Glass" containers use a background blur (16px) and an ultra-thin (1px) semi-transparent white border. This creates a "frosted" look that feels physical yet futuristic.
- **Luminous Depth:** Elements at higher elevations (like active buttons or modal overlays) should emit a soft "Glow" using an outer shadow with the same color as the element (e.g., a Cyan button has a Cyan outer glow with 20% opacity).

## Shapes

The shape language is "Optimistically Geometric." While the typography is sharp and technical, the UI containers use a **3xl (24px)** corner radius to feel approachable and "toy-like."

- **Standard Elements:** Use `rounded-lg` (16px) for input fields and smaller components.
- **Primary Containers:** Use `rounded-xl` (24px) for cards and modals to emphasize the "Glassmorphic" softness.
- **Interactive Triggers:** Buttons can utilize either the standard rounded corners or a full pill-shape (32px+) to distinguish them from static information cards.

## Components

### Buttons
Buttons are the primary vehicle for the "Arcade" feel.
- **Resting:** Gradient fill (Primary to Secondary), 1px interior stroke.
- **Hover:** The button "lifts" (TranslateY -2px) and the glow intensity increases.
- **Active (Press):** The button "squashes" (Scale 0.96) to provide tactile feedback.
- **Focus:** A distinct 2px Cyan ring with a 4px offset.

### Progress Bars (XP Bars)
Progress is visualized as a "Power Meter."
- **Track:** 12px height, Dark Indigo with 20% opacity.
- **Fill:** A shimmering animated gradient (Lime to Cyan).
- **Animation:** A "light-sweep" effect should traverse the bar every 3 seconds to indicate vitality.

### Cards
Cards are always glassmorphic. 
- **Header:** Space Grotesk in White (100%).
- **Content:** Inter in White (80%) for readability.
- **Interactive Cards:** On hover, the 1px border should change from White (10%) to Cyan (50%).

### Input Fields & Controls
- **Inputs:** Darker transparent fills with 1px borders. Label text uses the "Stat-Label" typography style.
- **Checkboxes:** Large, custom-styled boxes that fill with a Lime checkmark and a slight pulse animation when selected.

### Navigation
A persistent side-bar (on wider screens) or a bottom-bar (on smaller viewports) using glassmorphic surfaces. Active links should use the Cyan accent with a small vertical "power light" indicator next to the icon.