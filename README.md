# Gitcraft

Gitcraft is a GitHub-styled web client interface for Forgejo instances, built with Vite, React, TypeScript, and Tailwind CSS. It communicates directly with the Forgejo REST API (`/api/v1`) to deliver a developer experience modeled after GitHub's information architecture and interaction patterns.

## Features

- **GitHub-Fidelity Interface**: Follows GitHub's dark theme palette, typography, spacing, and component hierarchy.
- **Data-Driven Architecture**: Connects directly to Forgejo REST API endpoints without fabricated metrics or achievements.
- **Repository Browser**:
  - File tree exploration with directory navigation and breadcrumbs.
  - File blob viewer with line numbers, raw file viewing, clipboard copy, and download.
  - Markdown renderer for README files and documentation.
  - Commit history timeline grouped by date with short SHA copying and tree navigation.
  - Branch and tag selector with filter controls.
  - Repository clone popover supporting HTTPS and SSH URLs, plus ZIP archive download.
- **User Profile Dashboard**:
  - Profile overview with real Forgejo 52-week activity heatmap.
  - Pinned and public repositories listing.
  - GitHub-style query-based tab navigation (`?tab=repositories`, `?tab=projects`, `?tab=packages`, `?tab=stars`).
- **Flexible Authentication**:
  - Supports both Personal Access Tokens (PAT) and username/password Basic Authentication.
  - Dynamic shell state that adapts navigation controls and menus based on session status.
- **Production-Ready Deployment**:
  - Pre-configured single-page application (SPA) routing for Netlify via `_redirects` and `netlify.toml`.

## Tech Stack

- **Framework**: React 19, TypeScript
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS 4
- **Routing**: React Router 7
- **Server State**: TanStack Query (React Query) 5
- **Icons**: GitHub Octicons SVG & Lucide React
- **Markdown**: React Markdown

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm 9.0 or higher
- Git

### Installation

1. Clone the repository and initialize submodules:

```bash
git clone https://github.com/yohanesokta/Gitcraft.git
cd Gitcraft
git submodule update --init --recursive
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
```

Set `VITE_FORGEJO_URL` in `.env` to your Forgejo server address (default: `https://codeberg.org`).

### Development

Start the local development server:

```bash
npm run dev
```

### Production Build

Typecheck and generate the production bundle:

```bash
npm run typecheck
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

```text
.
├── .env.example
├── .gitmodules
├── netlify.toml
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── _redirects
│   └── default-avatar.jpg
├── vendor/
│   └── forgejo/
└── src/
    ├── components/
    │   ├── layout/
    │   ├── profile/
    │   ├── repository/
    │   └── ui/
    ├── hooks/
    ├── lib/
    │   └── forgejo.ts
    ├── pages/
    ├── types/
    ├── App.tsx
    ├── main.tsx
    └── index.css
```

## License

This project is licensed under the Apache-2.0 License. See the LICENSE file for details.
