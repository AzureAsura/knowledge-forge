---
title: Usability Testing with Five People: A Practical Guide for Small Teams
author: salsa_nur
category: design-ui
difficulty: beginner
status: published
age: 20
featured: false
cover: unsplash:1531403009284-440f080d1e12
---

"We don't have time or budget for user research." I hear this in almost every kickoff, and it is almost always wrong, because the cheapest, fastest form of research is also one of the most useful: **a small usability test**. Five people, one hour each, one afternoon of analysis, and you will find most of the problems that make your product frustrating.

This scroll is the process I follow for our design sprints at Palm Studio. It is written for small teams with no research department: how to plan a test, recruit participants, write tasks, run a session, and turn observations into decisions.

![Sticky notes and wireframes on a wall during a design session](unsplash:1531403009284-440f080d1e12)
*Watching someone struggle with your design is humbling and the fastest way to improve it.*

## Why five?

Nielsen Norman Group's classic finding: testing with about **five users** uncovers the majority of usability problems in a given design, and additional users mostly re-discover the same issues. The model is roughly:

```
problems_found(n) = N × (1 − (1 − L)^n)    where L ≈ 0.31
```

With `L = 0.31`, five users find about 85% of problems. Two practical consequences:

1. **Test early and often with small groups** instead of once with a large group.
2. Run **multiple rounds** (test → fix → test again). Three rounds of five beats one round of fifteen.

The "five users" rule applies to **qualitative** tests on a single user group. If you have clearly different groups (e.g., readers vs. reviewers), test with a few from each. For quantitative claims ("73% complete checkout"), you need far more participants.

## Step 1: define what you are testing

Write down one to three **research questions** before anything else:

- Can new users find and publish their first scroll without help?
- Do reviewers understand what "Approve" does to the author's XP?
- Where do people hesitate on the checkout form?

Questions guide the tasks. A test with no questions produces a pile of anecdotes, not decisions.

Also decide **what you are testing**: a prototype (Figma), a staging build, or the live product. Prototypes are fine, but make sure the key paths are clickable.

![Palet warna dan swatch](unsplash:1561070791-2526d30994b5)
*Palet warna dan swatch.*

## Step 2: write realistic tasks

A task is a goal, not instructions. Give the scenario and let people find the way.

| Bad task | Good task |
|---|---|
| "Click the 'New Scroll' button and type a title." | "You learned something useful this week and want to share it with the team. Show me how you'd do that." |
| "Use the filter dropdown to select Unity." | "You want to find something about 2D game development. Go ahead." |
| "Find the settings page." | "You'd like to change your profile photo." |

Rules for tasks:

- Use the user's language, **not your interface's labels** ("share" not "publish scroll").
- Provide just enough context and any data they need (so they don't invent personal info).
- 5–7 tasks per 45–60 minute session. Order from easy to hard, and start with a simple warm-up task.
- Define **success criteria** for each (completed unaided / with hints / failed).

## Step 3: recruit

You need people who resemble real users. For internal tools, colleagues from other teams who have not seen the design are fine; for public products, use sign-up lists, community members, or a recruiting service.

- Screen with 3–5 questions (experience level, tools used).
- Mix experience levels (a novice and an expert reveal different issues).
- Offer a small thank-you (voucher, coffee, time off).
- Schedule 6–7 to account for no-shows.
- **Do not test friends who will be polite** and **do not test your own team members on their own work**.

## Step 4: prepare the session

Materials:

- A **script**: introduction, consent, warm-up questions, tasks, closing questions.
- Consent for recording (audio/screen) and a clear statement that you are testing the product, not them.
- A note-taker (ideally a second person) with a simple template: *task, observation, quote, severity.*
- The prototype/build in a **clean state** with test accounts.
- A quiet room or a video call with screen sharing.

Do a **pilot** with a colleague to find broken prototypes and confusing instructions before real sessions.

## Step 5: run the session

The facilitator's job is to **stay quiet and curious**.

Opening script (paraphrased):

> "Thanks for helping. We're testing the product, not you; there are no wrong answers. Please think out loud as you go. I may not answer questions right away because I want to see how it works without help. If you get stuck, that's useful information for us."

During tasks:

- Ask participants to **think aloud**: "What are you looking at? What do you expect to happen?"
- Do **not** lead ("Did you see the button on the right?"). Use neutral prompts: "What would you do next?" "What did you expect?"
- If someone is stuck for 2–3 minutes, offer a hint and note that as a hint-needed outcome. Don't let people suffer for 10 minutes.
- Watch behavior more than words. People often say "it's fine" while visibly struggling.
- Note **where they hesitate, backtrack, or mis-click**; these are usability issues even if they eventually succeed.

Closing questions:

- "What was the most confusing part?"
- "What did you like?"
- "If you could change one thing, what would it be?"
- Optionally, SUS (System Usability Scale), a 10-question standard survey that gives a score from 0–100 (average ≈ 68).

## Step 6: analyze quickly

Do this the same day, while memory is fresh.

1. **List observations**, one per sticky note: "P3 looked for Save in the top right for 20 s."
2. **Group** similar notes (affinity mapping).
3. **Rate severity**:

| Severity | Definition | Action |
|---|---|---|
| 4 – Blocker | Users cannot complete the task | Fix now |
| 3 – Major | Users complete with great difficulty or detour | Fix this sprint |
| 2 – Minor | Slows users or causes small errors | Backlog |
| 1 – Cosmetic | Noticed but no impact | Maybe |

4. **Count frequency**: how many of five hit the issue? Issues affecting 3+ of 5 are usually systemic.
5. Write the **top 5 findings**, each with: observation, evidence (quote/clip), recommendation.

Share a **one-page summary** with a 1–2 minute highlight reel. Video clips of real users struggling convince stakeholders better than any slide.

## Example findings from our own test

From a test of the scroll-submission flow with five colleagues:

| Finding | Evidence | Severity | Change |
|---|---|---|---|
| Users didn't realize that "Submit for Review" is separate from "Save Draft" | 4/5 saved and left, thinking it was sent | Blocker | Rename to "Send for review"; show status chip after saving |
| Image upload progress was invisible | 3/5 clicked twice | Major | Add progress state, disable button |
| Category dropdown showed parent groups no one understood | 2/5 hesitated | Minor | Only show leaf topics |
| Reviewers wanted to see author's previous scrolls | 2/2 reviewers asked | Minor | Add link to profile |

After the changes, the second round showed 5/5 completing the flow unaided.

## Common mistakes

1. **Leading the participant**: "Wasn't that easy?"
2. **Explaining the design** during the test; defending it destroys data.
3. **Testing too late**, when changes are expensive.
4. **Treating one opinion as a rule**: look for patterns, not outliers.
5. **Asking what users want** instead of watching what they do; people are bad at predicting their behavior.
6. **Not recording what you will change**; findings without owners die in a document.

## Remote and unmoderated options

- **Moderated remote** (video call + screen share): nearly as good as in-person, widens recruiting.
- **Unmoderated** (tools like Maze or UserTesting): faster and cheaper, good for specific click-path questions, weaker for "why".
- **Guerrilla testing**: five minutes with someone in the cafe; fine for quick sanity checks, no replacement for planned sessions.

## Checklist

- [ ] 1–3 research questions
- [ ] 5–7 scenario-based tasks with success criteria
- [ ] 5–6 participants, screened
- [ ] Script, consent, note template, pilot done
- [ ] Facilitator quiet, think-aloud on
- [ ] Same-day analysis with severity ratings
- [ ] Top findings → backlog items with owners
- [ ] Re-test after changes

## Closing thought

Usability testing is not about proving the design is good; it is about **finding out where it is not** while the cost of fixing it is still low. Five people and an afternoon is enough to change your product for the better, and the habit is worth more than any single test.

References: Nielsen Norman Group, *Why You Only Need to Test with 5 Users* and *Usability 101*; Steve Krug, *Rocket Surgery Made Easy*; Brooke, *SUS: A quick and dirty usability scale*.

<!--comments-->
maya_kusuma: Excellent, Salsa. The severity table and the note about not defending the design are exactly what the team needs. Let's run a round with the new Tree page next sprint.
salsa_nur: Thanks Maya! I'll prepare tasks for the Tree page this week. I'm recruiting from the finance team since they've never seen it.
putriayu: The example findings table is gold. We had the same confusion about Save vs Send in our prototype and didn't notice until someone left without sending.
citraang: I'm new and have never run a test. Is it okay if I take notes during your next session?
salsa_nur: Of course Citra! Note-taking is the best way to learn it. I'll share the template.
raka_m: From the dev side: please include us in at least one session. Seeing a user miss a button we built changed how I code UI.
kevin_h: Approved for the next sprint. Budget a half day per round. Great work, Salsa.
