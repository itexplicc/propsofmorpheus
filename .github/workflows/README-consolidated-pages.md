# Consolidated GitHub Pages deployment

GitHub Pages serves one artifact per repository. The public deployment workflow therefore publishes all approved public folders together. Do not add another workflow that uploads and deploys its own partial `_site` artifact, because it will replace every other public folder.

Use `.github/workflows/deploy-tin-tech-pages.yml` for public-site additions and keep its post-deployment URL checks current.
