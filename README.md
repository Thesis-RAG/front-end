# Welcome to our KnowledgeHub

## Use your preferred IDE

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Install the necessary dependencies.
npm i

# Step 3: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Production build and AWS Amplify deployment

Build the front-end locally with the production API URL:

```powershell
$env:VITE_API_BASE_URL="https://rolesawarerag.duckdns.org"
npm ci
npm run build
```

The generated static files are written to `dist/`. AWS Amplify uses the
`amplify.yml` file in this repository to run `npm ci`, run `npm run build`,
and publish `dist/`.

In Amplify, add this environment variable before deploying:

```text
VITE_API_BASE_URL=https://rolesawarerag.duckdns.org
```

For React Router refreshes, add this rewrite in Amplify under
**Rewrites and redirects**:

```json
[
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
    "status": "200",
    "target": "/index.html",
    "condition": null
  }
]
```

Do not commit `.env` or real API keys. Front-end variables with the `VITE_`
prefix are included in the browser bundle and are publicly visible.
