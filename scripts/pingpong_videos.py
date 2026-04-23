#!/usr/bin/env python3
"""
Convert straight videos into seamless ping-pong loops (play forward + reverse).
Original files are moved to _originals/ before the ping-pong overwrites them.

Usage:
    python3 scripts/pingpong_videos.py public/assets/videos/case_01_northwood.mp4 [more...]
    python3 scripts/pingpong_videos.py public/assets/videos/*.mp4
"""
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def pingpong(src: Path, dst: Path) -> None:
    """Forward + reverse concat. Output duration = 2x input."""
    filter_complex = (
        "[0:v]split=2[fwd][rev1];"
        "[rev1]reverse[rev];"
        "[fwd][rev]concat=n=2:v=1:a=0[out]"
    )
    args = [
        FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(src),
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(dst),
    ]
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg pingpong failed:\n{result.stderr}")


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: pingpong_videos.py <video1.mp4> [<video2.mp4> ...]")
        return 1

    for arg in sys.argv[1:]:
        src = Path(arg)
        if not src.exists() or src.suffix != ".mp4":
            print(f"SKIP {src} (not an mp4 or missing)")
            continue
        # Skip files already under _originals/
        if src.parent.name == "_originals":
            continue

        originals_dir = src.parent / "_originals"
        originals_dir.mkdir(exist_ok=True)
        orig_backup = originals_dir / src.name

        if orig_backup.exists():
            print(f"SKIP {src.name} — already ping-ponged (backup exists)")
            continue

        src.rename(orig_backup)
        pingpong(orig_backup, src)
        size_mb = src.stat().st_size / 1_000_000
        print(f"{src.name} -> ping-pong ({size_mb:.1f} MB)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
