AMINA interview: what matters for our build
TL;DR: AMINA is a FINMA-licensed crypto bank (started ~2019, small book then, now scaling hard). Compliance is a cost center doing the legal minimum: one periodic review per client per year, by the book. They can't grow the book without compliance cost exploding. Our job is to surface "something changed" signals continuously so they catch risk earlier and smooth the workload, without adding headcount.
The users (a pyramid; design for the top of it)

Relationship Manager (RM) — the main interface to the client and the first line of defense. Many of them. Kicks off reviews, handles the simple ones, flags anything negative to compliance. Our dashboard's primary user. They want to see news + key facts about their clients.
Account Manager — fewer; services complex clients, looks at the whole account from a business angle, watches for customers gaming loopholes.
Compliance — one small department, many clients. The gatekeeper: signs off, escalates, ensures no regulatory trouble. Cares almost entirely about negative facts / changes in a negative direction. Secondary user, but the one who must trust the output.

A business committee vets ideas before systems get built (does it save/earn enough, is there market). Build something with an obvious business case.
Where the pain actually is

Reading adverse media is the #1 time sink. Common-name problem (search a name, get millions of hits, needle in haystack). They've already tried agentic adverse-media crunching and liked it (a month of human work, done in minutes).
The gap that's NOT solved yet: continuous, agentic KYC monitoring over public sources between reviews. That's our wedge.
They don't proactively monitor between yearly reviews today, so when something blows up they're stuck saying "we reviewed 5 months ago and it was clean." For high-profile risk they badly want to know months earlier.

Value props that actually land (in their words)

Scale the book without scaling headcount. Manual cost grows with clients; there's a boundary where it explodes. This is the real driver.
Smooth the workload, don't just reduce it. Periodic reviews cause crunch and overtime spikes. Continuous early signals let them distribute work in advance. This is the non-obvious selling point and it's the one nobody is "against."
Earlier detection of reputational/high-profile risk to avoid the FINMA "everyone could have known and you didn't" call.
Automated adverse-media triage (their biggest grind).

What compliance / FINMA needs (hard requirements)

The system suggests, never decides. It's an initial filter; bias toward avoiding false negatives.
Audit trail: if they miss an action, they must show "this was the day we got the fact." Timestamped, traceable.
They do NOT care about confidence scores. They want concrete facts and a concrete action (e.g. add to watchlist). Lead with the action, not a 0.86 confidence pill.
For announcements/news: classify positive vs negative impact.

Technical constraints (read before architecting)

Azure Switzerland is confirmed fine — they already use it, good Microsoft relationship. Data must be deployed and provable in Switzerland (residency). Cloud is acceptable; core banking stays on-prem on a Swiss provider. Most sensitive data = customer identity + source of wealth.
Models: newer GPT models are available in the CH Azure region; Claude/Anthropic only in the Sweden region (needs a direct MS license). Default to Azure OpenAI in Switzerland.
Token limits are real and tight. Azure/Foundry rate limits (~5M tokens/min) count input + output, and multi-agent chatter + caching tokens burn through budget fast (they've blown past 2M just from agents talking to each other). → Our cheap-filter-first cascade is exactly right; avoid chatty multi-agent loops; track tokens per alert.
MS AI Foundry is new and rough (network comms between models/data sources, VPN issues). Self-hosting is cost-prohibitive (~10k/month GPU rental). Stay lean and managed.

Product / UX guidance

Batch, not real-time. Once or twice a day is plenty; a ~7am morning digest so people walk in with things to discuss.
Dashboard = signal-surfacing layer that fuses internal data + public signals, shown to the RM (news + key facts), with the negative-change view for compliance.
Self-explanatory visuals. When shown a plot they ask "what are the axes?" Growth guy loves visuals; the bank users must actually understand it. Make charts legible without explanation.
Judges lean toward sophisticated over simple (they liked a Korea example), but the bank users need to follow it. Aim for impressive-but-legible.

Demo scenarios they explicitly liked

Geopolitics, China/HK: gov't or political-party changes, a company located in HK, CN government souring on a company can kill it; a whole book gets hard to run. Strong.
UAE (lots of money, people relocating there) and HK private wealth as comparison.
Ownership/structure red flags: does the person own other companies? Defense exposure? Money-laundering funneling? (US is not a primary market for them.)
Regulatory changes affecting crypto → informs whether AMINA enters a country (opportunity side), but stay within trade exchanges / crypto businesses, don't invent new territory.
Watchlists / speculation, and the obvious trigger: the customer changes.
Use B2B crypto companies, ideally publicly listed exchanges (more public data). They name people running funds through Robinhood/Binance; AMINA works with crypto exchanges.

Watch-outs

Don't over-index on confidence scores or fancy ML; show concrete actions.
Don't propose real-time streaming; they want a morning batch.
Don't pitch the system as a decision-maker; it advises.
Keep it inside their architecture (Teams/Microsoft, Azure CH); integration is fine if it doesn't force new infra.
