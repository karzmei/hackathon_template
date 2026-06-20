# DRIFTWATCH user research: former compliance analyst (anonymized summary)

Findings from an interview with a former compliance analyst at a peer digital-asset bank. All
institution, vendor, and personal identifiers have been removed; this is a thematic summary of
what they told us, not a transcript. The original raw notes remain in git history.

## Who we spoke to

A former compliance analyst at a peer digital-asset bank that serves both fiat and crypto
clients. Their work covered AML alert review, compliance reporting and dashboards, and they have
direct exposure to the three lines of defense (3LoD) in the compliance operating model. They did
close to the exact job DRIFTWATCH is built to support, so the value here is lived experience, not
a reaction to our pitch.

## How monitoring works today

- Overnight background screening runs each client name against news, social media, and sanctions
  and watchlists; matches produce a score.
- The next morning, someone on the team triages those hits, deciding which are true positives;
  most are false positives.
- Transaction monitoring runs on simple rules: amounts that are too large, many small
  transactions in a short window, or money sent to or from a high-risk country. The platform can
  only do this kind of basic detection.
- A compliance officer then reviews each alert against the client's documented expected behavior.
- There are effectively three platforms: an internal pre-trade screening tool for crypto, a
  post-transaction monitoring platform covering both crypto and fiat (alerts fire T+1, the day
  after the transaction), and a screening system for incoming fiat that runs before money enters
  the bank. When people say "AML alert" they usually mean the post-transaction case.
- Handling a post-transaction alert: because the transaction has already happened, there is
  nothing to release; mostly it is a comment added on the platform. When something is unclear,
  compliance asks the relationship manager to get documents or rationale from the client.
  Comments also serve audit: another person should be able to understand later why a case was
  judged acceptable, leaving a trail for future review. This happens after the first review and
  feeds back into the client file and KYC documents.

## Fiat vs digital-asset monitoring

- For fiat, the key signal is jurisdiction risk: which country the money comes from or goes to.
- For crypto there is no jurisdiction, but there is the wallet address. Analysts sometimes go to
  blockchain trackers to trace the origin; you can tell if funds came from the darknet or through
  a mixer. A mixer obscures the trail (you cannot tell what happened to the funds inside), so
  crypto received from one is treated as likely money laundering and not accepted. Mixed fiat and
  crypto is hard to identify and considered risky.
- Source of wealth and source of funds is a core KYC input; if the origin turns out to be
  unacceptable, the bank may choose not to onboard the client.

## The gap between reviews (core finding)

- A client's risk rating officially changes only at periodic review: roughly once a year for
  high-risk clients, every two years for medium, every five for low.
- Ad-hoc reviews happen when alerts cluster and the team judges a client risky, but risk does not
  change off a single alert; it takes a thorough review by the relationship manager and
  compliance together.
- Onboarding flow: the relationship manager (front office) gives the client an initial rating;
  compliance approves some onboarding cases. Afterwards, transaction reviews and the overnight
  background screening surface changes. When compliance is unsure whether something is relevant,
  they contact the front office, who goes to the client.
- Between reviews, confidence in catching a material change was fairly high, but mainly because
  the system over-alerts; it surfaces more information than needed rather than being smart.
- Catching changes is driven by the news/screening system, not by someone happening to notice;
  the "noticed by luck" path essentially never happened.
- Some larger banks insert a dedicated unit between the front office and compliance, effectively
  a "1.5 line" of defense, that runs these alert reviews and KYC checks. Smaller banks do not
  have it.
- The effort of a periodic review scales with client activity: a dormant account has little to
  review, while an active one means checking the KYC file and then comparing it against actual
  transactions to see whether behavior still matches.

## Pain and false positives

- The biggest time sink is post-transaction monitoring: many false-positive alerts, each costing
  the compliance officer time to check documents and clarify with the front office.
- Estimated false-positive rate at the time was around 80%, though platforms are reportedly
  getting smarter as they learn from transaction data across multiple banks.
- Name screening is a major source of noise: one person can match many spelling variants, which
  inflates false positives. Richer source detail on a hit would help judge true versus false
  matches.
- Screening scores were not really trusted: the tool returns a confidence score, but the score is
  not reliable. Officers go through every alert by hand and add a comment regardless of the
  score, because their job is to judge the alert, not to trust the machine.

## The decision and the case file

- Escalation is layered. For onboarding, the front office checks the client first; if something
  is unclear or the client looks risky or politically exposed, the case goes to compliance; if
  compliance cannot conclude, it goes to a management committee that meets every week or two to
  discuss specific high-risk cases and decide whether to onboard. Senior management, including the
  CEO, takes part.
- For transactions, cases almost always reach compliance. The front office reviews the alert
  first and leaves a comment; if the case looks fine they go straight to the client, otherwise
  compliance weighs the front office's rationale, the transaction itself, and the client profile,
  and makes the call.
- Auditors and reviewers want to see the economic rationale behind a transaction: whether it
  aligns with expected client behavior and with the client's historical transactions.
- On where a watch-and-recommend tool would sit in the 3LoD: it could help both the first and
  second lines, and in banks with the middle "1.5 line" unit it would fit there.

## Trust in automation and reaction to the concept

- AI is welcome for a first-pass relevance filter: deciding whether an alert is relevant at all.
  Many news hits are "true but not meaningful"; for example, a report that a company's owner
  changed is technically a valid hit but often not material. Those need human judgment.
- A recommendation to raise a client's risk should trigger a proper ad-hoc or periodic review
  first, not an automatic change. What would build trust is fewer false positives and being
  demonstrably reliable.
- The most important source of change is the news; analysts also copy client identifiers and
  details from the client's submitted internal documents. Revenue is not the most important
  signal: a business-model change matters far more (for example, a company moving into a risky
  area such as diamonds or gambling can be unacceptable and lead to offboarding), whereas a
  revenue increase is relevant only insofar as it relates to transaction amounts, and is not a
  primary risk signal. Full re-KYC is rare; requesting individual documents happens often. As an
  example, if a client's name matches an item such as a debt-collection record, the bank will ask
  the client for information to confirm whether it is really them.
- Concept reaction: generally useful, with more visualization and richer information than the
  internal tool they used before (which they had already complained about). The summary and the
  communication features stood out as useful. Compliance communication today is mostly email
  (kept for traceability) and team chat; the post-transaction platform also has a built-in
  communication function.
- A critical constraint: change must not be easy. A risk change cannot just happen on a single
  platform; it must be officially documented in the core banking system, the golden source of
  truth. After first- or second-line approval, someone raises a ticket to the operations team,
  operations makes the change, and another person verifies it. It is a real process, not a
  one-click change. The first-line owner is usually the relationship or account manager, with
  managers backing each other up.
- Likely adoption blockers: data governance, privacy, security, and cost.

## What validates the idea vs what would kill it

- Validates: changes are surfaced late or only because the system over-alerts; periodic reviews
  feel stale; analysts re-gather context manually; real signals get buried in false positives; a
  recommendation would be trusted only with visible, cited evidence.
- Kills or reshapes: changes are already caught fast by existing screening; the bottleneck is
  judgment, not detection; auditors will not accept a machine-proposed action that bypasses the
  documented core-banking change process; integration and data access, not the analytics, are the
  real wall.
