---
type: "Reference"
title: "Recipes (Explore, Saved, groceries)"
openwiki_generated: true
verified:
  - by: openwiki/0.7.2
    at: 2026-10-13T05:27:36.156Z
sources:
  - id: openwiki-source-e12fdae11ea7713285efd699
    resource: repo://dashboard/src/lib/format.js
  - id: openwiki-source-3a4039a222339b2ae26827c1
    resource: repo://dashboard/src/lib/state.svelte.js
  - id: openwiki-source-e23f10edc2b18bc6bf441d7b
    resource: repo://dashboard/src/views/RecipePage.svelte
  - id: openwiki-source-b71f48d25054178a3449df1f
    resource: repo://dashboard/src/views/Recipes.svelte
  - id: openwiki-source-47e567cb98956edcb53bcbd3
    resource: repo://dashboard/worker/api.test.js
  - id: openwiki-source-93f607093c26733ac1476b93
    resource: repo://dashboard/worker/images.js
  - id: openwiki-source-761c8b9c5f5e1234a74d94a4
    resource: repo://dashboard/worker/index.js
  - id: openwiki-source-3d87a5bdd7a2737ed75505a1
    resource: repo://dashboard/worker/recipes.js
generated: { by: "claude-code", at: "2026-10-13T05:27:36.156Z" }
---


# Recipes (Explore, Saved, groceries)

The Recipes tab has two panes:

- **Explore** browses [TheMealDB](https://www.themealdb.com) by category, plus "Surprise me" for a
  random recipe.
- **Saved** lists recipes stored by this project: sent by AI agents (with `AGENT_TOKEN`) or saved
  from Explore with the Save button.

On a recipe page the family taps ingredients they already have; "Add N to Groceries" puts the rest
on the Todoist grocery list.

## Server (`dashboard/worker/recipes.js`)

Routes are wired in `worker/index.js` (see [routing and auth](../worker/routing-auth-and-caching.md)):

| Route | Who | What |
| --- | --- | --- |
| `GET /api/recipes/explore?c=<category>` | frame | cards for a category |
| `GET /api/recipes/explore?id=mdb:<id>` | frame | one full recipe |
| `GET /api/recipes/explore?random=1` | frame | a random full recipe |
| `GET /api/recipes` | frame | saved recipes (full) |
| `POST /api/recipes` | frame key or `AGENT_TOKEN` | save one |
| `DELETE /api/recipes/:id` | frame | remove one and its photo |
| `GET /api/recipes/:id/image` | frame (`?key=`) | a saved recipe's photo |

### Explore

`fromMealDB` turns TheMealDB's flat `strIngredient1..20` / `strMeasure1..20` fields into
`{name, measure}` ingredients and splits instructions into steps (dropping "STEP 1." style
prefixes). Recipe ids are prefixed `mdb:`. Photos are referenced at TheMealDB's sized variants:
`/medium` (350 px) for grid cards and `/large` (500 px) for the recipe page, which match the
frame's 1.5× screen (the 150 px `/preview` looked blurry). Photos load straight from TheMealDB,
whose certificate chain the frame trusts, so they cost no Worker requests.

Upstream fetches use `cf.cacheTtl` of a day, and the Worker answers category and id lookups with
`Cache-Control: private, max-age=86400`, so the frame's own HTTP cache absorbs repeat visits.
Random picks are `no-store`.

`HIDDEN` (Vegetarian, Vegan) is the household's exclusion list: those categories return no cards,
and `random` re-rolls up to six times past a hidden category.

### Saved

Saved recipes are one KV value (`recipes`, newest first, max 300). `cleanRecipe` normalises input
from agents: title ≤120, up to 60 ingredients (strings or `{name, measure}`), up to 60 steps, and
optional servings, time, http(s) source, from, tags (≤8), category and `ref`. A title and at least
one ingredient or step are required. Saving a recipe whose `ref` (e.g. `mdb:52772` from Explore)
is already saved returns the existing id instead of duplicating it.

The photo is copied at save time (best effort): an https JPEG/PNG/WebP up to 3 MB is fetched,
resized once to 640 px wide with the Images binding (`worker/images.js`, shared with
[photos](../feeds/photos-and-slideshow.md)), and stored as `recipe-image:<id>` with its content type
in KV metadata; the entry gets `hasImage: true`. Storing the photo means it keeps working if the
source site changes and the frame never fetches arbitrary sites. The image route serves it
`private, max-age=604800, immutable`. Deleting removes both the entry and the image.

## Frame

### Tab structure (`src/views/Recipes.svelte`)

- `CATS` is a fixed, deliberately ordered category list (weeknight proteins first, dessert last;
  Goat left out, Miscellaneous labelled "Other"), so no category request is needed.
- Each pane (Explore, Saved) is created the first time it's shown and then kept, stacked and
  toggled with `visibility: hidden`. Switching between them doesn't rebuild cards, re-decode
  photos or lose scroll position.
- Opening a recipe renders `RecipePage` as an overlay above the hidden grid, so Back restores the
  exact scroll position. The page opens instantly with the card's title and already-loaded photo
  (`loading: true`) and fills in ingredients and steps when the full recipe arrives.
- Category card lists are memoised per session and the last category is kept in localStorage
  (`frame-recipes-cards`), so the grid draws immediately when the tab opens.
- The grid is five square cards per row; photos fill each card with the title on a dark fade,
  lazy-load, decode asynchronously and fade in; cards use `content-visibility: auto`.

### Recipe page (`src/views/RecipePage.svelte`)

Three columns: photo and meta, the ingredient checklist ("Tap what you already have"), and
numbered steps. A recipe from Explore shows Save (or "Saved" when a saved copy with that `ref`
exists); a saved recipe (it has `savedAt`) shows Remove. Displayed titles go through
`recipeTitle()` (`src/lib/format.js`), which removes parenthesised asides:
"Algerian Kefta (Meatballs)" → "Algerian Kefta".

### Adding to groceries

`addToGroceries()` in `src/lib/state.svelte.js` turns each still-needed ingredient into a Todoist
task "name (measure)" with the description `For: <recipe title>`, and sends them in one bulk
`POST /api/lists/groceries {items:[…]}` (the Worker adds up to 40 in parallel; see
[Todoist lists](../feeds/todoist-lists.md)). The returned ids are appended to the local grocery list
with the description as a `note`, which the Groceries tab shows in small grey text. In demo mode
nothing reaches Todoist.

## Agent skill

`~/.agents/skills/kitchen-frame-recipe` (outside this repo) extracts schema.org Recipe JSON-LD from
a link (or structures pasted text), previews, and posts with `$KITCHEN_FRAME_URL` /
`$KITCHEN_FRAME_TOKEN`. `docs/recipes.md` documents the fields and responses.

## Tests

`worker/api.test.js` covers TheMealDB normalisation and sized thumbnails, saving via agent and
frame tokens, image storage, `ref` de-duplication, the bulk grocery add with descriptions, and the
hidden-category rules for Explore and random. See [tests](../testing/tests-and-verification.md).
