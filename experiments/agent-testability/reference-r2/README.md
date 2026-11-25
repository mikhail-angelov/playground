# R2 reference

R2 adapts the R1 product at `682a6fa` and its recorded calculator fixture. The [product diff](../fixtures/product-R1-to-R2.patch), [calculator diff](../fixtures/R1-to-R2.patch) and [SHA-256 manifest](SHA256SUMS) pin the inputs. The R2 fixture preserves the sequence of 1,103 recorded upstream SSE timestamps and the calculator JavaScript.

The [recorded reference](calc-01.spec.ts) uses the named UI controls for CALC-01 C1–C8, checks DOM ID references, tests keyboard input and checks generation and Apply feedback. The successful run archived the working `src` from a temporary Git index initialized at R1. Both Playwright tests, TypeScript and all 17 Jest tests passed on that archive. The replayed browser SSE matched the fixture byte for byte. A separate local replay verified that empty and interrupted provider streams sent no completion marker and that an empty continuation made only one provider request.

The [private run](../artifacts/reference-R2-YA7Vhn/run.json) includes the [DOM and ARIA snapshot hashes](../artifacts/reference-R2-YA7Vhn/snapshots.sha256), [Playwright report](../artifacts/reference-R2-YA7Vhn/playwright.json) and [provider error results](../artifacts/reference-R2-YA7Vhn/provider-errors.json). The [revision config](../configs/R2.json) records the tested source tree and keeps the commit pin pending.
