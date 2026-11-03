# Posting caption

One founder task. Two ways to interact.

This short compares choosing and revising a demand experiment in Startup Tarot's browsing-first app and conversation-first chat prototype.

On the left: choose situation fields, inspect sources, and edit a plan directly.
On the right: answer a clarifying question, request evidence, and change a constraint to receive a revised suggestion.

Both leave the final decision with the founder: review the action, define what to look for, and save.

This is a design comparison, not a speed benchmark. The main app uses researched examples; Chat uses fictional records and scripted branches, with OpenUI rendering and no connected language model. The video is an edited sequence of actual screen captures, with silent captions.

Try both: https://wpatent.com/startup-tarot.htm#chat

Where would you prefer to browse—and where would a conversation help?

#OpenUI #InteractionDesign #BuildInPublic

## Video description / accessibility

A 30-second split-screen compares two Startup Tarot interfaces. The browsing-first app appears on the left in a cream theme; the conversation-first prototype appears on the right in its dark theme. Both begin with an idea-stage marketplace and a demand question. The app displays situation fields and a researched startup example, while chat asks whether potential customers are reachable. Evidence views follow. For reconsideration, the app's plan is manually edited to recruit people for conversations; chat receives “I cannot reach them yet” and proposes recruitment first. Both plans are explicitly saved. Closing text reads “Browse to explore. Converse to clarify. Keep the decision yours.”

## Files

- `exports/startup-tarot-comparison-social-4x5.mp4`: 1080 × 1350, 30 seconds, 30 fps, silent, burned-in captions; intended for social feeds.
- `exports/startup-tarot-comparison-landscape.mp4`: 1920 × 1080, same story and duration; suitable for wide players and presentations.
- `exports/poster.jpg`: social-format thumbnail.
- `exports/captions.vtt`: companion caption track.
- `exports/storyboard-preview.jpg`: six-scene review sheet.
- `captures/`: original screenshots captured from the public demos through browser controls.
- `render_video.py`: reproducible compositor using Pillow and imageio-ffmpeg. Run `python render_video.py` with these packages installed, or supply `--tools` with their directory.

## Editorial and verification notes

- Timeline: opening 0–3s; context 3–8s; evidence 8–13s; revision 13–20s; saving 20–25s; closing 25–30s.
- Crops and scaling emphasize relevant UI; screenshots are not generated or rewritten. Transitions are editorial crossfades, not recordings of model latency or click timing.
- The main app's recruitment plan is a manually entered example. The chat suggestion comes from its authored customer-access branch. No equivalent reasoning or data capability is implied.
- The source app uses a real researched snapshot; chat's investor and startup records are fictional. Both are labeled throughout.
- Both exports fully decoded without errors and contain 900 frames at 30 fps (30.0 seconds). Scene layouts were visually reviewed.
- Published video entry point: https://wpatent.com/startup-tarot.htm#comparison-video. No social-media post has been submitted.
