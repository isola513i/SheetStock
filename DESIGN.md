---
name: SheetStock
description: Mobile-first wholesale inventory and catalog PWA for K-Beauty operations
colors:
  catalog-header: "#29335c"
  catalog-accent: "#f3a712"
  catalog-emphasis: "#e4572e"
  surface-base: "#f7f2ec"
  surface-card: "#f8f2e8"
  surface-muted: "#edf3f7"
  text-primary: "#29335c"
  text-secondary: "#2f3b6a"
  text-muted: "#3e6f8e"
  border-soft: "#b8d1e0"
typography:
  title:
    fontFamily: "Sarabun, Noto Sans Thai, Segoe UI, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Sarabun, Noto Sans Thai, Segoe UI, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "Sarabun, Noto Sans Thai, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.catalog-header}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "36px"
  button-filter:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "40px"
  announcement-strip:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    padding: "12px 24px"
---

# Design System: SheetStock

## 1. Overview

**Creative North Star: "The Fast Wholesale Counter"**

SheetStock is a product UI, not a campaign surface. It should feel like a well-kept mobile sales counter: calm, fast, legible, and dependable. The interface exists to shorten the distance between scanning, recognizing a product, checking price, and deciding what to add to a cart.

The visual language combines warm merchandising surfaces with a dark indigo header that anchors navigation. Accent color is used sparingly for emphasis, selection, and price energy, not decoration. Product surfaces stay familiar and predictable so the user trusts the tool immediately.

**Key Characteristics:**
- Mobile-first and touch-native
- Dense enough for work, never cramped
- Warm neutral surfaces with one strong indigo anchor
- Minimal motion, state-led only
- Product list always outranks supporting UI

## 2. Colors

The palette is restrained: indigo for structure, amber for active controls, paprika for commercial emphasis, and warm cream neutrals for content surfaces.

### Primary
- **Warehouse Indigo** (`#29335c`): used for the catalog header, primary buttons, active navigation anchors, and structural contrast.
- **Catalog Amber** (`#f3a712`): used for active chips, highlighted controls, and the key accent moments that indicate action.

### Secondary
- **Price Paprika** (`#e4572e`): used for price emphasis, urgency, and commerce-weighted moments.

### Neutral
- **Warm Paper** (`#f7f2ec`): app background and large surface field.
- **Soft Card Cream** (`#f8f2e8`): card and strip surfaces.
- **Cool Mist** (`#edf3f7`): muted image wells and low-emphasis panels.
- **Steel Border** (`#b8d1e0`): soft dividers and subtle borders.
- **Indigo Text** (`#29335c`): primary text.
- **Muted Ink** (`#3e6f8e`): helper text and secondary annotation.

**The Accent Restraint Rule.** Amber and paprika should call attention to action and price only. They should not wash whole screens or decorate passive surfaces.

## 3. Typography

**Display Font:** Sarabun, Noto Sans Thai, Segoe UI, sans-serif  
**Body Font:** Sarabun, Noto Sans Thai, Segoe UI, sans-serif  
**Label/Mono Font:** Sarabun for labels, system mono only for barcode-like data

**Character:** clean Thai-friendly sans typography with compact hierarchy. It should feel native on mobile and remain easy to scan in mixed Thai and numeric content.

### Hierarchy
- **Title** (600, `1.35rem`, 1.2): page titles and section anchors.
- **Body** (400, `0.95rem`, 1.45): product names, descriptions, supporting content.
- **Label** (600, `0.75rem`, 1.2): chips, metadata labels, small UI controls.

### Named Rules
**The Fast Read Rule.** Product names, prices, stock, and action labels must be readable in one glance on a mobile viewport. Decorative scale jumps are not allowed.

## 4. Elevation

SheetStock uses a mostly flat product UI with light tonal layering and very soft lift on selected cards or commerce actions. Depth should come more from contrast and spacing than from heavy shadows.

### Shadow Vocabulary
- **Soft Product Lift** (`0 14px 28px -24px rgba(41,51,92,0.38)`): for product cards that need slight separation from the field.
- **Action Lift** (`0 10px 18px -14px rgba(41,51,92,0.7)`): reserved for primary commerce buttons and cart trigger states.

### Named Rules
**The Flat-By-Default Rule.** Most surfaces remain flat at rest. Shadows appear only to support hierarchy or action confidence.

## 5. Components

### Buttons
- **Shape:** usually pill for primary commerce actions, small rounded rectangle for utility actions.
- **Primary:** indigo background, white text, medium-bold label, compact height.
- **Hover / Focus:** slight tone shift and clear focus ring, never glow-heavy.
- **Secondary / Utility:** warm surface fill with subtle border and indigo text.

### Chips
- **Style:** filled or lightly bordered pills for category and brand chips.
- **State:** active chips switch to amber fill; inactive chips stay soft and neutral.

### Cards / Containers
- **Corner Style:** product cards may use larger radius, but supporting strips and utility rows should be simpler and quieter.
- **Background:** warm cream or neutral-light surfaces.
- **Shadow Strategy:** optional, soft, commerce-led.
- **Internal Padding:** compact, with visual emphasis on image, name, price, and stock.

### Inputs / Fields
- **Style:** light surface fill, subtle border, generous tap height, left-aligned icon when helpful.
- **Focus:** border tint and restrained ring using the accent color.
- **Error / Disabled:** rely on clear contrast and plain status colors, not decorative effects.

### Navigation
- **Style:** strong structural header, simple bottom navigation, familiar mobile app pattern.
- **State:** current tab should be obvious through fill and icon/text contrast, not extra decoration.

### Announcement Strip
- **Style:** flat utility strip, full-width, no rounded outer shell.
- **Behavior:** supporting information only. It may auto-rotate, but should collapse when the user scrolls into product browsing.
- **Indicator:** minimal bar dots, not badges or labels.

## 6. Do's and Don'ts

### Do:
- **Do** keep catalog controls familiar and compact.
- **Do** prioritize image, product name, price, and stock over auxiliary messaging.
- **Do** use indigo as the structural anchor and amber only for active or selected states.
- **Do** let supporting UI, including announcements, step back once the user is browsing products.

### Don't:
- **Don't** use glassmorphism.
- **Don't** use gradient-heavy hero styling or landing-page shadows inside the product flow.
- **Don't** stack decorative cards inside other cards.
- **Don't** use dark mode neon or purple-on-black treatments.
- **Don't** let announcement UI compete with the catalog grid for visual priority.
