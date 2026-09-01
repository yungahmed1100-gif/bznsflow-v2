# Playbook source

`public/bznsflow-sme-operating-playbook.pdf` is generated from `playbook.html`, not hand-made.

```bash
node playbook/render.mjs playbook     # writes playbook/out.pdf
cp playbook/out.pdf public/bznsflow-sme-operating-playbook.pdf
```

The previous playbook shipped as a binary with no source. It drifted until it contradicted the
vault on pricing, roster and statistics, and nobody could see it happening. Every figure in
`playbook.html` traces to `~/Desktop/obsidian/business/`:

| Claim | Source |
|:--|:--|
| 10 min · 80% · 21× · OMR 5,000+ | `Market/Positioning.md` — industry data, labelled as such in the document |
| median 1s · 78.6% · 94.8% · n=498 | `Market/Response-Time-Proof.md` |
| OMR 40/70 · 120/210 · 300/525 | `Market/Pricing.md` |
| Delivered work | `Brand/Portfolio-Assets.md` — the two `CONCEPT` rows are deliberately excluded |

Do not state the 30-day guarantee here. Its definition ("agreed number of qualified appointments")
does not translate to an infrastructure sale and is unresolved — see
`Decisions/2026-09-01-Reposition-As-AI-Infrastructure-For-GCC-SMEs.md`.
