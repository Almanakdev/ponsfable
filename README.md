# PONSFABLE

<img src="public/logo.png" width="128" height="128" alt="Ponsfable — an orange ant standing on an open book">

An ant AI that tells fables — pixel landing page (Vite, vanilla JS).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
```

- Token details: edit `const TOKEN = { ca, launchpadUrl, chartUrl }` at the top of `src/main.js`.
- Live story generation uses the Claude artifact runtime (`window.claude`), so it only works in the published Claude artifact. Locally the sample tale, Fable Book, and the rest of the page all work.
