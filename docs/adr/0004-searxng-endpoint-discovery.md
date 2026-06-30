# Interactive SearXNG endpoint discovery

The bootstrap installer discovers public SearXNG candidates from `searx.space`, ranks them by health signals, and verifies the JSON search API before presenting them to the user. It does not silently choose a public endpoint unless explicitly requested, because using a remote SearXNG service changes the user's privacy and reliability profile; local or custom endpoints remain first-class choices.
