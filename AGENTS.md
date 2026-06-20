# AGENTS.md

## Cursor Cloud specific instructions

Bristol Print is a single SvelteKit app (Svelte 5 runes, Tailwind v4, shadcn-svelte) that builds to a static site via `@sveltejs/adapter-static` and deploys to Cloudflare. There is no backend or database — workspace state is kept client-side in `localStorage`.

### Toolchain: Vite+ (`vp`)

- The npm scripts `dev`, `build`, `preview`, and `test` delegate to the global **Vite+** CLI (`vp`), not to local binaries. `vp` is installed at `~/.vite-plus` and put on `PATH` via `~/.vite-plus/env` (sourced from `~/.bashrc`/`~/.profile`).
- If `vp: command not found` in a fresh shell, run `source "$HOME/.vite-plus/env"` (or start a login shell) before using the npm scripts.
- `vp` uses Rolldown for `build` and bundled Vitest 4 for `test`; the project keeps plain `vite`/`vitest` in `devDependencies`, so no local `vite-plus` package is required.

### Commands (see `package.json` / `README.md`)

- `npm run dev` (`vp dev`) — dev server on http://localhost:5173/ with HMR.
- `npm run test` (`vp test --run`) — Vitest unit tests (node env, `src/**/*.{test,spec}.{js,ts}`).
- `npm run check` — `svelte-kit sync` + `svelte-check` (type check).
- `npm run build` (`vp build`) — static build into `build/`.
- `npm run lint` — `prettier --check . && eslint .`.

### Caveats

- `npm run lint` currently fails on pre-existing Prettier formatting issues in ~10 committed files (same failure as CI); it is a code-style issue, not an environment problem. Run `npm run format` to auto-fix if you intend to address it.
- No secrets are needed for local dev/test/build. Cloudflare deploy (`npm run deploy` / `wrangler`) needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, which are not required to run or test the app locally.
