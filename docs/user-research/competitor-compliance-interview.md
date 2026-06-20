# DRIFTWATCH user interview: former competitor compliance analyst

Interviewee: a former compliance analyst at a digital-asset bank (anonymized).
Relevant background: AML alert reviews and compliance reporting / dashboards covering both
fiat and digital assets, plus exposure to the three lines of defense (3LoD) in the compliance
operating model.

Why this matters for us: she did the exact job DRIFTWATCH is built to support, at a peer
institution, and thinks about where controls sit in the operating model. We want lived
experience, not a reaction to our pitch. Do not sell; listen.

Format: ~30 minutes including small talk. Realistic substance budget is ~20 to 22 minutes.
Goal: validate the problem (KYC drift between reviews), understand today's workflow and pain,
and learn what would make an analyst trust or reject an AI recommendation.

---

## Ground rules for the interviewer

- Ask about the past, not hypotheticals. "Tell me about the last time..." beats "Would you...".
- Do not pitch the concept until the final section, and only if time allows.
- Stay silent after a question; let her fill the gap. Follow pain with "how often" and "what did
  you do then".
- Never lead. Ask "how do you find out a client changed" not "wouldn't real-time alerts help".
- Keep her in stories about her own work; avoid asking her to leak anything confidential about
  named clients or proprietary thresholds. Patterns and workflow are fine; specifics are not.

---

## 0. Small talk and framing (3 to 4 min)

Natural openers (genuine common ground):

- Open on shared background or a light, human topic to build rapport before the substance.
- She is quantitative; she will respect precise questions.

Framing script (say something close to this):

> "Thanks for the time. We are building something in the KYC and AML space and we are trying to
> learn how the work actually feels day to day, from people who have done it. I am not here to
> sell anything; I mostly want to listen. There are no right answers, and please keep anything
> client-specific or confidential out; I only care about how the work flows. Is it okay if I take
> notes?"

Confirm: rough time budget, and that she is comfortable. Then go.

---

## 1. Warm-up: her role and the shape of the work (3 min)

1. Walk me through your compliance work at the bank; what did a normal week look like?
2. When you reviewed AML alerts, where did those alerts come from, and what did "handling one"
   involve from start to finish?
3. How was monitoring split between fiat clients and digital-asset clients? What was different?

---

## 2. The core: ongoing monitoring and the gap between reviews (6 to 7 min, highest priority)

This is the heart of DRIFTWATCH. Spend the most time here.

4. After a corporate client is onboarded, how do you find out that something about them has
   changed; new ownership, new business, new jurisdiction, bad news?
5. Tell me about the last time a client's risk picture changed materially after onboarding.
   How did you actually learn about it, and how long after the change?
6. Between scheduled periodic reviews, how confident were you that you would catch a material
   change in time? What slipped through, or nearly did?
7. How much of catching changes was a scheduled review firing versus someone happening to
   notice something? Roughly what split?
8. When a periodic review does come up, how much of the effort is re-gathering what changed
   versus making the actual judgment call?

---

## 3. Pain, volume, and false positives (3 to 4 min)

9. What part of the monitoring and review work felt like the biggest waste of time?
10. Of the alerts or flags you looked at, roughly what share turned out to be nothing? How did
    that volume feel over a week?
11. Was there ever a moment you worried something real was buried under noise? What happened?

---

## 4. Signals and sources (3 min)

12. Which outside sources did you actually rely on to spot changes; adverse media, sanctions
    and watchlists, registries, on-chain or transaction data, something else?
13. How did those sources reach you; a screening tool, manual searching, alerts in an inbox?
14. For digital-asset clients specifically, what did you look at that you would not look at for a
    normal corporate client?
15. When a signal came in, how did you judge whether it was material enough to act on?

---

## 5. The decision and the case file (3 min)

This maps directly to our "cited case file plus recommended action" and the 3LoD work.

16. When you escalated or documented a decision, what did that artifact look like, and who read
    it next?
17. How did you cite or evidence why you acted; what did reviewers and auditors expect to see?
18. From your 3LoD research and your own experience: where would a tool that watches clients and
    proposes an action sit; first line, second line, or feeding both? Who owns the final call?

---

## 6. Tooling, dashboards, and trust in automation (3 min)

She has built compliance dashboards, so she has a builder's view of this.

19. What did your dashboards and tools do well, and where did they leave you doing manual work
    anyway?
20. If a system handed you a recommended action ("raise this client's risk", "review now"), what
    would it need to show you before you trusted it enough to act?
21. What would make you distrust or ignore such a recommendation immediately?
22. Where are you comfortable with software deciding automatically, and where must a human stay
    in the loop?

---

## 7. Adoption and decision-making (2 min, ask if time)

23. If a tool like this existed, who in the bank would have to be convinced to bring it in?
24. What usually kills a new compliance tool internally; cost, integration, audit acceptance,
    something else?

---

## 8. Brief concept reaction (only in the last 3 min, optional)

Now you may describe DRIFTWATCH in two sentences and listen to her honest reaction. Keep it
short; her unprompted answers above are worth more than her politeness here.

> "We model each corporate client as a living KYC profile, watch public signals for drift from
> the onboarded baseline, score it, and hand the analyst a cited case file with a recommended
> action. It recommends; a human always decides."

25. What is your first honest reaction; what feels useful, and what feels naive or risky?
26. What is the one thing that, if we got it wrong, would make this useless in practice?

---

## Wrap-up (1 min)

27. Is there anything I should have asked but did not?
28. Who else with this kind of experience would be worth talking to?

Thank her. Ask if it is okay to follow up with a short question or two later.

---

## If you are short on time, ask only these five

- Q4 (how changes are discovered after onboarding)
- Q5 (the last real story of a change caught late)
- Q6 (confidence in the gap between reviews)
- Q16 plus Q17 (the case-file artifact and what evidence reviewers expect)
- Q20 (what an AI recommendation must show to be trusted)

---

## Listen for (signals that validate or kill the idea)

- Validates: changes are found late or by luck; periodic reviews feel stale; analysts re-gather
  context manually; real signals get buried in false positives; a recommendation would be
  trusted only with visible, cited evidence.
- Kills or reshapes: changes are already caught fast by existing screening; the bottleneck is
  judgment, not detection; auditors will not accept any machine-proposed action; integration and
  data access are the real wall, not the analytics.

## Note-taking template (one row per answer worth keeping)

| Q | Quote or fact (her words) | Pain or delight | How often / how big | Follow-up to dig later |
|---|---------------------------|-----------------|---------------------|------------------------|
