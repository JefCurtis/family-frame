# Files

- [Agent messages (live push)](agent-messages.md) - How AI agents post full-screen messages to the kitchen frame, delivered in about 0.1 s via a hibernating Cloudflare MessageRoom Durable Object and WebSocket, with dismissal, TTL expiry, fallback polling and Home Assistant read-aloud.
- [Recipes (Explore, Saved, Groceries)](recipes.md) - The Recipes tab browses TheMealDB categories and random picks, stores saved recipes in KV with copied images, and sends missing ingredients to the Todoist grocery list.
