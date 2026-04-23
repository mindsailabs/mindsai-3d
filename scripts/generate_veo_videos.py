#!/usr/bin/env python3
"""
Generate Veo 3.1 videos for the case-study work grid.

Reads prompts from prompts/veo_prompts.json and writes MP4 outputs to
public/assets/videos/ using the filenames declared in output_path.

Usage:
    GEMINI_API_KEY=... python3 scripts/generate_veo_videos.py            # all pending
    GEMINI_API_KEY=... python3 scripts/generate_veo_videos.py case_01_northwood
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import imageio_ffmpeg
from google import genai
from google.genai import types

ROOT = Path(__file__).resolve().parent.parent
PROMPTS_PATH = ROOT / "prompts" / "veo_prompts.json"
OUTPUT_DIR = ROOT / "public" / "assets" / "videos"

MODEL = "veo-3.1-generate-preview"
NEGATIVE_PROMPT = (
    "logos, typography, text, watermarks, human faces, hands, clothing, "
    "UI elements, monitors, screens, phones, devices, binary code, "
    "circuit boards, rotating globes, glowing hexagons, chrome rainbow, "
    "magenta, saturated colors other than teal, stock photography feel, "
    "one-way pan, linear camera sweep that does not return, "
    "new objects appearing mid-shot, objects disappearing mid-shot, "
    "jump cut at loop boundary, scene that ends in a different state than it began"
)


def flatten_prompt(p: dict) -> str:
    """Flatten the structured prompt JSON into cinematic prose for Veo.

    Loop discipline is front-loaded because Veo tends to ignore loop cues
    buried at the end. The action is framed as a breathing/oscillating motion
    so the camera returns to origin regardless of what the raw JSON action said.
    """
    return (
        "SEAMLESS LOOP REQUIRED. This 8-second clip must loop perfectly: "
        "the frame at second 0 and the frame at second 8 are IDENTICAL in "
        "camera position, composition, lighting, and subject placement. "
        "All motion is cyclical — the camera breathes outward and returns, "
        "or oscillates and comes back to start. No one-way pans. No new "
        "objects appear or disappear during the shot. No lighting changes "
        "that don't reverse. Think: the first and last frame are the same "
        "photograph, and the motion in between is a gentle breath. "
        "\n\n"
        f"SUBJECT: {p['subject']}. "
        f"\n\nACTION (must be cyclical and return to origin): {p['action']}. "
        "The camera glides out and glides back to starting position within "
        "the 8 seconds. Any drifting element (dust, light, ripple) completes "
        "a full cycle and returns to its initial state. "
        f"\n\nCINEMATOGRAPHY: {p['camera']}. "
        f"\n\nLIGHTING: {p['lighting']}. "
        f"\n\nCOLOR PALETTE: {p['color_palette']}. "
        "Monochrome-leaning, desaturated except for a whisper of teal #73C5CC "
        "as the ONLY accent color. "
        f"\n\nSTYLE: {p['style']}. "
        "Motion is slow and deliberate, half-speed of real-world pacing. "
        "Subtle film grain. Premium commercial cinematography tier. "
        f"\n\nSTRICT EXCLUSIONS: {p['exclusions']}. "
        "No typography, no watermarks, no UI, no stock clichés, no audio. "
        "\n\nFINAL REMINDER: first frame = last frame. The loop has no cut."
    )


def generate_one(client: genai.Client, prompt_obj: dict, output_path: Path) -> None:
    prompt_text = flatten_prompt(prompt_obj)
    print(f"\n=== {prompt_obj['id']} ===")
    print(f"Target file: {output_path}")
    print(f"Prompt chars: {len(prompt_text)}")

    # 1080p on veo-3.1-generate-preview requires duration_seconds=8.
    # generate_audio is a Vertex-only param — Gemini API always returns audio.
    # We strip the audio track post-download via ffmpeg.
    print("Requesting 8s @ 1080p 16:9...")
    operation = client.models.generate_videos(
        model=MODEL,
        prompt=prompt_text,
        config=types.GenerateVideosConfig(
            aspect_ratio="16:9",
            duration_seconds=8,
            number_of_videos=1,
            person_generation="allow_all",
            resolution="1080p",
            negative_prompt=NEGATIVE_PROMPT,
        ),
    )
    print(f"  Operation: {operation.name}")

    t0 = time.time()
    while not operation.done:
        time.sleep(15)
        operation = client.operations.get(operation)
        elapsed = int(time.time() - t0)
        print(f"  [{elapsed:>3}s] polling... done={operation.done}")

    if operation.error:
        raise RuntimeError(f"Operation failed: {operation.error}")

    response = operation.response
    videos = getattr(response, "generated_videos", None) or response.generatedVideos
    if not videos:
        raise RuntimeError(f"No videos in response: {response}")

    video_file = videos[0].video
    client.files.download(file=video_file)
    # Save to a temp path, then strip audio into the final path.
    raw_path = output_path.with_suffix(".raw.mp4")
    video_file.save(str(raw_path))
    _strip_audio(raw_path, output_path)
    raw_path.unlink(missing_ok=True)

    size_mb = output_path.stat().st_size / 1_000_000
    print(f"  Saved {output_path.name} ({size_mb:.1f} MB, audio stripped)")


def _strip_audio(src: Path, dst: Path) -> None:
    """Copy video stream without re-encoding, drop audio track."""
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    args = [
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(src),
        "-c:v", "copy",
        "-an",
        str(dst),
    ]
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg audio-strip failed: {result.stderr}")


def main() -> int:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY env var not set", file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(PROMPTS_PATH) as f:
        data = json.load(f)

    target_ids = set(sys.argv[1:])
    client = genai.Client(api_key=api_key)

    for prompt_obj in data["prompts"]:
        pid = prompt_obj["id"]
        if target_ids and pid not in target_ids:
            continue
        filename = Path(prompt_obj["output_path"]).name
        output_path = OUTPUT_DIR / filename
        if output_path.exists():
            print(f"SKIP {pid} — already exists at {output_path}")
            continue
        try:
            generate_one(client, prompt_obj, output_path)
        except Exception as e:
            print(f"FAILED {pid}: {e}", file=sys.stderr)
            return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
