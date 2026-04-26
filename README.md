# Railly Mobile

Real-time transit safety monitoring for operators, passengers, and police.

## Getting Started

1. Run `npm install`
2. Run `npm run dev`

## Development Guidelines

### No `motion.div` (Framer Motion)

Do **not** use `motion.div`, `motion.p`, `AnimatePresence`, or any Framer Motion components in this project.  
Use plain HTML elements (`<div>`, `<p>`, etc.) with CSS animations/transitions instead.

**❌ Don't:**
```tsx
import { motion } from 'framer-motion';
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>...</motion.div>
```

**✅ Do:**
```tsx
<div className="animate-fadeIn">...</div>
```

Use Tailwind's built-in animation utilities (`animate-bounce`, `animate-pulse`, `animate-spin`) or custom CSS keyframes for any animation needs.
