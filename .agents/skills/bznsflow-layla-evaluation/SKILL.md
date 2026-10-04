---
name: bznsflow-layla-evaluation
description: Improve Layla answers, intent routing, qualification, knowledge or training data using reproducible bilingual evaluations. Includes fine-tuning assessment when explicitly relevant.
---

# Layla Evaluation

Start with `api/_lib/layla/domain.js`, `api/_lib/layla/rag-engine.js`, `config/eval-questions.js`, and the relevant messaging/qualification path. Read `.codex/references/ai-evaluation.md` for dataset and experiment contracts.

Treat training as measured behavior improvement: first distinguish missing source facts, retrieval misses, classifier/slot errors, answer policy, and generation errors. Do not assume fine-tuning is needed. Fixed prices, hours, availability and opt-outs stay in authoritative data and deterministic rules.

Create a versioned baseline on representative English, Arabic and mixed-language questions. Include Omani phrasing, ambiguous/multi-intent queries, unknown facts, adversarial retrieved text, explicit human requests and opt-outs. Separate development examples from held-out evaluation by source/conversation to prevent leakage. Label synthetic cases and retain consent/provenance for real data.

Change one material variable at a time. Measure routing, retrieval and answer correctness separately, alongside refusal/escalation, unsupported claims, latency and cost. Use deterministic graders where possible; calibrate any model judge against human-labelled examples. Compare baseline and candidate on the same held-out set.

Run `node --test tests/blue-qualification.test.mjs tests/blue-rag.test.mjs tests/eval-harness.test.mjs` and inspect the CLI options of `scripts/eval-intents.mjs` before using it. Paid model runs or uploading client data require task-specific scope. Never turn evaluation into live WhatsApp sending. Fine-tune only when a labelled dataset and baseline show a stable behavioral gap that retrieval/prompt fixes cannot economically solve; mutable business facts do not belong in weights.
