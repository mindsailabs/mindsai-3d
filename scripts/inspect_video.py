#!/usr/bin/env python3
"""Probe a generated MP4 and extract first/mid/last frames for visual QC."""
import subprocess
import sys
from pathlib import Path

import imageio.v3 as iio
import imageio_ffmpeg


def probe(path: Path) -> None:
    ffprobe_args = [
        imageio_ffmpeg.get_ffmpeg_exe(),
        "-hide_banner",
        "-i", str(path),
    ]
    result = subprocess.run(ffprobe_args, capture_output=True, text=True)
    # ffmpeg -i prints metadata to stderr
    print(result.stderr)


def extract_frames(path: Path) -> None:
    out_dir = path.parent / f"_qc_{path.stem}"
    out_dir.mkdir(exist_ok=True)
    frames = list(iio.imiter(path))
    n = len(frames)
    print(f"Total frames: {n}")
    targets = {"first": 0, "mid": n // 2, "last": n - 1}
    for label, idx in targets.items():
        out = out_dir / f"{label}_frame_{idx:04d}.jpg"
        iio.imwrite(out, frames[idx], quality=92)
        print(f"  {label}: {out}")


if __name__ == "__main__":
    path = Path(sys.argv[1])
    probe(path)
    extract_frames(path)
