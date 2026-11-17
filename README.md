# Portfolio

Static three.js portfolio. No build step.

## Run locally
    python3 -m http.server 8000
Open http://localhost:8000 (ES modules need a server, not file://).

## Deploy on GitHub Pages
1. Create a repo named `Kamal882.github.io` (or any name) and push these files to `main`.
2. Repo Settings > Pages > Source: "Deploy from a branch" > `main` / root.
3. Site goes live at https://kamal882.github.io/ (or /<repo-name>/).

## Edit
- Text and links: `index.html` (search for TODO)
- Colors: `style.css` (:root variables)
- 3D scene: `main.js`
