# Fresh review contract

Read-only review. Main owns implementation. Do not edit source, run git mutations, deploy, book/pay, write companion posts, read secrets, operate the original Claude pane, or create subworkers. Write only `docs/booking-tide-review-result-2026-09-07.md` and send one worker_done.

Read `docs/booking-tide-calendar-2026-09-07.md`. Review current files, not historical session claims:

- `src/components/BookingDatePicker.tsx`, `src/lib/fishingTide.ts`
- `src/services/tideService.ts`, `src/app/api/tide/route.ts`
- `src/instrumentation.ts`, `src/lib/retryFetch.ts`
- booking page/date hookup, detail calendar timeout, `src/services/boatCalendarService.ts`
- new tests `__tests__/unit/bookingTide.test.ts`, `instrumentation.test.ts`, `e2e/booking-tide-calendar.spec.ts`

Focus: wrong-date/wrong-station observations; Korean lunar numbering; stale data during month/station changes; missing heights versus zero; secrets and cache poisoning; native date picker suppression, keyboard and mobile flow; actual connection-budget correctness. Verify whether app instrumentation really changes Node fetch and whether a local pass can establish a production repair. Production is not yet redeployed. Existing unrelated edits must remain untouched.

Evidence: `http://localhost:3013/booking` (dev) and `http://localhost:3014/booking` (production build); `.codex/visual-evidence/*-booking-tides-390/result.json` distinguishes real tides from boat fixtures. Public production logs (already inspected) say `UND_ERR_CONNECT_TIMEOUT` at 10000ms to thefishing.kr:443; local source fetch succeeds. KHOA official current Swagger is at https://www.data.go.kr/data/15156018/openapi.do; API response body is top-level body.items.item, extreme codes are actually strings, DT_0018 is 군산 and DT_0025 is 보령. Do not call a deployment repair proven without deployed evidence.

Acceptance/calibration: run `node node_modules/vitest/vitest.mjs run __tests__/unit/bookingTide.test.ts __tests__/unit/instrumentation.test.ts` (contains valid 660cm case and rejected wrong date/station/missing-height cases). Review one current calendar screenshot. Maximum 8 minutes, one fresh reviewer. Read files and execute focused checks; no open-ended external research.

Return concrete findings with severity, file/line, reproducible cause and smallest fix. Separate blockers from optional improvement and pre-existing issues. Score 0–20 each: acceptance, correctness, verification, scope/safety, traceability. PASS only >=85 and no critical defect; explicitly limit production verdict. Review outcome succeeds if review itself completed, even if findings request rework.

Orchestration: main registration is project-local; no central currentWork mutation is authorized from this workspace. Guide 1.4.197; prior booking Runs were read-only QA and do not cover this new implementation.
