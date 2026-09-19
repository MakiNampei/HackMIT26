# Course materials and Dropbox demo

## User flow

Open **Courses** in the sidebar, add a course, and upload a syllabus, lecture, or assignment. Existing courses can also be opened. Courses are campus-visible to authenticated users; document originals and analyses are private to the uploading account.

The upload accepts PDF up to 10 MB, or UTF-8 TXT/Markdown up to 100 KB. Export slides to PDF. OpenAI analyzes the actual document and returns a summary, topics, dates as written, and collaboration rules with quotations and PDF page references. Missing rules remain unknown and require instructor review. There is no mock-analysis fallback. A failed analysis retains the document and offers Retry analysis.

**Plan a study session** loads a draft from the selected private document: course, session type, title, topic, and a review reminder for collaboration rules. The user reviews it before submitting. This draft does not mark a session policy verified or attach an instructor-approved policy.

## Storage setup

Run from the repository root with credentials in the ignored `.env.local`:

```sh
node --env-file=.env.local scripts/setup-course-storage.mjs
```

This creates a private `course-materials` Supabase Storage bucket. Application APIs authorize requests through Supabase Auth, derive the owner ID from the verified session, and use owner/course/UUID paths. The service-role key remains server-only. Original files and JSON analyses are stored together; no additional SQL migration is needed. Never make the bucket public or add broad storage read policies.

The new course-material analysis calls OpenAI directly with `store: false` and the configured `OPENAI_MODEL`; it does not use the older policy service's `OPENAI_LIVE_MODE` mock switch. The upload UI discloses that the selected document is sent to OpenAI.

## Dropbox Chooser setup

1. Create a Dropbox app in https://www.dropbox.com/developers/apps .
2. Configure its Chooser/Saver domains: `localhost` for development and your deployment hostname for production.
3. Set `NEXT_PUBLIC_DROPBOX_APP_KEY` in `.env.local` to its app key (not app secret or access token), then restart the dev server.
4. Open a course and click **Import from Dropbox**. Choose a PDF/TXT/Markdown file.
5. The browser downloads the selected direct link and uploads a copy into the user's private course library. The expiring Dropbox link is not persisted. AI analysis and session drafting work just like local uploads.

Chooser is a real Dropbox integration. It uses Dropbox's selection UI and the user's Dropbox session; it does not require our server to hold a Dropbox token. It is not the Codex Dropbox plugin. Until the app key is configured, the button is visibly disabled rather than pretending to import.

## Demo narrative

Start with scattered syllabus and lecture files in Dropbox. Import them into a course, inspect quotes behind collaboration rules and dates, then create a focused study-session draft from the extracted topics. This demonstrates content becoming an actionable plan. Confirm current sponsor rules separately; API integration alone does not guarantee challenge eligibility.
