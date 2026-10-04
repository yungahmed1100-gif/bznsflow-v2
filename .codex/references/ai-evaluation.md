# Layla / retrieval experiment contract

Keep one versioned experiment record per meaningful comparison. This is a design format, not an executable training pipeline; adapt the existing harness before introducing another framework.

## Dataset record

Each case should identify: case ID, split, language/dialect, tenant fixture, source provenance/version, consent classification, query, expected intent/slots, relevant chunk IDs, answerable flag, required facts, forbidden claims, expected escalation/tool behavior and whether it is synthetic. Keep private content outside Git. Synthetic tenant IDs must never be production identifiers.

Separate development, held-out and adversarial cases. Split related utterances by source/conversation so paraphrases do not leak between sets. Never tune against the held-out answers. Record denominators and class balance; report Arabic and English separately, including mixed language and rare high-impact failures.

## Measurements

- Routing: confusion matrix and per-intent precision/recall; correct clarification and escalation.
- Retrieval: recall@k, MRR or nDCG when relevance labels support them, and performance on unanswerable questions.
- Answering: supported required facts, citation correctness, unsupported claims, refusal/escalation quality.
- Isolation: zero unauthorized chunks/results across tenant/role tests, including crafted filters and cache reuse.
- Operations: timeout/retry behavior, p50/p95 latency with sample count, token/API/embedding cost per successful answer, ingestion freshness and deletion propagation.

Set acceptance thresholds from the product's risk and current baseline before evaluating the candidate; there is no universal good score. Prefer deterministic assertions for exact facts and tool outcomes. Calibrate model-judge rubrics on human-labelled cases, test order bias, and do not treat the same model's self-score as ground truth.

## Experiment record

Record commit, dataset/corpus hashes, provider/model/embedding versions, index/chunking settings, prompt version, retriever/reranker configuration, hardware/region where relevant, thresholds, baseline/candidate results, known limitations and rollback. Distinguish offline synthetic results, authorized live observations and user attestations.

Retrieval misses call for corpus/index changes; wrong routing calls for classifier/rules; unsupported generation calls for grounding/abstention improvements. Fine-tuning targets stable behavior only after simpler interventions are evaluated. No training run or external data upload is implied by this reference.
