# Roofing Website Template — Plan

A clean, modern roofing company template that feels human and warm, not robotic. Built on the "Sunlit Gallery" direction: Fraunces serif display type + Archivo body, warm bone/sand background, clay accent, generous whitespace, soft rounded cards, gentle rise-in animations.

## Data-driven structure (swappable content)

All copy and data live in a single `src/data/site.ts` file — company name, nav links, hero text, services list, about points, stats, testimonials, FAQ items, contact info. Components render from this data so text/content can be swapped later without touching markup. Images are generated assets imported per-section, easily replaced.

## Pages & sections

Single-page site at `/` with anchor-linked sections:

1. **Header** — sticky, blurred backdrop, logo mark, nav links (Services, About, FAQ, Reviews), "Get a Quote" CTA
2. **Hero** — serif headline, supporting paragraph, two CTAs, stats row, full-width warm hero photo (generated)
3. **Services** — 2x2 grid of service cards (Repair, Replacement, Inspection, Gutters) with numbered markers
4. **About / Why Us** — image + text split, bullet trust points, crew photo (generated)
5. **Testimonials** — 3 review cards with star ratings
6. **FAQ** — interactive accordion (accessible, animated open/close)
7. **Contact** — dark ink section: contact details (phone, email, hours, address) + a working-looking quote request form (front-end only, success toast on submit)
8. **Footer** — minimal, license placeholder line

## Feel details (anti-robot)

- Hand-set-feeling serif headlines (Fraunces) with tight tracking and text-balance
- Warm off-white/sand surfaces instead of stark white/gray
- Natural placeholder copy with contractions and conversational tone
- Subtle rise-in scroll animations, soft hover lifts on cards
- Rounded-2xl cards, pill buttons, soft rings instead of harsh borders

## Technical notes

- `src/routes/index.tsx` — full page; section components under `src/components/` (Header, Hero, Services, About, Testimonials, Faq, Contact, Footer)
- FAQ accordion built with shadcn-style accordion (Radix) or lightweight custom details/summary with animation
- Design tokens in `src/styles.css` (oklch): bone, sand, ink, clay, clay-dark; fonts loaded via `<link>` in `__root.tsx`
- Unique SEO head() on index: title, description, og tags
- 2 generated images: hero roof photo (golden hour), about crew photo
- Contact form is front-end only (validates + shows success state); wiring to email/CRM is a later step if wanted
- No backend / Lovable Cloud needed
