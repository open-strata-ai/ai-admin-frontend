# ADR-0004: `TenantSwitcher` is shared with `ai-portal-frontend`

- **Status**: Pending (Open)
- **Date**: 2026-07-17
- **Suggested by**: OpenStrata Architecture Group
- **Repository**: ai-admin-frontend
- **Source**: `docs/DESIGN.md` §11 Open Issue
- **Associations**: `ai-portal-frontend`, `ai-ui-kit`

##Context

Whether to withdraw `ai-ui-kit` (same as §11 Open Question 5 of `ai-portal-frontend`).

## Decision Options (Options Considered)

1. **Maintain status quo / conservative default**: Maintain current behavior, controlled by configuration switches or explicit parameters, and do not introduce destructive changes.
2. **Unified implementation after cross-repository alignment**: Make a clear contract with the relevant services (`ai-portal-frontend, ai-ui-kit`) before implementation.
3. **Phased introduction**: Leave a placeholder/default switch in the current stage, and solidify it in subsequent stages after the dependent capabilities are ready (see Related Architecture §).

## Recommended decision (Decision)

This ADR solidifies "`TenantSwitcher` and `ai-portal-frontend` sharing" as an architectural decision record and includes it in `docs/adr/` for continuous tracking. This issue stems from the `docs/DESIGN.md` §11 open issue and is still open.

**Conservative Default Principle**: Before the final decision is made, the "minimum available + explicit configuration switch" shall prevail, maintain the current behavior, and not destroy the existing contract and cross-repository SPI interface; this ADR status will be written back after review by the relevant team.



## To be aligned / Follow-ups (Follow-ups)

- Alignment confirmation with `ai-portal-frontend`: clarify responsibility boundaries/interface contracts/data flow direction to avoid double writing or semantic drift.
- Alignment confirmation with `ai-ui-kit`: clarify responsibility boundaries/interface contracts/data flow direction to avoid double writing or semantic drift.
- Associated architecture documents §11 (as a basis for decision-making and a source of consistency verification).
- Solidify the decision before the review at the corresponding stage, and write the final conclusion back into this ADR (the status is changed from "Pending" to "Adopted").

## Traceback

- Upstream design: `docs/DESIGN.md` §11 Open issue
- Relevance index: see `docs/adr/README.md`
