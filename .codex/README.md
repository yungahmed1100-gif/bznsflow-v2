# Codex workspace: BznsFlow Green

This project uses React 18, React Router static prerendering, Vercel APIs and Convex. Open Codex in this repository. Project MCP configuration lives in `config.toml`; discoverable skills live in `../.agents/skills/` (the supported repository skill location).

## Installed workflows

| Invoke | Use |
| --- | --- |
| `$bznsflow-dashboard-engineering` | Sector workflows, responsive EN/AR UI, real-data and preview separation |
| `$bznsflow-convex-engineering` | Schema/index design, tenant boundaries, authorization, jobs |
| `$bznsflow-layla-evaluation` | Intent/answer improvement, evaluation datasets, fine-tuning assessment |
| `$bznsflow-rag-engineering` | Ingestion, hybrid retrieval, grounding, versioning and retrieval evaluation |
| `$bznsflow-performance` | Measured browser/API/database/retrieval optimization |
| `$bznsflow-release-verification` | Proportional verification, authorized rollout and evidence |

Skills also support automatic selection. They are original project-specific instructions, informed by the official references below, not copies of third-party skill packs. No application package or model choice is changed by this setup.

## MCP tools

| Server | Setup | Scope |
| --- | --- | --- |
| openaiDeveloperDocs | Official remote endpoint; no project secret | OpenAI/Codex API documentation; reuses existing global name |
| context7 | Remote endpoint | Version-specific library documentation; send library questions, not private code/data |
| playwright | Pinned `@playwright/mcp@0.0.83`, headless, isolated | Browser exploration; repeatable suites still use existing project Playwright |
| convex-green | Installed Convex CLI 1.45.0, fixed project/deployment | Status, schemas, function specifications, performance insights |
| supabase | Disabled here, original URL retained | Legacy migration source, not the Green application backend |
| convex-blue | Disabled here | Prevent accidental use of the other project |

Convex data, logs, arbitrary execution/query and environment tools are disabled in this MCP. Use scoped CLI operations when the task needs them and existing authorization permits them. The selector does not restrict the underlying global credential; a deployment-scoped credential is needed for a stronger account boundary. No credentials were copied into this configuration.

Other global MCPs (including Vercel, code-review-graph and Cloudflare) remain inherited. Use only tools relevant to the current task; do not rebuild a whole graph or load all skills at startup. No MCP connection trains Layla or provisions a vector database by itself.

Reload the Codex workspace to load changed MCP configuration. The project must be trusted for project configuration to apply. Run `codex mcp list` from this directory to inspect effective registration. MCP registration is not proof of authentication or tool health. Context7 can have anonymous rate limits; if it later needs authentication, configure it through your local credential mechanism rather than committing a key. Playwright's first start downloads its pinned package; browser installation is needed if the host has no supported browser.

The Convex command and project directory are absolute because this workspace path contains spaces and must not accidentally resolve Blue. Update both paths if the checkout moves. Use the lockfile-managed CLI; do not replace it with unpinned `convex@latest` at startup.

## Working examples

- “Use $bznsflow-dashboard-engineering to improve automotive work orders; verify Arabic RTL and manager/employee permissions.”
- “Use $bznsflow-layla-evaluation to diagnose wrong Arabic price answers against a held-out set before changing prompts.”
- “Use $bznsflow-rag-engineering to compare existing lexical retrieval with hybrid retrieval on this synthetic corpus.”
- “Use $bznsflow-performance to measure and reduce dashboard load latency; report before/after evidence.”

Read [project-map.md](references/project-map.md) only when locating a workflow, and [ai-evaluation.md](references/ai-evaluation.md) when building AI experiments. Verify the harness with `python3 .codex/scripts/validate.py` (Python 3.11+). It checks structure and references, not production connectivity.

## Research and update policy

Researched 2026-10-05 against installed Codex 0.157.1 and official sources:

- [Codex skills](https://developers.openai.com/codex/skills/) — discovery and progressive loading.
- [Codex MCP configuration](https://developers.openai.com/codex/mcp/) — project MCP servers and tool filters.
- [OpenAI documentation MCP](https://developers.openai.com/learn/docs-mcp) — official docs endpoint.
- [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp) — isolated browser automation; CLI/skills can be more economical for repeated tests.
- [Context7](https://github.com/upstash/context7) — current library docs; remote service is not version-pinned.
- [Convex MCP](https://docs.convex.dev/ai/convex-mcp-server) — metadata versus production data/mutation tools.
- [Convex vector search](https://docs.convex.dev/search/vector-search) and [text search](https://docs.convex.dev/search/text-search) — supported retrieval primitives.
- [OpenAI evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices) — task-specific datasets and continuous evaluation.
- [Vercel React skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) — additional reference for React performance; do not apply Next.js-only rules here.

Review package pins deliberately when upgrading. Newer tools earn adoption through measured benefit, not popularity. No arbitrary skill installer or remotely fetched shell script runs automatically.

## Verification recorded 2026-10-05

- Installed Codex accepted the merged project/global configuration via `codex mcp list --json`.
- All six skills passed the bundled official skill-creator validator (isolated PyYAML environment).
- Local structure/reference validation passed.
- Playwright MCP initialized and listed 25 browser tools; this is startup evidence, not a browser journey test.
- Convex MCP initialized and listed exactly `status`, `tables`, `functionSpec`, `insights`; no production data or mutation was requested.
- OpenAI Docs and Context7 returned HTTP 200 with successful MCP initialization; no secret was required for these checks.

Restart/reopen this workspace for these registrations to become tools in a new Codex session. These checks do not certify future provider uptime or prove that an MCP account can access every resource.

## Matching the existing Claude workspace

The existing `.claude` setup is preserved. Its Impeccable 4.3.1 skill, references and launcher are copied to `.codex/skills/impeccable`; `.agents/skills/impeccable` is a relative symlink for Codex discovery. Invoke `$impeccable` for UI design work. The earlier six engineering skills remain available.

Four roles are registered in `config.toml` and stored in `.codex/agents/`: `impeccable_asset_producer`, `impeccable_manual_edit_applier`, `impeccable_finish_reviewer`, and `impeccable_documenter`. Their instructions retain the Claude role content with Codex paths and tool adaptation. Model selection is inherited; the finish reviewer uses a read-only sandbox. Claude-only `maxTurns` and tool-list metadata are not silently treated as Codex enforcement.

PostToolUse and Stop command hooks call the same design detector through the Codex copy. The post-edit matcher covers `apply_patch` and Edit/Write compatibility names; arbitrary shell edits are not automatically equivalent to structured edit events. Local command hooks do not run under cloud orchestration: use the skill's manual/degraded workflow there. Do not claim hooks ran unless there is evidence. Claude shell allowlists are intentionally not translated into blanket Codex permissions. No legacy n8n server definition exists in this project's `.mcp.json`; its name in Claude's enabled list is not enough to configure a working server. Existing code-review-graph is inherited globally, and Green MCP settings remain current.

Verified: the installed Codex parser accepts all role and hook configuration, all role TOMLs parse, the skill passes the official validator, the launcher answers its engine probe, and a non-edit hook fixture exits cleanly. A real UI-edit/Stop event still needs confirmation in a fresh local Codex session; this current session cannot reload the new hooks. Role config paths are absolute to accommodate the installed parser; update them if moving the checkout.

Native format references: [Codex custom agents](https://developers.openai.com/codex/subagents/) and [Codex configuration/hooks](https://developers.openai.com/codex/config-reference/).
