# Reel animations (Remotion)

2D animated Instagram reels (1080×1920, 30fps), built entirely in code.

## `PeopleToAvoid` – narrated explainer (main)
"از این ۵ نوع آدم فاصله بگیر" — a Persian narrated explainer: each point gets its own
animated scene (characters, props, "keep distance" motion), karaoke subtitles and a progress bar.

Pipeline:
1. Edit the text in `scripts/script.json`.
2. Voiceover (offline Persian TTS via sherpa-onnx + Piper voice `vits-piper-fa_IR-amir-medium`
   from the k2-fsa/sherpa-onnx GitHub `tts-models` release):
   `python3 scripts/make-voiceover.py <voice-model-dir> <out-dir>` → `voice.wav` + `src/timeline.json`,
   then `ffmpeg -i <out-dir>/voice.wav -af loudnorm=I=-16 public/voice.mp3`.
   To use your own recorded voice instead, replace `public/voice.mp3` and adjust the
   `start`/`end` times in `src/timeline.json`.
3. Background music: `python3 scripts/make-music-bed.py bed.wav 34` → `public/music.mp3`.
4. `npm install`, preview with `npm run studio`, render with `npm run render`.

## `PeopleToAvoidDark` – dark cinematic version
Same voiceover/timeline, dark look: neon line icons drawn on screen, light rays, dust, film grain,
vignette, flash transitions and a cinematic music bed with impacts on every scene
(`python3 scripts/make-cinematic-bed.py bed.wav` → `public/music-dark.mp3`).
Render with `npm run render:dark`. Film grain makes the raw render large; re-encode for Instagram:
`ffmpeg -i out/people-to-avoid-dark.mp4 -c:v libx264 -b:v 5M -maxrate 7M -bufsize 10M -c:a aac -movflags +faststart out/ig.mp4`

## `ReelAnimation` – beat visualiser
Music-reactive animation for `public/audio.mp3` (`npm run render:beat`).

Font: Vazirmatn (SIL OFL, see `public/fonts/Vazirmatn-OFL.txt`).
