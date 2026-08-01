# UI/UX Standards (Tailwind 4 + Uncodixfy Tech-Noir Synth)

## 🎨 System
- **Engine**: Tailwind CSS 4 & PostCSS
- **Theme**: Dark Mode by default (Uncodixfy Studio styling)
- **Icons**: Lucide React
- **Aesthetic**: Premium hardware rack simulation, 5px grid precision, metal textures

## ⚖️ Laws
1. **Uncodixfy Borders**: Max `8px` corner radius. Crisp, precise shapes resembling hardware components.
2. **Glass & Metals**: Ambient glassmorphism must have high blur (`blur > 20px`) and low opacity (`opacity < 5%`). Use CSS borders for "brushed metal" effects.
3. **i18n Standard**: All user-visible strings must go through `next-intl`. No hardcoded strings.
4. **Visual Feedback**: Micro-animations on sliders and knobs. Highlight links and linked directory status clearly.
5. **No Placeholders**: Never use placeholder images. Generate realistic UI controls or use clean vector icons.
