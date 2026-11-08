# Community

Feed, post, post reactions, comments and polls are registered in `community.routes.ts`. Full client contract and moderation E2E are pending.

## Runtime evidence — 2026-09-03

PASS: admin created a real post with poll, reacted, added a comment and nested reply, voted, reloaded feed/comments, and queried PostgreSQL. Reload returned the post, one reaction, one top-level comment, and one reply; the database held two comments, one reaction, and one vote.

PARTIAL: edit/delete/moderation/pagination endpoints are not registered in the inspected community plugin, and the current community page only calls feed/create/react.

## Built-in browser evidence — 2026-09-03

PASS (render-only): a signed-in Super Admin browser session loaded `/community` and visibly rendered existing posts, poll choices and vote counts, reaction counts, and comment counts. Browser console diagnostics had no warning/error entries for this page.

NOT VERIFIED in this browser pass: post creation, reaction, comment, reply, and poll vote mutations were not re-run through the browser because those outward-facing content actions require a separate immediate confirmation. Their earlier API/database verification remains recorded above.
