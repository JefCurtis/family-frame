# Security

Please report security problems privately through GitHub: **Security → Report a vulnerability**
on this repository. Don't open a public issue for them.

Worth knowing when you deploy this yourself:

- The Worker's API is protected by `DASHBOARD_KEY`; agents use a separate `AGENT_TOKEN` that can
  only post messages and save recipes. Use long random values and keep them in Wrangler secrets.
- Calendar links, Todoist tokens and iCloud album links are effectively passwords. They belong in
  `wrangler secret`, never in the repository.
- A rooted frame can read anything stored on it, including the Home Assistant token the Music tab
  uses. Give the frame a non-admin Home Assistant user.
