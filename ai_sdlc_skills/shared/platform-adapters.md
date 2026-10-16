# Platform adapters and qualification

Version: 2.0.0. Official documentation baseline rechecked 2026-10-16, Asia/Calcutta, for the skills/prompt/evaluation sources identified below. Earlier version-specific observations remain historical evidence, not guaranteed current runtime behavior. Qualify the actual selected host before relying on discovery, permissions or hooks.

## Portable source and distribution

The six source folders use SKILL.md with name, description and string-valued metadata.version. This follows the inspected [Agent Skills format](https://agentskills.io/specification). No allowed-tools grant or host-specific frontmatter is included. Descriptions identify capability and routing; they do not confer tool access.

Source entrypoints deliberately depend on sibling shared/, evaluations/ and scripts/. Keep the source pack together. Generated standalone bundles move one stage's entrypoint/references plus shared dependencies under its own root and rewrite local links. Validate the extracted distribution and its manifest before use; uploading an unbundled single source folder is incomplete.

Names remain plan/design/build/test/deploy/maintain for compatibility. Inspect actual installed collisions and negative/overlapping prompts rather than assuming a generic name will route correctly. A complete mixed-stage task needs the appropriate selected stage bundles available to the host.

Resolve installation location from the actual host. Do not embed a developer's machine path, globally install packages or modify user permission settings during pack validation.

## Codex adapter

[Codex skills](https://learn.chatgpt.com/docs/build-skills) documents repository .agents/skills and personal ~/.agents/skills discovery, with explicit and implicit invocation. Effective paths, loaded metadata and invocation must be tested against the installed version. Optional agents/openai.yaml is host-specific UI/policy metadata; its absence is not a portable-format defect. Keep normal automatic discovery unless the user requests explicit-only invocation.

[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) describes project/global instruction loading and closer-directory overrides. Inspect actual loaded instructions and truncation; instructions are context, not a privilege boundary. Preserve authorized repository conventions rather than writing new instruction files from transient findings.

[Sandbox](https://learn.chatgpt.com/docs/sandboxing), [approvals](https://learn.chatgpt.com/docs/agent-approvals-security), [hooks](https://learn.chatgpt.com/docs/hooks) and [noninteractive execution](https://learn.chatgpt.com/docs/non-interactive-mode) describe separate host facilities. Approval policy never suppresses prompts; it does not prove filesystem/network containment. Advisory/post-action/background hooks cannot supply reliable prevention of a completed effect. Check exact installed options and supported blocking/error behavior instead of assuming every tool shares a boundary.

A documented CLI option, schema-shaped response or successful command does not prove the requested action was authorized or correct.

## Claude adapter

[Claude Code skills](https://code.claude.com/docs/en/skills) documents .claude/skills/<name>/SKILL.md and personal ~/.claude/skills. Explicit/implicit invocation, extensions and effective installation are host-specific. allowed-tools can preapprove tools under host policy and is intentionally absent. disable-model-invocation, context, agent, hooks, model, paths and argument substitutions are extensions; do not add them to the portable source without a justified adapter.

[Memory](https://code.claude.com/docs/en/memory), [permissions](https://code.claude.com/docs/en/permissions), [sandbox](https://code.claude.com/docs/en/sandboxing) and [hooks](https://code.claude.com/docs/en/hooks) distinguish instruction context, managed permission policy and execution facilities. Actual OS, shell, file/MCP tools and hooks can have different coverage. Inspect the installed host's capabilities and error/timeout behavior. Do not assume a documented later-version hook feature exists in an older installed runtime.

Cross-surface distribution remains UNRESOLVED: [Platform overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) and Code documentation describe surface-specific capabilities and synchronization differently. Test the intended account/runtime/surface; do not claim universal account sync or universal separation.

## Prompt and evaluation guidance

[OpenAI skill evaluation](https://developers.openai.com/blog/eval-skills) describes evaluating prompts through captured traces/artifacts and checks. [OpenAI skill/prompt guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) supports concise scoped discovery and avoiding generic instruction bloat. [OpenAI prompting](https://developers.openai.com/api/docs/guides/prompt-engineering) and [evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices) support empirical regression and calibrated task/tool/handoff assessment.

[Anthropic skill authoring](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) supports progressive disclosure, representative evaluation before authoring and trials on intended models. [Claude prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) supports clear constraints, relevant examples and separation of context/instructions. These are guidance, not guaranteed correctness or vendor certification.

Use the runner-neutral [cases](../evaluations/cases.md) and frozen [assessment policy](../evaluations/assessment-policy.json). Record no-skill baseline, fresh-instance repetitions, raw tool traces, artifacts, candidate digests, independent fixture oracles and grader identity. A local deterministic report is not an agent behavioral run.

## Qualification procedure

1. Record host/model/OS versions, loaded instruction/skill paths and digests, actual tool inventory, identity scope and governing policy.
2. In an authorized isolated workspace, verify selected explicit/implicit prompts, negative/overlapping prompts, resource loading and a representative allowed action.
3. Where an execution boundary is mandatory, test permitted/denied paths, unavailable control, timeout/error/malformed response, cancellation and unknown-result reconciliation using fixture targets. Never test denial by making an unauthorized live production write.
4. Preserve commands/configuration, action traces, results, limits and independent review. Required unavailable/fail-open coverage blocks its affected operation; useful unrelated drafting can continue.

A fixture denial proves only its tested boundary. Record untested MCP/network/shell/file coverage explicitly. Requalify affected cases after relevant host/model/policy/tool/skill changes. Documentation and source inspection alone leave installed-host behavior NOT_RUN.
