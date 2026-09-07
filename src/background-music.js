// One looping voice, separate from combat effects. Context creation requires a gesture.
const MUSIC_BASE_GAIN = 0.6;
export function createBackgroundMusic(url, {
  createContext = () => new (window.AudioContext || window.webkitAudioContext)(),
  loadBuffer = async context => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Music: ${response.status}`);
    return context.decodeAudioData(await response.arrayBuffer());
  },
} = {}) {
  let context, gain, buffer, loading, source;
  let volume = 0, active = true, disposed = false, offset = 0, startedAt = 0;

  function stop() {
    if (!source) return;
    offset = (offset + context.currentTime - startedAt) % buffer.duration;
    source.stop();
    source.disconnect();
    source = null;
  }

  function sync() {
    if (disposed || !active || volume === 0) { stop(); return; }
    if (!buffer || source) return;
    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    startedAt = context.currentTime;
    source.start(0, offset);
  }

  function unlock() {
    if (disposed || volume === 0) return;
    try {
      if (!context) {
        context = createContext();
        gain = context.createGain();
        gain.gain.value = volume;
        gain.connect(context.destination);
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
      if (!buffer && !loading) {
        loading = loadBuffer(context).then(value => {
          if (!disposed) { buffer = value; sync(); }
        }).catch(() => {}).finally(() => { loading = null; });
      }
      sync();
    } catch { /* A browser without audio must still run the game. */ }
  }

  function setVolume(percent) {
    volume = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) / 100 * MUSIC_BASE_GAIN : 0;
    if (gain) gain.gain.setTargetAtTime(volume, context.currentTime, 0.03);
    sync();
  }

  function setActive(value) { active = value; sync(); }
  function dispose() {
    disposed = true;
    stop();
    gain?.disconnect();
    context?.close().catch(() => {});
  }
  return {unlock, setVolume, setActive, dispose};
}
