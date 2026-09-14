#!/usr/bin/env python3
"""Build the full BIOSO story cast with Qwen3-TTS and promote it atomically."""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import os
import shutil
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("HF_HOME", str(ROOT / "temp/voice-mlx/hf-cache"))

VOICE_DESIGN_MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-4bit"
VOICE_CLONE_MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-4bit"
VOICE_DESIGN_LOCAL = ROOT / "temp/voice-mlx/models/voice-design"
VOICE_CLONE_LOCAL = ROOT / "temp/voice-mlx/models/voice-clone"
APPROVED_GIRL = ROOT / "artifacts/story-voices-20260912/emotional-girl-pilot/BIOSO-girl-emotional-a-restrained-fear.wav"
APPROVED_GIRL_TEXT = "Садовник, ты слышишь? Мы под землёй восемьдесят лет. Хранители заварили шлюзы снаружи."
OUTPUT = ROOT / "artifacts/story-voices-20260913/qwen-cast-zero-context"
PRODUCTION = ROOT / "public/assets/audio/story"
BACKUP = OUTPUT / "backup-before-qwen-cast"
RUSSIAN_BACKUP = OUTPUT / "backup-before-stress-pass"
FFMPEG = ROOT / "temp/trailer-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"

DESIGNS = {
    "gardener": (
        "A believable living ten-to-eleven-year-old boy speaking native Russian. This is the Soul inside a machine, "
        "but the voice itself must sound completely human. Give him a clearly masculine preadolescent timbre: "
        "noticeably lower than a little girl's voice, with compact chest resonance, a faint boyish husk, firm sentence "
        "endings and short thoughtful pauses. He is curious, emotionally responsive and quietly brave, with natural "
        "child breath, but never airy, delicate, sing-song, high-pitched, falsetto, feminine, adult, robotic, vocoded, "
        "metallic, synthetic, monotone, cute, or announcer-like. The contrast with a bright young girl's voice must be "
        "immediate and unmistakable. "
        "Dry close-mic studio voice without radio noise, reverb, music, or sound effects."
    ),
    "hunter": (
        "A lean adult male machine hunter speaking native Russian in fast, clipped phrases. Bright narrow "
        "baritone, alert and judicial, with controlled aggression and no shouting. Distinctly alive beneath "
        "military precision. Dry close-mic studio voice without radio noise, reverb, music, or effects."
    ),
    "leviathan": (
        "An enormous ancient masculine machine speaking native Russian. Very low heavy bass, worn gravel and "
        "immense physical weight; tired rather than evil. Natural measured pace without long pauses, restrained anger. "
        "Dry close-mic studio voice without radio noise, reverb, music, or effects."
    ),
    "cathedral": (
        "A serene gender-neutral machine intelligence speaking native Russian. Deep resonant voice, spacious "
        "vowels and calm liturgical authority, compassionate on the surface and terrifyingly certain underneath. "
        "Never theatrical or booming. Dry close-mic studio voice without choir, reverb, music, or effects."
    ),
    "collector": (
        "A youthful androgynous machine archivist speaking native Russian. Clear glassy midrange, exact diction, "
        "quiet curiosity and a faintly wounded restraint. Agile but not high-pitched, playful, or feminine-coded. "
        "Dry close-mic studio voice without radio noise, reverb, music, or effects."
    ),
    "shepherd": (
        "A mature gentle male machine shepherd speaking native Russian. Soft dark baritone, patient pastoral "
        "warmth and an unsettling certainty, as if one calm voice represents a swarm. Intimate, never villainous. "
        "Dry close-mic studio voice without layered voices, radio noise, reverb, music, or effects."
    ),
    "mother": (
        "A mature low female machine intelligence speaking native Russian. Calm maternal contralto, lucid and "
        "measured, with grief held beneath absolute strategic control. Neither seductive nor monstrous. "
        "Dry close-mic studio voice without layered voices, radio noise, reverb, music, or effects."
    ),
}


def run(command: list[str], *, capture: bool = False) -> str:
    result = subprocess.run(command, cwd=ROOT, check=True, text=True, capture_output=capture)
    return result.stdout if capture else ""


def story_cues() -> list[dict]:
    source = (
        "import {STORY_CUES} from './src/story-cues.js';"
        "console.log(JSON.stringify(STORY_CUES.map(c=>({id:c.id,text:c.text,voice:c.voice,"
        "profile:c.voice==='robot'?c.voiceProfile:c.voice,speaker:c.speaker}))));"
    )
    return json.loads(run(["node", "--input-type=module", "-e", source], capture=True))


def translations() -> dict[str, str]:
    return json.loads((ROOT / "src/i18n/en.json").read_text())


def russian_tts_text(text: str) -> str:
    """Keep native Russian text intact; inserted stress notation destabilizes Qwen."""
    return text


def write_wav(path: Path, audio, sample_rate: int) -> float:
    import numpy as np
    import soundfile as sf

    samples = np.asarray(audio)
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(path, samples, sample_rate, subtype="PCM_16")
    return len(samples) / sample_rate


def clear_model(model) -> None:
    import mlx.core as mx

    del model
    gc.collect()
    mx.clear_cache()


def predict_retry(client, *, api_name: str, **kwargs):
    error = None
    for attempt in range(1, 6):
        try:
            return client.predict(api_name=api_name, **kwargs)
        except Exception as exc:
            error = exc
            if attempt == 5:
                break
            delay = attempt * 8
            print(f"Qwen Space retry {attempt}/4 in {delay}s: {exc}", flush=True)
            time.sleep(delay)
    raise RuntimeError(f"Qwen Space failed after retries: {error}")


def result_path(result) -> Path:
    value = result[0] if isinstance(result, tuple) else result
    if hasattr(value, "path"):
        value = value.path
    return Path(value)


def build_references(cues: list[dict], resume: bool, backend: str, refresh: set[str], client=None) -> dict[str, dict]:
    references = OUTPUT / "references"
    references.mkdir(parents=True, exist_ok=True)
    girl_target = references / "child.wav"
    if not girl_target.exists():
        shutil.copy2(APPROVED_GIRL, girl_target)
    manifest = {"child": {"audio": str(girl_target), "text": russian_tts_text(APPROVED_GIRL_TEXT), "source": "approved-a-restrained-fear"}}

    needed = [profile for profile in DESIGNS if not (resume and profile not in refresh and (references / f"{profile}.wav").exists())]
    model = None
    if needed and backend == "local":
        from mlx_audio.tts.utils import load_model
        model = load_model(str(VOICE_DESIGN_LOCAL) if (VOICE_DESIGN_LOCAL / "model.safetensors").exists() else VOICE_DESIGN_MODEL)
    try:
        for index, profile in enumerate(DESIGNS, start=1):
            cue = next(item for item in cues if item["profile"] == profile)
            reference_text = russian_tts_text(cue["text"])
            target = references / f"{profile}.wav"
            if not (resume and profile not in refresh and target.exists()):
                if backend == "space":
                    result = predict_retry(client, api_name="/generate_voice_design", text=reference_text, language="Russian", voice_description=DESIGNS[profile])
                    shutil.copy2(result_path(result), target)
                    seconds = probe_duration(target)
                else:
                    import mlx.core as mx
                    mx.random.seed(2026091300 + index)
                    result = next(model.generate_voice_design(
                        text=reference_text, language="Russian", instruct=DESIGNS[profile],
                        max_tokens=max(220, min(640, len(cue["text"]) * 5)),
                        temperature=0.78, top_k=40, top_p=0.92, repetition_penalty=1.08,
                    ))
                    seconds = write_wav(target, result.audio, result.sample_rate)
                print(f"reference {profile}: {seconds:.2f}s", flush=True)
            manifest[profile] = {"audio": str(target), "text": reference_text, "source": "voice-design"}
    finally:
        if model is not None:
            clear_model(model)
    return manifest


def master(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    run([
        str(FFMPEG), "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
        "-af", "highpass=f=70,lowpass=f=10500,deesser=i=.22:m=.35:f=.5,"
        "acompressor=threshold=.12:ratio=1.7:attack=16:release=170,loudnorm=I=-18:LRA=7:TP=-2",
        "-ar", "48000", "-ac", "1", "-c:a", "aac", "-b:a", "128k", str(target),
    ])


def probe_duration(path: Path) -> float:
    ffprobe = FFMPEG.with_name("ffprobe-macos-aarch64-v7.1")
    if ffprobe.exists():
        return float(run([str(ffprobe), "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture=True).strip())
    result = subprocess.run([str(FFMPEG), "-hide_banner", "-i", str(path)], cwd=ROOT, text=True, capture_output=True)
    import re
    match = re.search(r"Duration: (\d+):(\d+):([\d.]+)", result.stderr)
    if not match:
        raise RuntimeError(f"Cannot read duration: {path}")
    return int(match[1]) * 3600 + int(match[2]) * 60 + float(match[3])


def build_clips(cues: list[dict], refs: dict[str, dict], resume: bool, backend: str, refresh: set[str], refresh_russian: bool, client=None) -> list[dict]:
    english = translations()
    model = None
    if backend == "local":
        from mlx_audio.tts.utils import load_model
        model = load_model(str(VOICE_CLONE_LOCAL) if (VOICE_CLONE_LOCAL / "model.safetensors").exists() else VOICE_CLONE_MODEL)
    result_manifest = []
    try:
        for locale_index, (locale, language) in enumerate((("ru", "Russian"), ("en", "English"))):
            workspace = OUTPUT
            clean = workspace / "clean"
            staging = workspace / "staging"
            for cue_index, cue in enumerate(cues):
                text = russian_tts_text(cue["text"]) if locale == "ru" else english.get(cue["text"])
                if not text:
                    raise RuntimeError(f"Missing English dialogue: {cue['id']}")
                wav = clean / locale / f"{cue['id']}.wav"
                encoded = staging / locale / f"{cue['id']}.m4a"
                reusable = resume and cue["profile"] not in refresh and not (locale == "ru" and refresh_russian)
                if not (reusable and wav.exists()):
                    reference = refs[cue["profile"]]
                    if backend == "space":
                        from gradio_client import handle_file
                        generated = predict_retry(
                            client, api_name="/generate_voice_clone", ref_audio=handle_file(reference["audio"]),
                            ref_text=reference["text"], target_text=text, language=language,
                            use_xvector_only=False, model_size="1.7B",
                        )
                        shutil.copy2(result_path(generated), wav)
                        generated_duration = probe_duration(wav)
                    else:
                        import mlx.core as mx
                        duration_limit = max(12.0, len(text) * 0.18)
                        for attempt in range(3):
                            mx.random.seed(202609130000 + locale_index * 1000 + cue_index + attempt * 10000)
                            generated = next(model.generate(
                                text=text, lang_code=language, ref_audio=reference["audio"], ref_text=reference["text"],
                                max_tokens=max(80, min(300, int(len(text) * 2))),
                                temperature=0.72, top_k=35, top_p=0.90, repetition_penalty=1.55 + attempt * 0.05,
                            ))
                            generated_duration = write_wav(wav, generated.audio, generated.sample_rate)
                            if generated_duration <= duration_limit:
                                break
                            print(f"retry {locale} {cue['id']}: implausible {generated_duration:.2f}s", flush=True)
                        else:
                            raise RuntimeError(f"Degenerate voice duration: {locale}:{cue['id']} {generated_duration:.2f}s")
                    print(f"{locale} {cue['id']}: {generated_duration:.2f}s", flush=True)
                if not (reusable and encoded.exists()):
                    master(wav, encoded)
                seconds = probe_duration(encoded)
                if encoded.stat().st_size < 4096 or seconds <= 0.5:
                    raise RuntimeError(f"Invalid rendered voice: {locale}:{cue['id']}")
                result_manifest.append({
                    "locale": locale, "id": cue["id"], "profile": cue["profile"],
                    "ttsText": text,
                    "duration": round(seconds, 3), "bytes": encoded.stat().st_size,
                    "sha256": hashlib.sha256(encoded.read_bytes()).hexdigest(),
                })
    finally:
        if model is not None:
            clear_model(model)
    return result_manifest


def promote(cues: list[dict]) -> None:
    for locale in ("ru", "en"):
        staging = OUTPUT / "staging"
        destination = PRODUCTION if locale == "ru" else PRODUCTION / "en"
        backup = RUSSIAN_BACKUP if locale == "ru" else BACKUP / "en"
        destination.mkdir(parents=True, exist_ok=True)
        backup.mkdir(parents=True, exist_ok=True)
        for cue in cues:
            current = destination / f"{cue['id']}.m4a"
            candidate = staging / locale / f"{cue['id']}.m4a"
            if current.exists() and not (backup / current.name).exists():
                shutil.copy2(current, backup / current.name)
            temporary = destination / f".{cue['id']}.qwen-new.m4a"
            shutil.copy2(candidate, temporary)
            os.replace(temporary, current)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", choices=("space", "local"), default="space")
    parser.add_argument("--resume", action="store_true", help="Reuse valid generated references and clips")
    parser.add_argument("--references-only", action="store_true", help="Stop after creating the approved cast references")
    parser.add_argument("--no-promote", action="store_true", help="Keep the completed cast in artifacts only")
    parser.add_argument("--refresh-russian", action="store_true", help="Regenerate every Russian clip from its native text")
    parser.add_argument("--print-russian-stress", action="store_true", help="Print the exact Russian synthesis text and exit")
    parser.add_argument("--refresh-profile", action="append", choices=tuple(DESIGNS), default=[], help="Regenerate one designed voice and every clip using it")
    args = parser.parse_args()
    if not APPROVED_GIRL.exists():
        raise SystemExit(f"Approved girl reference is missing: {APPROVED_GIRL}")
    if not FFMPEG.exists():
        raise SystemExit(f"Bundled ffmpeg is missing: {FFMPEG}")

    cues = story_cues()
    if args.print_russian_stress:
        for cue in cues:
            print(f"{cue['id']}\t{russian_tts_text(cue['text'])}")
        return
    profiles = {cue["profile"] for cue in cues}
    expected = {"child", *DESIGNS}
    if profiles != expected:
        raise SystemExit(f"Cast mismatch: expected {sorted(expected)}, got {sorted(profiles)}")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    client = None
    if args.backend == "space":
        from gradio_client import Client
        client = Client("Qwen/Qwen3-TTS", verbose=False)
    refresh = set(args.refresh_profile)
    refs = build_references(cues, args.resume, args.backend, refresh, client)
    if args.references_only:
        (OUTPUT / "references.json").write_text(json.dumps(refs, ensure_ascii=False, indent=2) + "\n")
        print(f"references ready: {len(refs)}", flush=True)
        return
    manifest = build_clips(cues, refs, args.resume, args.backend, refresh, args.refresh_russian, client)
    (OUTPUT / "verification.json").write_text(json.dumps({
        "voiceDesignModel": VOICE_DESIGN_MODEL,
        "voiceCloneModel": VOICE_CLONE_MODEL,
        "backend": args.backend,
        "russianText": {"notation": "native text without inserted stress marks"},
        "approvedGirl": str(APPROVED_GIRL.relative_to(ROOT)),
        "voiceDesigns": DESIGNS,
        "references": refs,
        "clips": manifest,
    }, ensure_ascii=False, indent=2) + "\n")
    if not args.no_promote:
        promote(cues)
    print(f"ready: {len(manifest)} clips; promoted={not args.no_promote}", flush=True)


if __name__ == "__main__":
    main()
