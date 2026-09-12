import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";

if (existsSync(".artifacts/media/synthetic.mp4")) process.exit(0);
mkdirSync(".artifacts/media", { recursive: true });
execFileSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=640x360:rate=24",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=44100",
    "-t",
    "3",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    ".artifacts/media/synthetic.mp4",
  ],
  { stdio: "inherit" },
);
process.stdout.write("Synthetic H.264/AAC fixture generated in ignored .artifacts/media\n");
