#!/usr/bin/env python3
"""Generate three emotional voice-design pilots for the girl on the radio."""

import argparse
import shutil
from pathlib import Path

MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-4bit"
SPACE = "Qwen/Qwen3-TTS"
TEXT = (
    "Садовник, ты слышишь? Мы под землёй восемьдесят лет. "
    "Хранители заварили шлюзы снаружи."
)
OUTPUT = Path("artifacts/story-voices-20260912/emotional-girl-pilot")

BASE_CHARACTER = (
    "A believable eleven-year-old girl speaking Russian over a radio. "
    "Her voice is warm, natural and emotionally transparent, with a comfortable "
    "child pitch: never squeaky, cartoonish, cute, theatrical, or adult-sounding. "
    "Clear native Russian pronunciation. "
)

TAKES = {
    "a-restrained-fear": (
        "She is frightened but trying hard to stay composed. Begin softly, let her "
        "breath catch on 'восемьдесят лет', then finish with restrained urgency."
    ),
    "b-vulnerable-hope": (
        "She is exhausted and lonely, but hearing the Gardener gives her a small, "
        "fragile hope. Let the final sentence carry hurt and a quiet plea for help."
    ),
    "c-controlled-panic": (
        "The danger feels immediate. Use controlled panic, an uneven breath and a "
        "slight tremble, but do not scream and do not raise the pitch into a squeal."
    ),
}


def generate_local() -> None:
    import mlx.core as mx
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model

    OUTPUT.mkdir(parents=True, exist_ok=True)
    model = load_model(MODEL)
    for index, (name, direction) in enumerate(TAKES.items(), start=1):
        mx.random.seed(20260912 + index)
        result = next(
            model.generate_voice_design(
                text=TEXT,
                language="Russian",
                instruct=BASE_CHARACTER + direction,
                temperature=0.82,
                top_k=40,
                top_p=0.92,
                repetition_penalty=1.08,
            )
        )
        target = OUTPUT / f"BIOSO-girl-emotional-{name}.wav"
        sf.write(target, np.asarray(result.audio), result.sample_rate, subtype="PCM_16")
        print(f"{target} · {result.audio_duration:.2f}s · peak {result.peak_memory_usage:.2f}GB")


def generate_with_public_space() -> None:
    from gradio_client import Client

    OUTPUT.mkdir(parents=True, exist_ok=True)
    client = Client(SPACE)
    for name, direction in TAKES.items():
        result = client.predict(
            text=TEXT,
            language="Russian",
            voice_description=BASE_CHARACTER + direction,
            api_name="/generate_voice_design",
        )
        source = Path(result[0] if isinstance(result, tuple) else result)
        target = OUTPUT / f"BIOSO-girl-emotional-{name}{source.suffix or '.wav'}"
        shutil.copy2(source, target)
        status = result[1] if isinstance(result, tuple) and len(result) > 1 else "generated"
        print(f"{target} · {status}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", choices=("local", "space"), default="local")
    args = parser.parse_args()
    generate_local() if args.backend == "local" else generate_with_public_space()


if __name__ == "__main__":
    main()
