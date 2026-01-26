# Fast Haazir Brand Guidelines v2.0

## Brand Identity

**Brand Name:** Fast Haazir  
**Tagline:** "Har Cheez, Turant Haazir" | "Quetta ki Fastest Delivery"  
**Market:** Quetta, Balochistan, Pakistan

## Brand Personality

- ⚡ **Fast** – Lightning-speed delivery
- 🤝 **Reliable** – Trust you can count on
- 🎯 **Modern** – Youthful, tech-forward
- 👨‍👩‍👧‍👦 **Family-friendly** – Safe for all ages

---

## Color System

### Primary Colors

| Color | HSL | Usage |
|-------|-----|-------|
| **Deep Green** | `hsl(152, 77%, 26%)` | Primary brand, headers, CTAs |
| **Lightning Orange** | `hsl(28, 100%, 50%)` | Accent, speed indicators, highlights |
| **Charcoal** | `hsl(160, 20%, 12%)` | Dark mode backgrounds |

### Extended Palette

#### Brand Green Scale
```
50:  hsl(152, 77%, 95%)  - Lightest backgrounds
100: hsl(152, 77%, 85%)  - Light fills
200: hsl(152, 77%, 70%)  - Light accents
300: hsl(152, 77%, 55%)  - Medium accents
400: hsl(152, 77%, 45%)  - Interactive states
500: hsl(152, 77%, 35%)  - Success states
600: hsl(152, 77%, 26%)  - PRIMARY (Brand Color)
700: hsl(152, 77%, 22%)  - Hover states
800: hsl(152, 77%, 18%)  - Pressed states
900: hsl(152, 77%, 12%)  - Darkest
```

#### Brand Orange Scale (Speed/Energy)
```
50:  hsl(38, 100%, 95%)  - Lightest
100: hsl(38, 100%, 85%)  - Light fills
200: hsl(38, 100%, 70%)  - Light accents
300: hsl(38, 100%, 60%)  - Medium
400: hsl(28, 100%, 55%)  - Interactive
500: hsl(28, 100%, 50%)  - PRIMARY ACCENT
600: hsl(18, 100%, 48%)  - Hover
700: hsl(12, 100%, 42%)  - Pressed
800: hsl(8, 90%, 35%)    - Dark
900: hsl(4, 85%, 28%)    - Darkest
```

### Semantic Colors

| Purpose | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `hsl(150, 20%, 98%)` | `hsl(160, 25%, 6%)` |
| Foreground | `hsl(160, 25%, 12%)` | `hsl(150, 15%, 95%)` |
| Primary | `hsl(152, 77%, 26%)` | `hsl(152, 77%, 40%)` |
| Accent | `hsl(28, 100%, 50%)` | `hsl(28, 100%, 55%)` |
| Success | `hsl(152, 77%, 35%)` | `hsl(152, 77%, 45%)` |
| Destructive | `hsl(7, 80%, 50%)` | `hsl(7, 80%, 55%)` |

---

## Brand Gradients

### Primary Gradients

```css
/* Brand Gradient - Use for buttons, headers */
--gradient-brand: linear-gradient(135deg, hsl(152, 77%, 26%) 0%, hsl(152, 77%, 35%) 100%);

/* Speed Gradient - Use for highlights, badges */
--gradient-speed: linear-gradient(135deg, hsl(28, 100%, 50%) 0%, hsl(38, 100%, 55%) 100%);

/* Hero Gradient - Full-screen backgrounds */
--gradient-hero: linear-gradient(135deg, hsl(152, 77%, 26%) 0%, hsl(152, 77%, 22%) 50%, hsl(152, 77%, 18%) 100%);

/* Lightning Gradient - Speed indicators */
--gradient-lightning: linear-gradient(135deg, hsl(38, 100%, 55%) 0%, hsl(28, 100%, 50%) 50%, hsl(18, 100%, 48%) 100%);
```

---

## Logo System

### Primary Logo
- Delivery rider with lightning bolt
- Green background with speed lines
- Orange/yellow lightning element
- Used for: App icon, headers, marketing

### App Icon Sizes
| Size | Usage |
|------|-------|
| 512×512 | App stores, PWA |
| 192×192 | Android, PWA manifest |
| 64×64 | Large favicon |
| 32×32 | Standard favicon |
| 16×16 | Small favicon |

### Logo Rules
1. ✅ Clear space: Minimum 10% padding
2. ✅ Works on dark & light backgrounds
3. ✅ Clear at small sizes (16px minimum)
4. ❌ Don't stretch or distort
5. ❌ Don't change colors
6. ❌ Don't add effects

---

## Typography

### Primary Font: Poppins
- Clean, modern sans-serif
- Excellent readability
- Weights: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)

### Urdu Font: Noori Nastaleeq
- Traditional Urdu script
- Used for customer-facing Urdu content
- Line-height: 2.0 for readability

### Type Scale
```
Heading 1: 32px / Bold
Heading 2: 24px / SemiBold
Heading 3: 20px / SemiBold
Body:      16px / Regular
Small:     14px / Regular
Caption:   12px / Regular
```

---

## UI Components

### Buttons
```css
/* Primary Button */
.btn-primary {
  background: var(--gradient-brand);
  color: white;
  border-radius: 1rem;
  padding: 12px 24px;
  box-shadow: var(--shadow-brand);
}

/* Accent Button */
.btn-accent {
  background: var(--gradient-speed);
  color: white;
}
```

### Cards
```css
.card {
  background: hsl(var(--card));
  border-radius: 1rem;
  box-shadow: var(--shadow-card);
  border: 1px solid hsl(var(--border));
}
```

### Glassmorphism (Dark Mode)
```css
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

---

## Animation Guidelines

### Speed: Fast but Smooth
- Transitions: 200-300ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- Micro-interactions: 150ms

### Key Animations
- `fade-in`: 300ms ease-out
- `scale-in`: 200ms ease-out
- `slide-in-bottom`: 400ms ease-out
- `pulse-glow`: 2s infinite (for CTAs)

---

## SEO Keywords

### Primary Keywords
- Quetta delivery app
- Fast Haazir
- Food delivery Quetta
- Grocery delivery Quetta

### Secondary Keywords
- Courier service Quetta
- On-demand delivery Pakistan
- Rider service Balochistan
- Fast food delivery Quetta

### Local Focus
- "Quetta ki app"
- "Hamari local delivery"
- "Balochistan delivery service"

---

## Application Areas

| Area | Guidelines |
|------|------------|
| Splash Screen | Deep green background, centered logo, loading animation |
| Login/Signup | Gradient hero, glassmorphism cards |
| Customer Dashboard | Light/dark adaptive, prominent CTAs |
| Rider Dashboard | Dark mode first, high contrast, clear status |
| Admin Panel | Professional, data-focused, sidebar navigation |
| Push Notifications | Brand icon, clear messaging |
| Empty States | Illustrated, encouraging, brand colors |

---

## Voice & Tone

### Brand Voice
- Friendly but professional
- Fast & efficient
- Trustworthy
- Local (Quetta-focused)

### Messaging Examples
- ✅ "Har Cheez, Turant Haazir!"
- ✅ "Quetta ki fastest delivery"
- ✅ "Aapki delivery, hamari zimmedari"
- ❌ Overly formal language
- ❌ Slow/lazy messaging

---

## File Naming Convention

```
fast-haazir-logo-primary.svg
fast-haazir-logo-white.svg
fast-haazir-icon-512.png
fast-haazir-icon-192.png
fast-haazir-favicon.png
```

---

*Fast Haazir Brand Guidelines v2.0*  
*Last Updated: January 2026*
