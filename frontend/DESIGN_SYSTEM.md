# LA Noire NextGen - Design System

## Design Philosophy

**Era:** 1940s Film Noir  
**Setting:** Los Angeles Police Department  
**Mood:** Serious, Professional, Vintage, Mystery  
**Aesthetic:** Classic Detective/Crime Drama

## Visual Identity

### Core Concept
The design evokes the golden age of detective fiction and film noir cinema (1940s-1950s). Think classic LAPD headquarters, dimly lit interrogation rooms, typewritten case reports, and crime scene photography. The interface should feel like you're using a vintage police filing system merged with modern efficiency.

### Key Design Elements
1. **Film Noir Aesthetic**: High contrast, dramatic shadows, sepia-toned accents
2. **Police Department Professional**: Official badges, clean forms, structured layouts
3. **Vintage Typography**: Serif fonts for elegance (Playfair Display), typewriter fonts for reports (Special Elite)
4. **Evidence-Based**: Document-style layouts, case file cards, photo evidence displays
5. **Period-Appropriate**: Art deco influences, brass fixtures, leather textures

## Color Palette

### Primary Colors
```css
--color-noir-black: #0a0a0a        /* Deep black - main backgrounds */
--color-noir-charcoal: #1a1a1a     /* Charcoal - card backgrounds */
--color-noir-dark-gray: #2a2a2a    /* Dark gray - elevated surfaces */
--color-gold: #d4af37              /* Gold - primary accent, badges, highlights */
--color-brass: #b5a642             /* Brass - secondary accent, subdued gold */
```

### Semantic Colors
```css
--color-crimson: #8b1a1a           /* Crime/Danger - errors, warnings, blood */
--color-evidence-blue: #1a4d7a     /* Evidence - info, links, trust */
--color-success: #2d5016           /* Success - completed cases, approved */
--color-warning: #8b6914           /* Warning - pending, caution */
```

### Neutral Scale
```css
--color-noir-gray: #3a3a3a         /* Borders, dividers */
--color-noir-light-gray: #4a4a4a   /* Hover states */
--color-noir-silver: #b0b0b0       /* Secondary text */
--color-text-primary: #e8e8e8      /* Primary text - high contrast */
--color-text-secondary: #c0c0c0    /* Secondary text - labels */
--color-text-muted: #808080        /* Muted text - hints */
```

## Typography

### Font Families
```css
--font-heading: 'Playfair Display', Georgia, serif
  /* For: Headings, case titles, important labels */
  
--font-primary: 'Special Elite', 'Courier New', monospace
  /* For: Case reports, evidence descriptions, official documents */
  
--font-body: 'Crimson Text', 'Times New Roman', serif
  /* For: Body text, paragraphs, descriptions */
```

### Type Scale
```css
--font-size-xs: 0.75rem     /* 12px - tiny labels */
--font-size-sm: 0.875rem    /* 14px - small text */
--font-size-base: 1rem      /* 16px - body text */
--font-size-lg: 1.125rem    /* 18px - large text */
--font-size-xl: 1.25rem     /* 20px - subheadings */
--font-size-2xl: 1.5rem     /* 24px - card titles */
--font-size-3xl: 2rem       /* 32px - page titles */
--font-size-4xl: 2.5rem     /* 40px - hero text */
```

### Font Usage Guidelines
- **Playfair Display**: Use for page titles, section headers, case names
- **Special Elite**: Use for input fields, buttons, official badges, case numbers
- **Crimson Text**: Use for all body content, descriptions, paragraphs

## Spacing System

```css
--spacing-xs: 0.25rem    /* 4px */
--spacing-sm: 0.5rem     /* 8px */
--spacing-md: 1rem       /* 16px */
--spacing-lg: 1.5rem     /* 24px */
--spacing-xl: 2rem       /* 32px */
--spacing-xxl: 3rem      /* 48px */
--spacing-xxxl: 4rem     /* 64px */
```

**Rule:** Use 8px grid system (multiples of 8) for all layouts.

## Component Patterns

### Cards
- Dark background with subtle gradient
- 2px border in noir gray
- 3px gold accent line at top edge
- Box shadow on hover
- Lift on hover (translateY -5px)

### Buttons
```
Primary: Gold background, black text, bold typewriter font
Secondary: Transparent with gold border
Danger: Crimson background
Disabled: 50% opacity, no hover effects
```

### Forms
- Input fields: Dark charcoal background
- Golden bottom border (2px)
- Focus state: Gold glow with shadow
- Labels: Uppercase, spaced letters (0.1em), brass color
- Placeholder: Muted gray, italicized

### Badges & Tags
- Small rounded rectangles
- Brass or gold borders
- Uppercase text with letter spacing
- Status colors: Success (green), Warning (yellow), Danger (red), Info (blue)

### Tables
- Alternating row backgrounds (charcoal/dark gray)
- Gold header row
- Hover: Lighten row slightly
- Borders: Subtle noir gray lines

### Modals & Overlays
- Dark overlay backdrop (rgba(10, 10, 10, 0.9))
- Centered card with gold border
- Close button in top-right corner

## Layout Principles

### Grid System
- 12-column grid
- Responsive breakpoints:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px

### Responsive Design
```css
Mobile-first approach:
- Stack columns vertically on mobile
- Reduce spacing by 50% on small screens
- Hide non-essential decorative elements
- Full-width cards and buttons
- Collapsible navigation
```

### Page Structure
```
Header (Fixed)
  ├─ LAPD Badge + Title
  └─ Navigation Links

Main Content (Scrollable)
  ├─ Page Title (Playfair Display)
  ├─ Breadcrumbs (optional)
  └─ Content Area
      ├─ Stats Grid (Dashboard)
      ├─ Case Cards
      └─ Data Tables

Footer (Fixed)
  ├─ System Info
  └─ Copyright
```

## Animation & Transitions

### Standard Transitions
```css
--transition-fast: 0.15s ease-in-out
--transition-normal: 0.3s ease-in-out
--transition-slow: 0.5s ease-in-out
```

### Common Effects
- **Fade In**: opacity 0 → 1, translateY 10px → 0
- **Card Hover**: translateY 0 → -5px, shadow increase
- **Button Hover**: background lighten, scale 1.02
- **Loading**: Spinning badge icon, pulsing text

### Performance Rules
- Use `transform` and `opacity` for animations
- Avoid animating `width`, `height`, `top`, `left`
- Limit animations to 60fps
- Reduce motion for accessibility

## Iconography

### Style
- Line icons preferred (not filled)
- 24x24px default size
- 2px stroke width
- Gold or brass color by default
- Match the Art Deco era aesthetic

### Common Icons
```
Badge: LAPD Shield (custom SVG)
Case: Folder icon
Evidence: Magnifying glass
Suspect: User silhouette
Trial: Gavel
Alert: Warning triangle
Success: Checkmark circle
Loading: Spinning badge
```

## Accessibility

### WCAG 2.1 AA Standards
- Minimum contrast ratio: 4.5:1 for normal text
- Minimum contrast ratio: 3:1 for large text
- All interactive elements keyboard accessible
- Focus indicators: Gold outline, 2px
- Alt text for all images
- ARIA labels for icon-only buttons

### Dark Theme Considerations
- High contrast text on dark backgrounds
- Gold (#d4af37) on black (#0a0a0a) = 8.2:1 ratio ✓
- Silver text (#b0b0b0) on black = 7.1:1 ratio ✓

## Best Practices

### DO
✓ Use gold for primary actions and highlights  
✓ Keep high contrast between text and backgrounds  
✓ Use typewriter font for official/system elements  
✓ Add subtle animations for better UX  
✓ Include loading states for all async operations  
✓ Show skeleton screens while data loads  
✓ Use semantic HTML elements  
✓ Test on mobile devices  

### DON'T
✗ Use bright, saturated colors (breaks noir aesthetic)  
✗ Mix modern sans-serif fonts randomly  
✗ Create colorful, playful UI elements  
✗ Use drop shadows excessively  
✗ Ignore loading states  
✗ Make small touch targets on mobile (<44x44px)  

## Component Library Structure

```
components/
├─ layout/
│  ├─ Header.tsx
│  ├─ Footer.tsx
│  ├─ Sidebar.tsx
│  └─ Container.tsx
├─ ui/
│  ├─ Button.tsx
│  ├─ Input.tsx
│  ├─ Card.tsx
│  ├─ Badge.tsx
│  ├─ Alert.tsx
│  ├─ Modal.tsx
│  ├─ Table.tsx
│  └─ Spinner.tsx
├─ forms/
│  ├─ LoginForm.tsx
│  ├─ RegisterForm.tsx
│  └─ CaseForm.tsx
└─ feedback/
   ├─ Notification.tsx
   ├─ Toast.tsx
   ├─ LoadingSkeleton.tsx
   └─ ErrorBoundary.tsx
```

## Design Tokens Location

All design tokens are centralized in `/frontend/src/styles/index.css` under CSS custom properties (variables). This allows consistent theming across the entire application.

## Future Enhancements

- Light mode toggle (sepia/aged paper theme)
- Animated evidence photo reveals
- Typewriter text effect for case reports
- Film grain texture overlay (subtle)
- Vintage camera shutter transitions

---

**Design Reference:** *L.A. Noire* (Rockstar Games), Film Noir Cinema, 1940s LAPD Archives
