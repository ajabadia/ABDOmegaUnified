# Methodology (Orchestrator V2)

## 🛠️ Workflow
1. **Brainstorming**: Produce `SPEC.md` or update specs.
2. **Implementation Planning**: Produce task plans.
3. **Execution**: TDD/Clean Code + Atomic Commits.
4. **Verification**: Complete automated E2E tests + manual checks + `walkthrough.md`.

## ⚖️ Iron Laws
1. **Required Sequence**: Do not code without a Spec and a Plan.
2. **Continuous Verification**: Run the audit (`npm run full-audit`) before final integration.
3. **Traceability**: All structural changes must align with ADRs and roadmap goals.
