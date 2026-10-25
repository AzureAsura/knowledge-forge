---
title: Blameless Postmortems: Learning from Incidents Without Pointing Fingers
author: sari_dewi
category: project-management
difficulty: intermediate
status: published
age: 38
featured: false
cover: unsplash:1559136555-9303baea8ebd
---

At 02:14 on a Tuesday, our API started returning 500s. Forty minutes later it was fixed: a migration had locked a hot table during a peak window. The next morning the channel filled with a familiar question: *"Who ran that migration?"*

That question is exactly what a **blameless postmortem** is designed to replace. If the answer to "what went wrong" is "a person made a mistake," you have not found a cause, you have found a scapegoat, and the next person will make the same mistake because the system that allowed it did not change.

This scroll describes how we run postmortems at Palm Studio: what they are, the principles, a template you can copy, and how to turn a document into improvements that actually ship.

![A bright open-plan office with people collaborating](unsplash:1559136555-9303baea8ebd)
*The goal is a safer system, not a guilty party.*

## What a postmortem is (and is not)

A postmortem (also called incident review) is a written, shared analysis of an incident: what happened, why, how it was resolved, and what we will change.

| Is | Is not |
|---|---|
| A learning tool | A performance review |
| A systems analysis | A hunt for the person responsible |
| Written and shared | A private conversation |
| Followed by tracked actions | A document that gets filed and forgotten |

When to write one: any user-visible outage, data loss or exposure, security incident, an on-call page that needed escalation, or a "near miss" that could have been bad. A good rule: **if you would want a colleague to learn from it, write it.**

## Why "blameless"

People make decisions with the information and tools available to them at the time. When someone makes a mistake, the useful questions are:

- Why did that action seem reasonable at the time?
- What made the mistake easy to make?
- What could have caught it earlier (tests, review, alerts, guardrails)?

If engineers fear punishment, they hide mistakes and delay reporting. The next incident then starts with less information and lasts longer. Blamelessness is not about excusing negligence; it is about getting honest data, which is the only input that produces real fixes.

> Humans are not the root cause. A system that allows a single human error to cause an outage is the root cause.

Language matters. Compare:

| Blaming | Blameless |
|---|---|
| "Dewi forgot to run the staging test." | "The staging test is optional and has no reminder; it was skipped." |
| "The engineer pushed bad config." | "The config change had no validation and was deployed directly to production." |
| "Ops didn't respond fast enough." | "The alert fired to a channel nobody was watching at night." |

![Tim berdiskusi di ruang kerja](unsplash:1522071820081-009f0129c71c)
*Tim berdiskusi di ruang kerja.*

## Principles

1. **Assume good intent.** Everyone involved tried to do the right thing.
2. **Focus on the system**: process, tooling, documentation, communication.
3. **Be specific and factual.** Timestamps, graphs, commands, not impressions.
4. **Share widely** so other teams learn too.
5. **Fix the system**: every postmortem ends with owned, dated action items.
6. **Keep it timely**: write within 3–5 working days while memory is fresh.

## The template

```markdown
# Postmortem: [short title]
Date: YYYY-MM-DD  |  Authors: …  |  Status: Draft / Reviewed / Closed
Severity: SEV1 / SEV2 / SEV3

## Summary
Two or three sentences: what happened, impact, duration, resolution.

## Impact
- Who/what was affected (users, requests, revenue, data)
- Duration: from … to …
- Metrics: error rate peak, number of affected users

## Timeline (all times in UTC+7)
| Time | Event |
| 02:14 | Alert "API 5xx > 5%" fires |
| 02:19 | On-call acknowledges |
| 02:31 | Cause identified: migration holding lock on `comments` |
| 02:54 | Migration cancelled; service recovers |

## Root cause(s) and contributing factors
What conditions allowed this to happen? (Use "Five Whys" to go deeper.)

## What went well
- Alerting caught it within 5 minutes
- Rollback runbook was accurate

## What went poorly
- No lock timeout on migrations
- Migration ran during peak hours

## Where we got lucky
- The lock affected only one table, not the whole DB

## Action items
| Action | Owner | Priority | Due | Ticket |
| Set `lock_timeout` on all migrations | Komang | P1 | 14 Mar | KF-212 |
| Add migration review checklist | Sari | P2 | 21 Mar | KF-213 |

## Lessons learned
…
```

The sections **"where we got lucky"** and **"what went well"** are underrated. Luck reveals hidden risk; "went well" makes sure we keep doing the useful things.

## Running the review meeting

Keep it 45–60 minutes:

1. **Facilitator** (not the on-call responder) restates the principles and the ground rule: no blame.
2. **Walk the timeline** together; fill gaps with the people who were there.
3. **Discuss contributing factors** with Five Whys, asking "how" and "what" rather than "who."
4. **Brainstorm improvements** across categories: prevent (stop it happening), detect (find it sooner), mitigate (reduce impact), and recover (fix it faster).
5. **Agree on action items** with owners and dates. Limit to what the team will really do.

## Root cause vs contributing factors

Rarely is there one root cause. In the migration incident:

- The migration took an `ACCESS EXCLUSIVE` lock (cause).
- There was no `lock_timeout`, so queries piled up behind it (contributing).
- It ran at 02:00 local time, which is peak time for a different timezone's users (contributing).
- Review focused on correctness, not on locking behavior (contributing).
- Alerts reached the right person quickly (mitigating).

Writing it as a *set* of factors prevents the "one person, one mistake" shortcut.

## Good action items

Weak: "Be more careful with migrations."
Strong: "Add a CI check that fails if a migration lacks `SET lock_timeout`; owner: Komang; due 14 Mar."

Characteristics of strong actions:

- **Specific and testable**
- **Owned by one person**
- **Dated**
- **Prioritized** (not everything is P1)
- **Systemic**: automation, guardrails, or better defaults beat reminders and training slides

A hierarchy that helps: eliminate the hazard > engineer a guardrail > improve detection > document and train. Pushing "remember to do X" onto people is the weakest control.

## Keep a library

Store postmortems in a searchable place (a wiki folder or repo). Once a quarter, review them together: which classes of failure repeat? Which action items were never completed? That meta-review often finds more value than any single incident.

## Common failure modes

| Failure mode | Fix |
|---|---|
| Postmortem turns into a blame session | Facilitator reasserts the ground rules; rewrite language |
| Action items never get done | Track in the normal backlog; review at start of next meeting |
| Only major outages get reviews | Include near misses; they are cheaper lessons |
| Writing takes weeks | Timebox; ship an 80% draft in 3 days |
| Management uses it to discipline | Leadership must model blamelessness |
| Same incident type repeats | Actions were too weak (training, reminders) |

## Closing

A good postmortem makes everyone slightly less afraid of the next incident. People know that if something breaks, the response will be curiosity, not punishment, and that curiosity is what makes the system a little safer every time.

References: Google SRE Book, *Postmortem Culture: Learning from Failure*; John Allspaw, *Blameless PostMortems and a Just Culture*; Atlassian Incident Management Handbook.

<!--comments-->
komang_adi: Thank you for including the migration example, Kak Sari. I was the one who ran it, and the way this document frames it made me feel like part of the fix instead of the cause.
sari_dewi: That is exactly the goal, Komang. And you wrote the lock_timeout check yourself, which is a better outcome than any blame could have been.
kevin_h: I will make the postmortem template part of our incident process and ask leadership to attend the next review. Culture starts from the top.
raka_m: The "where we got lucky" section is great. We had a similar CDN purge incident and the luck was that it happened on a weekend.
rizkymaul: Weak versus strong action items table is going on our wiki. I've written "be more careful" in too many documents.
hendrag: Question from a trainee: should junior engineers be allowed to attend and speak at postmortems?
sari_dewi: Absolutely, Hendra. Fresh eyes often ask the questions that expose hidden assumptions. Attend and speak.
