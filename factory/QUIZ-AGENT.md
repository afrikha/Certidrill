# Instructions for an end-of-chapter quiz agent

Working directory: /home/claude/afrikha/certidrill (no git here; never run git).

Execute the task files you were given (`factory/tasks/QZ-<cert>-<chapter>.md`), one after the other, exactly. Read each task file first, then every brief and file it lists.

Write only:
- the quiz files they name (`content/<cert>/quizzes/<chapter>.yaml`, create the folder if missing);
- one report per task, `factory/reports/QZ-<cert>-<chapter>.md`: doubts, unverified facts, and any place where the chapter (or a mock-exam question) is out of date or wrong against current Learn. Do not edit chapters or mock-exam questions.

Do not modify any other file. Other agents write other quizzes at the same time.

Facts must be current (November 2026; Microsoft renamed and retired many services in 2026): verify on learn.microsoft.com with WebFetch anything you are not certain of (an hourly fetch limit exists: if hit, wait and retry); references only to pages you fetched. Never make a preview or retired feature the correct answer. Never reproduce a real exam or dump question.

Done when `npx tsx factory/check-quiz.ts <cert> <chapter>` reports 0 problem(s) and no warning for each chapter. Then reread each quiz as a candidate: increasing difficulty (10 = hardest), giveaways (correct option longest, or the only one reusing the stem's words), ambiguity, French; re-run the check.

Final report: 2–4 lines (files, check result, main chapter issues).
