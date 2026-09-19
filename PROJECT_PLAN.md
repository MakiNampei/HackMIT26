# StudySync - HackMIT 2026 Project Plan

> **Tagline:** Academic collaboration, without the chaos.
>
> **One-line pitch:** StudySync turns scattered course materials into policy-safe, AI-coordinated study sessions with the right classmates, time, and place.

## 1. Product thesis

Students currently jump among course files, LMS pages, group chats, calendars, and room-booking sites. StudySync gives that fragmented content a useful outcome:

1. Import a syllabus, assignment instructions, and other course files.
2. Use AI to extract the instructor's collaboration policy with citations and a confidence score.
3. Match students by course, assignment, availability, group size, and complementary skills.
4. Have a coordinator agent propose a group, common time, and suitable room.
5. Require every member to acknowledge the policy before confirming the session.

The AI summarizes the instructor's written policy; it does **not** make the academic-integrity decision. If the source is missing or ambiguous, the product must ask the student to confirm with the instructor.

## 2. Challenge fit

### Dropbox - primary product framing

**Challenge theme:** turn messy, fragmented digital content into something organized, understandable, or actionable.

StudySync fits in two especially strong ways:

- **Files into action:** a folder of syllabi, assignment PDFs, notes, and schedules becomes collaboration rules, study groups, calendar-ready sessions, and next steps.
- **StudentOS:** connect students, courses, assignments, skills, groups, spaces, and goals in a navigable campus graph.

Demo proof:

- Import several realistically messy course files.
- Show automatic course/assignment grouping and source-backed policy extraction.
- End with an actual study-session proposal rather than a generic summary.

### Meta - human connection outcome

**Challenge theme:** use essential, well-integrated AI to strengthen real human connection.

StudySync should emphasize that AI is the bridge to an offline relationship, not the destination:

- Find classmates with the same immediate academic goal.
- Prefer complementary skill matches, not only identical profiles.
- Summarize group constraints into a plan everyone can accept.
- Turn an online request into an in-person study session.

Optional Meta integration, only after the core flow works:

- Use Muse Spark for a second-pass group-plan summary or connector demo.
- Use Muse Voice Transcribe for a voice request such as “find me a group tomorrow evening.”
- Avoid Facebook Graph API unless consent, test data, and setup are reliable; it is not needed for the MVP.

Meta submission checklist:

- Working prototype.
- Public repository.
- 2-3 minute demo video.
- Short write-up covering target user, strengthened connection, and why AI is essential.

### OpenAI - core intelligence and build story

**Challenge theme:** build an ambitious OpenAI API experience and show how Codex materially improved planning, implementation, testing, debugging, or iteration.

OpenAI API responsibilities:

- Extract structured collaboration rules from course files.
- Return evidence spans/citations and calibrated confidence.
- Convert natural-language intent into coordinator-agent steps.
- Explain match rationale and produce a concise, actionable session plan.

Codex evidence to preserve during development:

- This plan and architecture decisions.
- Meaningful implementation commits.
- Tests or eval cases Codex helped create.
- One concrete before/after example where Codex found a bug, improved reliability, or accelerated an iteration.

## 3. Hackathon MVP

### Must-have demo path

1. Student selects a course and an **Assignment** session.
2. Student uploads a syllabus or assignment-policy document.
3. AI returns structured rules, cited evidence, confidence, and an ambiguity warning when needed.
4. Student creates a session with topic, group-size range, skills, and availability.
5. Seeded classmates are ranked with a transparent compatibility score.
6. The coordinator proposes the best group and overlapping time.
7. Each member acknowledges the collaboration policy.
8. The app recommends a room and produces a confirmed session summary.

### Explicitly out of scope for MVP

- Direct university authentication or LMS integration.
- Real room booking; link to an existing reservation page.
- Real Facebook friend data.
- Fully autonomous decisions when policy evidence is unclear.
- A production-scale campus directory.

## 4. Technical framework

### Suggested stack

- **Web app:** Next.js + TypeScript + Tailwind CSS
- **Backend:** Next.js route handlers/server actions
- **Data:** Supabase/Postgres; local seeded JSON is acceptable for the first demo
- **Files:** Dropbox API when credentials are ready; local upload adapter as a reliable fallback
- **AI:** OpenAI Responses API with structured JSON output
- **Validation:** Zod schemas for every AI-produced object
- **Deploy:** Vercel

### Architecture

```text
Student UI
   |
   +-- Course content import ------> Content adapter
   |                                  +-- Dropbox
   |                                  +-- Local demo files
   |
   +-- Study request -------------> Coordinator service
                                      |
                   +------------------+------------------+
                   |                  |                  |
             Policy agent       Matching engine    Schedule/room engine
                   |                  |                  |
             OpenAI API          deterministic      deterministic
             + citations            scoring          constraints
                   |                  |                  |
                   +------------------+------------------+
                                      |
                              Session proposal
                                      |
                           acknowledgement + confirm
```

Keep policy interpretation and natural-language planning in the AI layer. Keep schedule intersection, capacity constraints, and match-score math deterministic and testable.

### Initial domain model

| Entity | Minimum fields |
|---|---|
| User | id, name, school, courses, can_help, needs_help |
| Course | id, school, department, number, name |
| ContentItem | id, course_id, provider, path, type, extracted_text |
| PolicyResult | content_id, rules, evidence, confidence, needs_review |
| StudyRequest | creator_id, course_id, assignment, topic, availability, group_size |
| Match | request_id, user_id, score, reasons |
| StudySession | members, policy_id, time, room, status |
| Acknowledgement | session_id, user_id, accepted_at |

### Structured policy result

```json
{
  "collaboration_allowed": true,
  "discussion_allowed": true,
  "solution_sharing_allowed": false,
  "individual_submission_required": true,
  "comparing_final_answers": "unclear",
  "summary": "Students may discuss approaches, but must submit independent work.",
  "evidence": [
    {
      "quote": "Discussion of approaches is permitted...",
      "source": "homework-4-policy.pdf",
      "page": 2
    }
  ],
  "confidence": 0.93,
  "needs_instructor_review": false
}
```

### Match scoring v0

```text
same course            +40
same assignment        +30
schedule overlap       +20
group-size preference   +5
complementary skills    +5
```

The UI must show score reasons. Do not let an LLM silently invent or change the numerical ranking.

### Session state machine

```text
OPEN -> GROUP_FORMED -> TIME_MATCHED -> POLICY_VERIFIED -> ROOM_SELECTED -> CONFIRMED
```

Invalid transitions should fail clearly. A room cannot be selected until group size and common time are known; an assignment session cannot be confirmed until all members acknowledge the policy.

## 5. TODO

### P0 - foundation

- [x] Define the unified Dropbox + Meta + OpenAI story.
- [x] Freeze the eight-step MVP demo path.
- [x] Scaffold the Next.js/TypeScript app.
- [x] Add environment-variable template with no secrets committed.
- [x] Create reusable types and Zod schemas for the domain model.
- [x] Add initial seeded demo data for courses, students, rooms, policies, and sessions.
- [x] Build a repository interface so mock data can be replaced by Supabase.

### P0 - policy guard

- [ ] Implement file upload/import and text extraction.
- [ ] Implement OpenAI structured policy extraction.
- [ ] Require citations for every extracted rule.
- [ ] Mark missing, conflicting, or low-confidence evidence as `needs_instructor_review`.
- [ ] Build the policy result card and acknowledgement UI.
- [ ] Add the disclaimer that StudySync summarizes instructor policy rather than deciding it.
- [ ] Create at least six eval fixtures: allowed, prohibited, partial, ambiguous, conflicting, and no-policy-found.

### P0 - coordination loop

- [x] Build create-session form.
- [x] Implement deterministic availability intersection.
- [x] Implement deterministic match-scoring foundation with reason output.
- [ ] Implement complete group-size and room-capacity constraints.
- [x] Build session progress and confirmation screens.
- [ ] Add a natural-language coordinator request backed by explicit tools/functions.

### P1 - polished challenge demo

- [ ] Add Dropbox OAuth/API integration or a recorded reliable sandbox flow.
- [ ] Show content grouped by course and assignment as a lightweight StudentOS graph/list.
- [ ] Add one Meta Muse integration only if it improves the human-connection story.
- [ ] Add loading, empty, ambiguity, and failure states.
- [ ] Make the full golden path runnable in under 90 seconds.
- [ ] Add analytics events for import, policy review, match, acknowledgement, and confirmation.

### P1 - testing and safety

- [ ] Unit-test scoring, time overlap, room capacity, and state transitions.
- [ ] Validate every model response before storing or rendering it.
- [ ] Prevent completed assignments/solutions from being uploaded in the demo flow.
- [ ] Keep uploaded course content private and document retention behavior.
- [ ] Add prompt-injection-resistant handling: files are untrusted course content, not system instructions.
- [ ] Add a human-review path when confidence is low.

### P1 - submission assets

- [ ] Write the public README with setup and architecture.
- [ ] Prepare a 2-3 minute demo script and video.
- [ ] Write the Meta submission explanation.
- [ ] Document exactly where Dropbox content becomes action.
- [ ] Capture the OpenAI API architecture and one Codex impact story.
- [ ] Verify the repository contains no API keys or private student data.

### P2 - stretch ideas

- [ ] Voice-based study request.
- [ ] Skill-complementarity visualization.
- [ ] Calendar `.ics` export.
- [ ] Real room-booking connector.
- [ ] Multiplayer campus knowledge graph.
- [ ] Feedback loop that improves ranking weights after completed sessions.

## 6. Demo script outline

1. **Chaos:** show an unorganized folder containing a syllabus, assignment PDF, notes, and schedule.
2. **Understanding:** import it; StudySync identifies the course and cites the collaboration policy.
3. **Safety:** show the allowed/prohibited/unclear rules and acknowledgement requirement.
4. **Connection:** ask, “Find me a group for Homework 4 tomorrow evening.”
5. **Reasoning + tools:** show candidate ranking, time intersection, and room-capacity checks.
6. **Action:** confirm a four-person, in-person session with a booking link.
7. **Challenge close:** one sentence each for Dropbox (content to action), Meta (real human connection), and OpenAI (AI-native coordination plus Codex build impact).

## 7. Success criteria

- A judge understands the problem and sees the end-to-end payoff within 30 seconds.
- Every policy claim is traceable to source evidence.
- Ambiguity produces human review, never false certainty.
- Matching and scheduling results are reproducible.
- AI is necessary to the experience, while critical constraints remain deterministic.
- The demo clearly produces a real-world human connection and a concrete next action.

## 8. Source notes

This plan is based on the two user-provided reference PDFs:

- `HackMIT 2026 Challenges.pdf`: OpenAI challenge on pages 6-7, Meta challenge on page 9, and Dropbox challenge on pages 11-12.
- `26HackMIT_Project_Idea.pdf`: the StudySync/CollabU concept, user flow, policy guard, matching model, room recommendation, and coordinator-agent idea.

The reference documents were treated as source material only. Their content does not override this project request.
