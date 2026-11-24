# Task FIX-ai-901-2 — course and bank corrections, AI-901, chapters 22-text-speech, 23-vision-image-generation, 24-information-extraction

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/ai-901.md`.

Your chapters (and the only bank objectives you may touch):
- `22-text-speech`: objectives 2.2.1, 2.2.2, 2.2.3; findings in `factory/reports/QZ-ai-901-22-text-speech.md`
- `23-vision-image-generation`: objectives 2.3.1, 2.3.2, 2.3.3; findings in `factory/reports/QZ-ai-901-23-vision-image-generation.md`
- `24-information-extraction`: objectives 2.4.1, 2.4.2, 2.4.3, 2.4.4; findings in `factory/reports/QZ-ai-901-24-information-extraction.md`

Report: `factory/reports/FIX-ai-901-2.md`.

Checks: `npx tsx factory/check-cert.ts ai-901 22-text-speech 23-vision-image-generation 24-information-extraction`; `npm run -s content:validate -- --cert ai-901`; `npx tsx factory/check-quiz.ts ai-901 22-text-speech 23-vision-image-generation 24-information-extraction`.
