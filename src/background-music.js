// Music has its own master gain; voices overlap only during transitions.
const MUSIC_BASE_GAIN = 0.2;
const FADE_SECONDS = 0.8;
export function createBackgroundMusic(url, {
  createContext = () => new (window.AudioContext || window.webkitAudioContext)(),
  loadBuffer = async (context, trackUrl) => {
    const response = await fetch(trackUrl);
    if (!response.ok) throw new Error(`Music: ${response.status}`);
    return context.decodeAudioData(await response.arrayBuffer());
  },
} = {}) {
  const normalize = value => (Array.isArray(value) ? [...value] : [value]).filter(Boolean);
  let tracks = normalize(url), generation = 0;
  const positions = new Map();
  const fading = new Set();
  const playlistKey = () => JSON.stringify(tracks);
  let trackIndex = 0;
  let context, gain, buffer, loading, source;
  let volume = 0, gainMultiplier = 1, active = true, disposed = false, offset = 0;

  function remember(voice) {
    const position = (voice.offset + context.currentTime - voice.startedAt) % voice.buffer.duration;
    positions.set(voice.key, {trackIndex: voice.index, offset: position});
    if (voice.key === playlistKey()) offset = position;
  }

  function disconnect(voice) {
    voice.node.disconnect();
    voice.envelope.disconnect();
    fading.delete(voice);
  }

  function stop() {
    if (source) {
      remember(source);
      source.node.onended = null;
      source.node.stop();
      disconnect(source);
      source = null;
    }
    for (const voice of fading) {
      voice.node.onended = null;
      voice.node.stop();
      disconnect(voice);
    }
  }

  function fadeOut(voice) {
    remember(voice);
    const now = context.currentTime;
    // Preserve the current level even if another switch interrupts the fade-in.
    const level = Math.min(1, Math.max(0, (now - voice.startedAt) / FADE_SECONDS));
    voice.envelope.gain.cancelScheduledValues(now);
    voice.envelope.gain.setValueAtTime(level, now);
    voice.envelope.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
    fading.add(voice);
    voice.node.onended = () => disconnect(voice);
    voice.node.stop(now + FADE_SECONDS);
  }

  function sync() {
    if (disposed || !active || volume === 0) { stop(); return; }
    if (!tracks.length) {
      if (source) { fadeOut(source); source = null; }
      return;
    }
    // Cancelling a pending switch leaves the currently audible track untouched.
    if (source?.key === playlistKey() && source.index === trackIndex) {
      buffer = source.buffer;
      return;
    }
    if (context && !buffer) { load(); return; }
    if (!buffer) return;
    if (source) { fadeOut(source); source = null; }
    offset = positions.get(playlistKey())?.offset ?? offset;
    const node = context.createBufferSource(), envelope = context.createGain();
    const now = context.currentTime;
    const voice = {node, envelope, buffer, key: playlistKey(), index: trackIndex, offset, startedAt: now};
    source = voice;
    node.buffer = buffer;
    node.loop = tracks.length === 1;
    node.onended = () => {
      if (disposed || source !== voice) return;
      disconnect(voice);
      source = null;
      if (voice.key !== playlistKey()) {
        positions.set(voice.key, {trackIndex: voice.index, offset: 0});
        sync();
        return;
      }
      buffer = null;
      offset = 0;
      trackIndex = (trackIndex + 1) % tracks.length;
      positions.set(playlistKey(), {trackIndex, offset});
      sync();
    };
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(1, now + FADE_SECONDS);
    node.connect(envelope);
    envelope.connect(gain);
    node.start(0, offset);
  }

  function load() {
    if (loading || disposed || !tracks.length) return;
    const requestGeneration = generation;
    loading = (async () => loadBuffer(context, tracks[trackIndex]))().then(value => {
      if (!disposed && requestGeneration === generation) { buffer = value; sync(); }
    }).catch(() => {}).finally(() => {
      if (requestGeneration === generation) loading = null;
    });
  }

  function unlock() {
    if (disposed || volume === 0) return;
    try {
      if (!context) {
        context = createContext();
        gain = context.createGain();
        gain.gain.value = volume * gainMultiplier;
        gain.connect(context.destination);
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
      sync();
    } catch { /* A browser without audio must still run the game. */ }
  }

  function setVolume(percent) {
    volume = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) / 100 * MUSIC_BASE_GAIN : 0;
    if (gain) gain.gain.setTargetAtTime(volume * gainMultiplier, context.currentTime, 0.03);
    sync();
  }

  function setGainMultiplier(value) {
    const next = Number.isFinite(value) ? Math.max(0, Math.min(2, value)) : 1;
    if (disposed || next === gainMultiplier) return;
    gainMultiplier = next;
    if (gain) gain.gain.setTargetAtTime(volume * gainMultiplier, context.currentTime, 0.25);
  }

  function setActive(value) { active = value; sync(); }
  function setPlaylist(value) {
    const next = normalize(value), key = JSON.stringify(next);
    if (disposed || key === JSON.stringify(tracks)) return;
    if (!source || source.key !== playlistKey()) positions.set(playlistKey(), {trackIndex, offset});
    tracks = next;
    ({trackIndex = 0, offset = 0} = positions.get(key) || {});
    generation++;
    buffer = null;
    loading = null;
    sync();
  }
  function dispose() {
    disposed = true;
    stop();
    gain?.disconnect();
    context?.close().catch(() => {});
  }
  return {unlock, setVolume, setGainMultiplier, setActive, setPlaylist, dispose};
}
