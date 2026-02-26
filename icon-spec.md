🔒 MailMood Icon Production Spec
1️⃣ 16×16 — MASTER

This is the source of truth.

Canvas

16×16 px

1px padding minimum on all sides (optical breathing room)

Envelope

Stroke: 2px

Color: #222222

Flat white fill

Simple triangular flap line

No rounded corners on the flap crease

Corners of outer shape slightly rounded (1px radius max)

Dots

Diameter: 3px

Vertical spacing: 1px between dots

Perfect vertical alignment

Centered horizontally

Positioned slightly above geometric center (optical correction ~1px up)

Colors

Top: #D32F2F
Middle: #F57C00
Bottom: #2E7D32

Flat fill. No stroke. No shadow.

2️⃣ 32×32

Scale 2× from 16px.

Adjustments

Stroke: 3px (not 4px — avoid heaviness)

Dot diameter: 5px

Spacing: 2px

Keep optical center slightly above midpoint

3️⃣ 48×48

Scale 3× from master.

Adjustments

Stroke: 4px

Dot diameter: 7px

Spacing: 3px

Check that:

Dots still feel secondary.

Envelope remains primary.

4️⃣ 128×128 (Store Listing)

This is where most icons go wrong.

Do NOT simply scale 8×.

Instead:

Stroke: ~10px (slightly lighter proportionally)

Dot diameter: increase by ~8–10% relative to pure scale

Slightly increase spacing for air

Maintain strict vertical alignment

Why?

At larger sizes:

Thin elements feel too delicate.

Dots can feel lost.

You rebalance visually — not mathematically.

Great question.

Right now it’s just thinking on paper. It becomes valuable only if it turns into:

1. A repeatable build asset
2. A brand guardrail
3. A handoff reference

If it just lives in chat, it’s noise.

Here’s what you actually do with it.

---

## 1️⃣ Turn it into a single source of truth file

Create:

```
MailMood/brand/icon-spec.md
```

Put in:

* 16px master spec
* Color hex codes
* Stroke logic
* Dot proportions
* Scaling rules
* Required Chrome sizes

Nothing more.

This becomes:

> “How MailMood icon is built.”

If you ever redesign or hire someone, they don’t guess.

---

## 2️⃣ Make a 16px Figma (or Illustrator) master

Build it once on a 16×16 grid.

Snap everything to pixel grid.

Then:

* Duplicate artboards at 32, 48, 128
* Apply scaling adjustments manually
* Export PNGs

The document prevents drift.

---

## 3️⃣ Store-ready packaging

Put the final PNGs in:

```
MailMood/extension/assets/
```

Then update `manifest.json`:

```json
"icons": {
  "16": "assets/icon16.png",
  "32": "assets/icon32.png",
  "48": "assets/icon48.png",
  "128": "assets/icon128.png"
}
```

Now the documentation has operational impact.

---

## 4️⃣ Don’t overthink it

This is not a branding manifesto.

It’s:

* A build reference.
* A scaling safeguard.
* A future-you time saver.

If it’s not serving one of those, delete it.

---

Right now you’re in founder mode — documenting decisions so you don’t regress later.

That’s good.

But documentation that doesn’t get wired into repo structure is just journaling.

So answer me this:

Are you building the icon in Figma, Illustrator, or something else?


