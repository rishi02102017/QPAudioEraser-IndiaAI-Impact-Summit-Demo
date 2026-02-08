#!/usr/bin/env python3
"""
Download real voice clips from YouTube for each speaker.
Uses pytubefix (handles latest YouTube restrictions) + ffmpeg for clipping.
"""
import os
import subprocess
import sys
import glob

AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

SPEAKERS = [
    {
        "id": "sachin",
        "name": "Sachin Tendulkar",
        "url": "https://www.youtube.com/watch?v=kHMq92d5jtA",
        "start": 35, "duration": 13,
    },
    {
        "id": "modi",
        "name": "Narendra Modi",
        "url": "https://www.youtube.com/watch?v=shK1CAivJis",
        "start": 20, "duration": 13,
    },
    {
        "id": "kohli",
        "name": "Virat Kohli",
        "url": "https://www.youtube.com/watch?v=AcGKb9hC-HQ",
        "start": 10, "duration": 13,
    },
    {
        "id": "trump",
        "name": "Donald Trump",
        "url": "https://www.youtube.com/watch?v=8NPpd1l-6nA",
        "start": 120, "duration": 13,
    },
    {
        "id": "vaishnav",
        "name": "Ashwini Vaishnav",
        "url": "https://www.youtube.com/watch?v=emLaZIRh_3M",
        "start": 15, "duration": 13,
    },
    {
        "id": "federer",
        "name": "Roger Federer",
        "url": "https://www.youtube.com/watch?v=N-XA4BdK9UU",
        "start": 5, "duration": 13,
    },
    {
        "id": "chopra",
        "name": "Priyanka Chopra",
        "url": "https://www.youtube.com/watch?v=9MR_i8xpse0",
        "start": 20, "duration": 13,
    },
    {
        "id": "bachchan",
        "name": "Amitabh Bachchan",
        "url": "https://www.youtube.com/watch?v=sLRfoO3gYR0",
        "start": 20, "duration": 13,
    },
    {
        "id": "shah",
        "name": "Amit Shah",
        "url": "https://www.youtube.com/watch?v=MHM8mO3CBRs",
        "start": 30, "duration": 13,
    },
    {
        "id": "putin",
        "name": "Vladimir Putin",
        "url": "https://www.youtube.com/watch?v=m2dAbqeIaVs",
        "start": 60, "duration": 13,
    },
]


def download_clip(s):
    out_path = os.path.join(AUDIO_DIR, f"{s['id']}.mp3")

    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        print(f"  [skip]  {s['name']} — already exists ({os.path.getsize(out_path):,} bytes)")
        return True

    print(f"  [dl]    {s['name']} — downloading from YouTube ...")
    tmp_path = os.path.join(AUDIO_DIR, f"_tmp_{s['id']}")

    # Clean leftover temps
    for f in glob.glob(f"{tmp_path}.*"):
        os.remove(f)

    try:
        from pytubefix import YouTube
        yt = YouTube(s["url"])
        # Get audio-only stream (prefer m4a)
        stream = yt.streams.filter(only_audio=True).order_by("abr").desc().first()
        if not stream:
            # Fallback: get any stream with audio
            stream = yt.streams.filter(progressive=True).order_by("resolution").asc().first()
        if not stream:
            print(f"  [ERROR] {s['name']} — no audio stream found")
            return False

        ext = stream.mime_type.split("/")[-1]
        dl_path = f"{tmp_path}.{ext}"
        print(f"  [dl]    {s['name']} — stream: {stream.mime_type} {stream.abr or ''} ...")
        stream.download(output_path=AUDIO_DIR, filename=f"_tmp_{s['id']}.{ext}")

    except Exception as e:
        print(f"  [ERROR] {s['name']} — pytubefix: {e}")
        return False

    # Find downloaded file
    dl_file = None
    for f in glob.glob(f"{tmp_path}.*"):
        if os.path.getsize(f) > 100 and not f.endswith(".part"):
            dl_file = f
            break

    if not dl_file:
        print(f"  [ERROR] {s['name']} — downloaded file not found")
        return False

    print(f"  [clip]  {s['name']} — extracting {s['duration']}s from {s['start']}s ...")

    # Clip with ffmpeg → mono 16kHz mp3
    cmd = [
        "ffmpeg", "-y",
        "-i", dl_file,
        "-ss", str(s["start"]),
        "-t", str(s["duration"]),
        "-vn",                  # no video
        "-acodec", "libmp3lame",
        "-q:a", "2",
        "-ar", "16000",
        "-ac", "1",
        out_path,
        "-loglevel", "error",
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            print(f"  [ERROR] {s['name']} — ffmpeg: {result.stderr.strip()[:200]}")
            return False
    except Exception as e:
        print(f"  [ERROR] {s['name']} — ffmpeg: {e}")
        return False

    # Cleanup temp
    for f in glob.glob(f"{tmp_path}.*"):
        os.remove(f)

    size = os.path.getsize(out_path)
    if size < 500:
        print(f"  [ERROR] {s['name']} — output too small ({size} bytes)")
        os.remove(out_path)
        return False

    print(f"  [done]  {s['name']} → {out_path} ({size:,} bytes)")
    return True


def main():
    print("\n" + "=" * 60)
    print("  QPAudioEraser — Downloading Real Speaker Audio Clips")
    print("  (using pytubefix + ffmpeg)")
    print("=" * 60 + "\n")

    ok, fail = 0, 0
    for s in SPEAKERS:
        if download_clip(s):
            ok += 1
        else:
            fail += 1

    print(f"\n  Done: {ok} succeeded, {fail} failed")
    if fail > 0:
        missing = [s['name'] for s in SPEAKERS
                    if not os.path.exists(os.path.join(AUDIO_DIR, f"{s['id']}.mp3"))
                    or os.path.getsize(os.path.join(AUDIO_DIR, f"{s['id']}.mp3")) < 500]
        if missing:
            print(f"  Missing: {', '.join(missing)}")
    print(f"  Audio dir: {AUDIO_DIR}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
