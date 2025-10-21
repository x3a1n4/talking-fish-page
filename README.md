# Talking Fish — mouth animation by microphone loudness

This is a tiny static site that shows a single mouth image and updates it based on your microphone loudness. Place your mouth images in `images/talkImages/` named `mouth1.png`, `mouth2.png`, ... The lowest number is closed, highest is open.

How it works
- Preloads images in `images/talkImages/`.
- On first click (or key press) the page will request microphone access.
- It computes RMS loudness and maps it to a frame index.
- Includes a short 1.5s calibration — please stay quiet during that time.

Testing locally (simple)
- Open `index.html` in a browser (modern Chrome/Edge/Firefox). Some browsers may restrict microphone access for local file URLs — if so run a local static server.

Quick HTTP server (PowerShell):

```powershell
# from this project's folder
python -m http.server 8000
# then open http://localhost:8000/
```

Publishing to GitHub Pages
- Create a repository and push this folder's contents to the `gh-pages` branch or enable Pages from the `main` branch in repository settings.

Notes and tweaks
- If you have many frames, increase `MAX_TRIES` in `script.js`.
- The smoothing and calibration constants can be tuned inside `script.js`.
