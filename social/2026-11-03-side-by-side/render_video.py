"""Render a captioned comparison from actual browser captures. No generated UI."""
import argparse
from pathlib import Path
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--tools', help='Optional directory containing Pillow and imageio_ffmpeg')
args = parser.parse_args()
if args.tools:
    sys.path.insert(0, args.tools)
from PIL import Image, ImageDraw, ImageFont, ImageOps
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'exports'
OUT.mkdir(exist_ok=True)
FONT = Path('C:/Windows/Fonts')
BG = '#f4f5ef'
INK = '#183b30'
GREEN = '#24614c'
MUTED = '#58675e'

def font(size, bold=False):
    return ImageFont.truetype(str(FONT / ('arialbd.ttf' if bold else 'arial.ttf')), size)

def lines(draw, text, x, y, width, size, color=INK, bold=False, spacing=1.22):
    f = font(size, bold)
    yy = y
    for paragraph in text.split('\n'):
        line = ''
        for word in paragraph.split():
            candidate = (line + ' ' + word).strip()
            if draw.textlength(candidate, font=f) > width and line:
                draw.text((x, yy), line, font=f, fill=color)
                yy += int(size * spacing)
                line = word
            else:
                line = candidate
        draw.text((x, yy), line, font=f, fill=color)
        yy += int(size * spacing)
    return yy

# Bounds refer to observed screenshot pixels, and only remove surrounding whitespace/chrome.
CROPS = {
    'pwa-01-context': (375, 65, 905, 570),
    'pwa-02-proposal': (375, 65, 905, 485),
    'pwa-03-evidence': (350, 35, 930, 685),
    'pwa-04-revise': (375, 65, 905, 535),
    'pwa-05-saved': (375, 65, 905, 675),
    'chat-01-context': (95, 225, 595, 570),
    'chat-02-proposal': (95, 140, 595, 750),
    'chat-03-evidence': (95, 95, 595, 750),
    'chat-04-revise': (95, 110, 595, 750),
    'chat-05-saved': (95, 120, 595, 750),
}
SCENES = [
    (3, 'One founder task. Two ways to interact.', 'Choose and revise a small demand experiment.', '02-proposal', 'Open a next-move card', 'Receive a contextual proposal', 'A design comparison. Different data and capabilities.'),
    (5, '01 / Set the context', 'Start with a marketplace at the idea stage.', '01-context', 'Choose situation fields', 'Answer a clarifying question', 'Forms organize inputs. A conversation asks what matters next.'),
    (5, '02 / Inspect the support', 'Open the evidence before deciding what to try.', '03-evidence', 'Open sources and limitations', 'Request evidence in the thread', 'The main app uses researched examples. Chat uses fictional records.'),
    (7, '03 / Reconsider the next step', 'What if potential customers are hard to reach?', '04-revise', 'Edit the planned action directly', 'Change the answer; get a revised idea', 'Both routes can lead to recruitment first. The interaction is different.'),
    (5, '04 / Make the decision yours', 'Review the action and evidence criterion, then save.', '05-saved', 'Save the plan and track learning', 'Save the working plan in the thread', 'The founder reviews and saves. A suggestion is not a commitment.'),
    (5, 'Browse to explore. Converse to clarify.', 'Keep the decision yours.', '05-saved', 'Persistent screens and navigation', 'Questions, proposals and revisions', 'Try both: wpatent.com/startup-tarot.htm'),
]

def make_scene(index, portrait=False):
    duration, title, sub, shot, left, right, takeaway = SCENES[index]
    W, H = (1080, 1350) if portrait else (1920, 1080)
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    pad = 42 if portrait else 64
    gap = 24 if portrait else 40
    pw = (W - 2 * pad - gap) // 2
    lines(d, 'STARTUP TAROT  /  INTERACTION DESIGN', pad, 25, W-pad*2, 20 if portrait else 24, GREEN, True)
    y = lines(d, title, pad, 70, W-pad*2, 43 if portrait else 52, INK, True)
    y = lines(d, sub, pad, y+12, W-pad*2, 27 if portrait else 27, MUTED)
    panel_top = 250 if portrait else 210
    panel_bottom = 1100 if portrait else 900
    for i, (name, caption, prefix, meta) in enumerate([
        ('BROWSING-FIRST', left, 'pwa', 'Main app · Researched examples'),
        ('CONVERSATION-FIRST', right, 'chat', 'Chat · Scripted, fictional records'),
    ]):
        x = pad + i * (pw + gap)
        d.rounded_rectangle((x, panel_top, x+pw, panel_bottom), radius=20, fill='#ffffff', outline='#d4dfd5', width=2)
        lines(d, name, x+20, panel_top+20, pw-40, 24 if portrait else 29, GREEN, True)
        lines(d, meta, x+20, panel_top+57, pw-40, 17 if portrait else 21, MUTED)
        sy = panel_top + (115 if portrait else 110)
        sh = panel_bottom - sy - (120 if portrait else 75)
        key = prefix + '-' + shot
        raw = Image.open(ROOT/'captures'/(key+'.png')).convert('RGB')
        crop = raw.crop(CROPS[key])
        fitted = ImageOps.contain(crop, (pw-32, sh), Image.Resampling.LANCZOS)
        im.paste(fitted, (x+(pw-fitted.width)//2, sy+(sh-fitted.height)//2))
        lines(d, caption, x+20, panel_bottom-(105 if portrait else 60), pw-40, 25 if portrait else 27, INK, True)
    lines(d, takeaway, pad, panel_bottom+25, W-pad*2, 28 if portrait else 30, INK, True)
    lines(d, 'Chat: OpenUI rendering · No connected language model', pad, H-90, W-pad*2, 20 if portrait else 22, MUTED)
    lines(d, 'Edited screen captures · Silent captions · Not a speed benchmark', pad, H-58, W-pad*2, 18 if portrait else 20, MUTED)
    return im

def render(portrait=False):
    label = 'social-4x5' if portrait else 'landscape'
    frames = [make_scene(i, portrait) for i in range(len(SCENES))]
    for i, frame in enumerate(frames):
        frame.save(OUT/f'{label}-scene-{i+1}.png')
    W,H = frames[0].size
    path = OUT/f'startup-tarot-comparison-{label}.mp4'
    command = [imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '30', '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(path)]
    proc = subprocess.Popen(command, stdin=subprocess.PIPE)
    for i, scene in enumerate(SCENES):
        stable = frames[i].tobytes()
        for n in range(scene[0]*30):
            if i and n < 9:
                raw = Image.blend(frames[i-1], frames[i], (n+1)/9).tobytes()
            else:
                raw = stable
            proc.stdin.write(raw)
    proc.stdin.close()
    if proc.wait():
        raise RuntimeError('FFmpeg export failed')
    print(path, flush=True)
    return frames

landscape = render()
portrait = render(True)
thumbs = [ImageOps.contain(im, (640,360)) for im in landscape]
sheet = Image.new('RGB',(1280,1080),BG)
for i, thumb in enumerate(thumbs):
    sheet.paste(thumb, ((i%2)*640,(i//2)*360))
sheet.save(OUT/'storyboard-preview.jpg',quality=93)
portrait[0].save(OUT/'poster.jpg',quality=94)
vtt = 'WEBVTT\n\n'
t=0
for duration,title,sub,shot,left,right,takeaway in SCENES:
    vtt += f'00:00:{t:02d}.000 --> 00:00:{t+duration:02d}.000\n{title}\n{takeaway}\n\n'
    t+=duration
(OUT/'captions.vtt').write_text(vtt,encoding='utf-8')
