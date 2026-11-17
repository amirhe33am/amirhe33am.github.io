# Reel Animation (Remotion)

2D animation built entirely in code, synced to a sound file.

1. Put the audio at `public/audio.mp3` (the video length follows the audio length).
2. `npm install`
3. Preview: `npm run studio`
4. Render: `npm run render` → `out/reel.mp4` (1080×1920, 30fps)

The included `public/audio.mp3` is a 30 s sample track synthesised by
`scripts/make-sample-music.py` (`python3 scripts/make-sample-music.py out.wav`).
Replace it with any other sound to re-sync the animation.
