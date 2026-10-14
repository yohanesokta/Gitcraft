# AGENTS.md

This file provides guidance for coding agents when working with Gitcraft monorepo.

## Project Goal

Build a polished GitHub-like web interface powered by the Forgejo REST API, using Vite, React, and TypeScript. The product should feel familiar to GitHub users while remaining an independent client for Forgejo.

Prioritize visual fidelity, usability, accessibility, responsive behavior, real API integration, and maintainable code. Do not build a static mockup when real Forgejo data can be used.

## Product Principles

- Reproduce the broad layout, spacing, interaction patterns, and information hierarchy of GitHub as closely as practical.
- Use GitHub as a visual reference, not as a source of proprietary assets. Do not use GitHub trademarks or logos in a way that implies this project is official or affiliated with GitHub.
- Keep the UI data-driven. Avoid hardcoded sample data except for explicit development fixtures and loading skeletons.
- Every visible interactive control must work, or be clearly marked as unavailable/not implemented.
- Support dark and light themes, with dark mode polished first.
- Keep the application responsive across desktop, tablet, and mobile.
- Use Forgejo as the source of truth for repositories, users, branches, commits, issues, pull requests, releases, and other supported resources.

## Technology Stack

Use the existing project configuration when available. Otherwise prefer:

- Vite
- React
- TypeScript with strict type checking
- Tailwind CSS
- React Router for routing
- TanStack Query for server-state fetching, caching, retries, and invalidation
- Lucide React for icons
- A Markdown renderer with safe handling for repository README content
- Vitest and React Testing Library for tests where appropriate

Do not add dependencies without a clear benefit. Check the installed versions and existing conventions before changing configuration.

## Design Direction: GitHub-like

### Global shell

- Create a compact top navigation bar with a dark background in dark mode.
- Place the product mark/menu button at the left, followed by a contextual page title or repository breadcrumb when appropriate.
- Include a prominent search field, navigation links, and account/action controls on the right.
- Use thin borders, restrained shadows, compact spacing, and clear visual hierarchy.
- Avoid oversized marketing-style headings, excessive gradients, glassmorphism, and oversized rounded cards.
- Prefer small radii and mostly square-edged panels, consistent with a developer tool.
- Use a system sans-serif stack and a monospace font for code, hashes, terminal commands, and technical metadata.

### Color and surfaces

Use semantic design tokens rather than scattering literal colors throughout components. Suggested dark theme values:

- Page background: `#0d1117`
- Primary surface: `#161b22`
- Raised surface: `#21262d`
- Border: `#30363d`
- Primary text: `#e6edf3`
- Secondary text: `#9198a1`
- Link blue: `#4493f8`
- Success green: `#3fb950`
- Attention yellow: `#d29922`
- Danger red: `#f85149`
- Accent purple: `#a371f7`

Suggested light theme values:

- Page background: `#ffffff`
- Primary surface: `#f6f8fa`
- Raised surface: `#ffffff`
- Border: `#d1d9e0`
- Primary text: `#1f2328`
- Secondary text: `#59636e`
- Link blue: `#0969da`
- Success green: `#1a7f37`
- Attention yellow: `#9a6700`
- Danger red: `#d1242f`

Treat these as starting points. Verify contrast and apply tokens consistently.

### Layout and spacing

- Use a consistent spacing scale, preferably multiples of 4px.
- Use a centered or max-width content region where the reference layout calls for it.
- Repository pages should prioritize content over decoration.
- Use subtle separators and borders to divide sections.
- Use skeletons that preserve the final layout while loading.
- Avoid layout shifts when data arrives.
- Keep hover and focus states visible and consistent.

### Components

Build reusable components for:

- `AppShell`, `GlobalHeader`, `GlobalSearch`, `UserMenu`
- `RepositoryHeader`, `RepositoryTabs`, `RepositoryListItem`
- `ProfileHeader`, `ProfileSidebar`, `ContributionGraph`
- `BranchSelector`, `FileBreadcrumbs`, `FileTable`, `CommitRow`
- `MarkdownViewer`, `IssueRow`, `PullRequestRow`, `ReleaseCard`
- `Badge`, `Avatar`, `Tooltip`, `DropdownMenu`, `Dialog`
- `Skeleton`, `EmptyState`, `ErrorState`, `Pagination`

Do not duplicate layout and interaction logic across pages. Keep components small enough to understand, but avoid splitting every trivial element into its own file.

## Required Pages and Routes

Implement routes using stable, readable URLs. Adapt the exact route shape to the existing project if necessary.

- `/` — dashboard or explore page
- `/explore` — discover public repositories
- `/:owner` — user or organization profile
- `/:owner/:repo` — repository overview
- `/:owner/:repo/tree/:ref/*` — browse files at a branch, tag, or commit
- `/:owner/:repo/blob/:ref/*` — view a file
- `/:owner/:repo/commits/:ref` — commit history
- `/:owner/:repo/issues` — issues list
- `/:owner/:repo/issues/:index` — issue detail
- `/:owner/:repo/pulls` — pull request list
- `/:owner/:repo/pulls/:index` — pull request detail
- `/:owner/:repo/releases` — releases
- `/search` — search results

Handle unknown routes with a useful 404 page. Do not assume every Forgejo server supports every optional endpoint or feature.

## Repository Overview

Aim for the following information hierarchy:

1. Owner/repository breadcrumb and visibility badge.
2. Description, website, topics, and relevant metadata.
3. Watch, star, and fork actions when supported and authenticated.
4. Repository tabs such as Code, Issues, Pull requests, Actions (only if supported), Projects (only if supported), Wiki (only if enabled), Security (only if supported), Insights, and Settings (only when authorized).
5. Default branch selector and branch/tag controls.
6. Latest commit summary with abbreviated hash, author, and relative time.
7. File and directory listing with names, commit messages, and updated times where available.
8. README rendered below the file list.
9. Sidebar with language statistics, releases, packages, contributors, and other available metadata.

Only show tabs and actions that make sense for the current Forgejo instance and the user's permissions. Do not show fake counts or pretend an unsupported GitHub feature exists.

## User and Organization Profiles

- Show avatar, display name, username, bio, website, location, and organization details when present.
- Show repository tabs and repository lists.
- Include follower/following information only if supported by the API.
- Contribution graphs must use real data if available. If Forgejo does not expose the needed activity data, omit the graph or clearly label an alternative; never fabricate contribution squares.
- Handle users with no avatar, no bio, no repositories, or incomplete profile data.

## Forgejo API Integration

- Centralize API access in a typed client module. Do not call `fetch` directly from every component.
- Read the instance base URL from configuration, for example `VITE_FORGEJO_URL`.
- Normalize the base URL safely and avoid double slashes when constructing paths.
- Use Forgejo's `/api/v1` REST API. Verify endpoint availability against the target instance's API documentation or `/api/swagger` where enabled.
- Model only the response fields the UI actually uses, and tolerate nullable or missing fields.
- Add pagination support and respect API pagination parameters.
- Use TanStack Query or an equivalent consistent strategy for caching, loading, error states, retries, and invalidation.
- Handle `401`, `403`, `404`, `409`, `422`, `429`, and `5xx` responses deliberately.
- Provide useful error messages without exposing tokens, private repository content, or internal server details.
- Avoid unnecessary duplicate requests and refetches.
- Treat API data as untrusted input.
- Do not assume GitHub API endpoints, fields, or semantics are identical to Forgejo. Confirm differences before implementation.
- Support an instance configuration screen only if multi-instance support is an explicit product requirement.

### Authentication and secrets

- Never put personal access tokens, client secrets, session secrets, or other credentials in `VITE_*` environment variables. Vite exposes these values to browser bundles.
- Public read-only endpoints may be called directly from the browser if the target server's CORS configuration permits it.
- For private resources and authenticated mutations, prefer a secure backend/BFF or a properly implemented OAuth flow with secure session handling.
- Never store privileged tokens in local storage or commit them to source control.
- Do not log authorization headers, tokens, session cookies, or private API responses.
- Make authorization failures understandable and offer a login/re-authentication path where applicable.
- Enforce permissions on the server. Hiding a button in the frontend is not access control.

## File Browser and Code Viewer

- Show directories before files, with clear file/folder icons.
- Preserve path segments and encode route parameters safely.
- Provide breadcrumbs for nested directories.
- Support branch/tag selection and default-branch behavior.
- Display file size and metadata only when available.
- Render code with syntax highlighting where practical, line numbers, and a copy action.
- For large files, avoid blocking the UI; use a size limit or a clear fallback.
- Never execute repository files in the browser.
- Treat README and repository Markdown as untrusted. Sanitize rendered HTML and do not allow arbitrary scripts or unsafe embedded content.
- Provide a clear fallback for binary files, unsupported encodings, empty files, and missing paths.

## Search

- Build a global search interface with keyboard focus support and a clear search results page.
- Search repositories and users through endpoints supported by the target Forgejo version.
- Only offer code, issue, or pull-request search if the instance provides the necessary endpoints and permissions.
- Debounce interactive search inputs and cancel or ignore stale requests.
- Include loading, no-results, error, and pagination states.
- Do not present a decorative search field that does nothing.

## Interaction and Accessibility

- Use semantic HTML and accessible labels.
- All controls must work with keyboard navigation.
- Show visible focus indicators.
- Use correct dialog, menu, tab, and button semantics.
- Provide useful `aria-label` values for icon-only buttons.
- Do not use clickable `div` elements when a button or link is appropriate.
- Respect reduced-motion preferences.
- Use tooltips sparingly and never make essential information available only on hover.
- Ensure text and interactive elements meet WCAG AA contrast targets where practical.

## Responsive Behavior

- Desktop: full navigation, repository sidebar where appropriate, comfortable file listing width.
- Tablet: reduce side content and preserve the main task flow.
- Mobile: compact navigation, collapsible menus, horizontally scrollable tabs where needed, readable file rows, and no accidental horizontal page overflow.
- Test narrow screens as well as wide desktop layouts.

## Performance

- Lazy-load route-level pages where useful.
- Cache API responses and invalidate affected queries after mutations.
- Avoid loading the entire repository tree when only one directory is needed.
- Use pagination for large collections.
- Avoid unnecessary re-renders and oversized dependencies.
- Keep loading skeletons and error states visually consistent.

## Code Quality

- Keep TypeScript strict. Avoid `any`; use `unknown` and narrow types when necessary.
- Keep API types, UI components, hooks, and route pages separated.
- Use clear, consistent naming.
- Prefer small pure helper functions for formatting dates, counts, file sizes, and paths.
- Do not swallow errors silently.
- Do not introduce global state when local state or query cache is sufficient.
- Follow existing linting and formatting rules.
- Keep environment examples in `.env.example` and exclude real `.env` files from version control.

## Testing and Verification

For meaningful changes:

1. Run the project's type checker.
2. Run linting if configured.
3. Run relevant unit/component tests.
4. Run a production build.
5. Test loading, empty, error, unauthorized, and successful states.
6. Verify keyboard navigation and responsive layout for UI changes.
7. Verify behavior against the actual target Forgejo instance when credentials and network access are available.

Do not claim a command or test passed unless it was actually run and succeeded.

## Working Method for Coding Agents

Before changing code:

1. Inspect the repository structure, `package.json`, existing styling, routing, and environment configuration.
2. Identify the current implementation and preserve useful existing patterns.
3. Confirm the target Forgejo API version and endpoint behavior where possible.
4. Make focused, coherent changes rather than rewriting unrelated files.

While implementing:

- Build complete vertical slices, including API integration, loading/error states, and responsive UI.
- Use real API data when available; clearly separate fixtures from production data.
- Avoid leaving dead buttons, fake metrics, placeholder links, or unexplained TODOs.
- Do not overwrite user changes or remove existing functionality without a clear reason.
- If a requirement cannot be supported by Forgejo, explain the limitation and propose the closest honest alternative.

At completion:

- Summarize what changed.
- List important files changed.
- Report tests/build commands actually run and their outcomes.
- Note API capabilities that still need verification against the target instance.
- Identify any unfinished work clearly.

## Definition of Done

A feature is complete when:

- It matches the established GitHub-like visual system.
- It uses real Forgejo data where applicable.
- Loading, empty, error, and permission states are handled.
- Responsive behavior and accessibility have been considered.
- Type checks, tests, and production build pass when available.
- No secrets, fabricated data, or misleading UI are introduced.

