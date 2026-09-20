# Chat wall assets

Twelve original fictional WhatsApp-style screenshots generated with the built-in `image_gen` tool. Website files: `public/images/chat-wall/*.webp`, 720 × 1280 each. Total image payload is approximately 853 KiB before responsive delivery. Source image identifiers are recorded in `public/images/chat-wall/manifest.json`; originals remain in Codex generated-image storage.

## Prompt set

Shared prompt: Generate one original high-fidelity fictional WhatsApp-style mobile screenshot, portrait 720 × 1280, medium quality. Flat edge-to-edge screenshot, no physical phone or perspective. Light iOS interface, 9:41 status bar, white contact header, back chevron, fictional avatar, blue phone and video icons. White incoming bubbles on the left and light green outgoing bubbles on the right. Large legible black text, gray times between 19:10 and 19:18, blue double ticks. A Today date pill. Include the exact conversation in `src/content/chat-scenes.ts`, preserving speaker order. Insert a candid photo attachment occupying approximately 30% of the height. White message composer with plus and microphone. Footer: “Fictional chat · WhatHeThinks”. All messages fully visible. No testimonials or competitor branding.

| File | Contact | Wallpaper | Photo attachment |
| --- | --- | --- | --- |
| talking-stage.webp | Alex | Pale sage | Two takeaway coffees on a park bench |
| first-dates.webp | Ben | Warm ivory | Pasta at a small restaurant |
| situationship.webp | Jamie | Pale blush | Adult couple at an outdoor cafe |
| long-distance.webp | Sam | Pale sky blue | Sunset from an airplane window |
| mixed-signals.webp | Chris | Pale lavender | Adult couple on an evening walk |
| reconnecting.webp | Jordan | Muted sand | Two empty chairs on a beach |
| everyday-care.webp | Leo | Pale mint | Golden retriever asleep on a sofa |
| making-time.webp | Ethan | Light slate blue | Office desk and coffee at dusk |
| who-texts-first.webp | Noah | Pale warm gray | Rainy city street through a cafe window |
| cancelled-plans.webp | Oliver | Pale peach | Cinema tickets and popcorn |
| after-the-date.webp | Max | Soft cream | Adult couple laughing in a park |
| where-we-stand.webp | Daniel | Pale lilac | Two mugs on a kitchen table |

## Interaction

The first six images form the top row; the remaining six form the bottom row. Each row duplicates its six-card group for a seamless CSS transform loop. Duplicates are hidden from assistive technology and the tab order. Desktop rows move in opposite directions without pausing on hover and offer an explicit pause control. Both rows hide their scrollbars. Touch devices use the same automatic opposite-direction loops as desktop, without manual horizontal scrolling. Reduced-motion preferences show a static wrapped gallery. Cards open a native modal dialog with an image, text transcript, and a relevant analysis link. The section explicitly labels the images as fictional AI-generated illustrations.
