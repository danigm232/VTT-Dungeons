/** Timbres sintetizados para esta viñeta. El contexto se abre con el clic del d20. */
export function preparePerformanceSound() {
  if (typeof AudioContext === 'undefined') return undefined;
  let audio: AudioContext;
  try { audio = new AudioContext(); } catch { return undefined; }
  void audio.resume().catch(() => {});
  return {
    play(success: boolean) {
      if (audio.state !== 'running') return;
      const start = audio.currentTime;
      const notes = success ? [293.66, 440, 587.33] : [293.66, 278];
      notes.forEach((frequency, index) => {
        const time = start + index * .16;
        const voice = audio.createOscillator(), envelope = audio.createGain();
        voice.type = 'triangle'; voice.frequency.value = frequency;
        envelope.gain.setValueAtTime(.0001, time);
        envelope.gain.exponentialRampToValueAtTime(.07, time + .016);
        envelope.gain.exponentialRampToValueAtTime(.0001, time + .21);
        voice.connect(envelope).connect(audio.destination);
        voice.start(time); voice.stop(time + .22);
      });
    },
    close() { void audio.close().catch(() => {}); }
  };
}
