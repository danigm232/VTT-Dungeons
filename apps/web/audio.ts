import { Howl, Howler } from 'howler';
import type { AudioState } from '../../engine/shared/protocol';
import type { PublicCampaignDefinition } from '../../engine/shared/campaign';

type Channel = 'music' | 'ocean' | 'wind' | 'wood' | 'storm';
const PAUSE_FADE_MS = 180;
const PAUSE_AFTER_FADE_MS = 210;
const MOVEMENT_FADE_MS = 55;
const MOVEMENT_STOP_GRACE_MS = 80;
type MovementSound = { assetId: string; sound: Howl; active: boolean; fadeTimer?: ReturnType<typeof setTimeout>; stopTimer?: ReturnType<typeof setTimeout> };
export class AudioDirector {
  private channels = new Map<Channel, Howl>();
  private sfx = new Map<string, Howl>();
  private sfxLoops = new Map<string, Howl>();
  // Los pasos automáticos son una pista distinta de los bucles que controla el
  // DM. Cada ficha conserva su propia pista mientras está recorriendo casillas.
  private movementSfx = new Map<string, MovementSound>();
  private applied = new Map<Channel, boolean>();
  private desired = new Map<Channel, boolean>();
  private sfxLoopApplied = new Map<string, boolean>();
  private sfxLoopDesired = new Map<string, boolean>();
  private generations = new Map<Channel, number>();
  private pauseTimers = new Map<Channel, ReturnType<typeof setTimeout>>();
  private sources = new Map<Channel, string>();

  private configureRepeats(sound: Howl, data: AudioState['music'], shouldContinue: () => boolean, onFinished?: () => void) {
    sound.loop(data.loop); sound.rate(data.rate); sound.off('end');
    // A non-looping ambience can still be repeated a few deliberate times.
    // `repeats` includes the play that is already under way.
    if (!data.loop && data.repeats > 1) {
      let remaining = data.repeats - 1;
      sound.on('end', () => {
        if (!shouldContinue()) return;
        if (remaining-- > 0) sound.play();
        else onFinished?.();
      });
    }
  }

  constructor(
    private catalog: PublicCampaignDefinition['audio'],
    private readonly onSfxLoopFinished?: (id: string, startedAt: number) => void
  ) {}

  reset() {
    for (const timer of this.pauseTimers.values()) clearTimeout(timer);
    this.pauseTimers.clear(); this.desired.clear(); this.applied.clear(); this.sfxLoopDesired.clear(); this.sfxLoopApplied.clear();
    for (const channel of this.channels.keys()) this.generations.set(channel, (this.generations.get(channel) ?? 0) + 1);
    for (const sound of this.channels.values()) sound.stop();
    for (const sound of this.sfx.values()) sound.stop();
    for (const sound of this.sfxLoops.values()) { sound.stop(); sound.unload(); }
    this.sfxLoops.clear();
    for (const movement of this.movementSfx.values()) {
      if (movement.fadeTimer) clearTimeout(movement.fadeTimer);
      if (movement.stopTimer) clearTimeout(movement.stopTimer);
      movement.sound.stop(); movement.sound.unload();
    }
    this.movementSfx.clear();
  }

  async unlock() {
    try {
      if (Howler.ctx?.state === 'suspended') await Howler.ctx.resume();
      Howler.volume(0.85);
      return !Howler.ctx || Howler.ctx.state === 'running';
    } catch {
      return false;
    }
  }

  apply(state: AudioState) {
    const sourceFor = (channel: Channel) => {
      const track = channel === 'music' ? state.music : state.layers[channel];
      const library = channel === 'music' ? this.catalog.library?.music : this.catalog.library?.ambience;
      const fallback = channel === 'music' ? this.catalog.music : this.catalog.layers[channel];
      return library?.find(item => item.id === track.assetId)?.url ?? fallback;
    };
    const files: Record<Channel, string> = { music: sourceFor('music'), ocean: sourceFor('ocean'), wind: sourceFor('wind'), wood: sourceFor('wood'), storm: sourceFor('storm') };
    for (const channel of Object.keys(files) as Channel[]) {
      const data = channel === 'music' ? state.music : state.layers[channel];
      let sound = this.channels.get(channel);
      if (sound && this.sources.get(channel) !== files[channel]) {
        const pendingPause = this.pauseTimers.get(channel);
        if (pendingPause !== undefined) clearTimeout(pendingPause);
        this.pauseTimers.delete(channel);
        this.generations.set(channel, (this.generations.get(channel) ?? 0) + 1);
        sound.stop(); sound.unload(); this.channels.delete(channel); this.sources.delete(channel); this.applied.set(channel, false); sound = undefined;
      }
      if (!sound) {
        sound = new Howl({ src: [files[channel]], loop: data.loop, rate: data.rate, volume: 0, html5: false, preload: true });
        this.channels.set(channel, sound); this.sources.set(channel, files[channel]);
      }
      this.configureRepeats(sound, data, () => this.desired.get(channel) === true);
      const wasActive = this.applied.get(channel) ?? false;
      this.desired.set(channel, data.playing);
      if (data.playing && !wasActive) {
        const pendingPause = this.pauseTimers.get(channel);
        if (pendingPause !== undefined) {
          clearTimeout(pendingPause);
          this.pauseTimers.delete(channel);
        }
        const generation = (this.generations.get(channel) ?? 0) + 1;
        this.generations.set(channel, generation);
        const activeSound = sound;
        const offset = data.offset + (data.startedAt ? (Date.now() - data.startedAt) / 1000 * data.rate : 0);
        const seek = () => {
          if (this.generations.get(channel) !== generation || !this.desired.get(channel)) return;
          const duration = activeSound.duration();
          if (duration > 0) activeSound.seek(((offset % duration) + duration) % duration);
        };
        activeSound.play();
        if (activeSound.state() === 'loaded') seek(); else activeSound.once('load', seek);
        activeSound.fade(0, data.volume, 900);
      } else if (!data.playing && wasActive) {
        this.generations.set(channel, (this.generations.get(channel) ?? 0) + 1);
        const activeSound = sound;
        // La consola del DM debe sentirse como un interruptor: mantenemos una
        // salida breve para no producir un clic, pero no una cola perceptible.
        activeSound.fade(activeSound.volume(), 0, PAUSE_FADE_MS);
        const timer = globalThis.setTimeout(() => {
          if (!this.desired.get(channel)) activeSound.pause();
          this.pauseTimers.delete(channel);
        }, PAUSE_AFTER_FADE_MS);
        this.pauseTimers.set(channel, timer);
      } else if (data.playing) {
        const pendingPause = this.pauseTimers.get(channel);
        if (pendingPause !== undefined) {
          clearTimeout(pendingPause);
          this.pauseTimers.delete(channel);
        }
        if (!sound.playing()) sound.play();
        sound.fade(sound.volume(), data.volume, 350);
      }
      this.applied.set(channel, data.playing);
    }
    this.applySfxLoops(state);
  }

  /** Los pasos se reproducen aparte de los golpes: así pueden repetirse sin
   * cortar ni multiplicar los efectos puntuales de una escena. */
  private applySfxLoops(state: AudioState) {
    // Las pestañas de proyector abiertas durante una actualización pueden
    // recibir un estado anterior una última vez; se trata como sin secuencias.
    const loops = state.sfxLoops ?? {};
    for (const [id, sound] of this.sfxLoops) if (!loops[id]) {
      sound.stop(); sound.unload(); this.sfxLoops.delete(id); this.sfxLoopApplied.delete(id); this.sfxLoopDesired.delete(id);
    }
    for (const [id, data] of Object.entries(loops)) {
      const source = this.catalog.library?.sfx.find(effect => effect.id === id)?.url;
      if (!source) continue;
      let sound = this.sfxLoops.get(id);
      if (!sound) {
        sound = new Howl({ src: [source], loop: data.loop, rate: data.rate, volume: 0, html5: false, preload: true });
        this.sfxLoops.set(id, sound);
      }
      const wasActive = this.sfxLoopApplied.get(id) ?? false;
      this.sfxLoopDesired.set(id, data.playing);
      const startedAt = data.startedAt;
      this.configureRepeats(sound, data, () => this.sfxLoopDesired.get(id) === true, () => {
        this.sfxLoopDesired.set(id, false); this.sfxLoopApplied.set(id, false);
        // Solo notificamos secuencias con un estado vivo. El sello evita que un
        // final tardío pause una nueva reproducción del mismo efecto.
        if (startedAt) this.onSfxLoopFinished?.(id, startedAt);
      });
      if (data.playing && !wasActive) {
        const offset = data.offset + (data.startedAt ? (Date.now() - data.startedAt) / 1000 * data.rate : 0);
        sound.play();
        const seek = () => {
          const duration = sound!.duration();
          if (this.sfxLoopDesired.get(id) && duration > 0) sound!.seek(((offset % duration) + duration) % duration);
        };
        if (sound.state() === 'loaded') seek(); else sound.once('load', seek);
        sound.fade(0, data.volume, 120);
      } else if (!data.playing && wasActive) {
        sound.fade(sound.volume(), 0, PAUSE_FADE_MS);
        globalThis.setTimeout(() => { if (!this.sfxLoopDesired.get(id)) sound!.pause(); }, PAUSE_AFTER_FADE_MS);
      } else if (data.playing) {
        if (!sound.playing()) sound.play();
        sound.fade(sound.volume(), data.volume, 120);
      }
      this.sfxLoopApplied.set(id, data.playing);
    }
  }

  playSfx(id: string) {
    let sound = this.sfx.get(id);
    if (!sound) {
      const source = this.catalog.library?.sfx.find(effect => effect.id === id)?.url ?? this.catalog.sfx[id as keyof PublicCampaignDefinition['audio']['sfx']];
      if (!source) return;
      sound = new Howl({ src: [source], volume: id.includes('thunder') ? 0.55 : 0.5, preload: true });
      this.sfx.set(id, sound);
    }
    sound.play();
  }

  /**
   * Mantiene un paso sólo durante la animación de una ficha. Las renovaciones
   * consecutivas (una ruta de varias casillas) extienden la misma reproducción
   * y por eso nunca se apilan varias copias del sonido.
   */
  playMovementSfx(entityId: string, assetId: string, durationMs: number) {
    const source = this.catalog.library?.sfx.find(effect => effect.id === assetId)?.url
      ?? this.catalog.sfx[assetId as keyof PublicCampaignDefinition['audio']['sfx']];
    if (!source) return;
    let movement = this.movementSfx.get(entityId);
    if (movement && movement.assetId !== assetId) {
      if (movement.fadeTimer) clearTimeout(movement.fadeTimer);
      if (movement.stopTimer) clearTimeout(movement.stopTimer);
      movement.sound.stop(); movement.sound.unload(); this.movementSfx.delete(entityId);
      movement = undefined;
    }
    if (!movement) {
      movement = { assetId, sound: new Howl({ src: [source], loop: true, volume: 0, html5: false, preload: true }), active: false };
      this.movementSfx.set(entityId, movement);
    }
    if (movement.fadeTimer) clearTimeout(movement.fadeTimer);
    if (movement.stopTimer) clearTimeout(movement.stopTimer);
    movement.fadeTimer = undefined; movement.stopTimer = undefined;
    if (!movement.active) {
      movement.active = true;
      movement.sound.play();
      movement.sound.fade(0, 0.42, MOVEMENT_FADE_MS);
    } else if (!movement.sound.playing()) {
      movement.sound.play();
      movement.sound.fade(0, 0.42, MOVEMENT_FADE_MS);
    } else if (movement.sound.volume() < 0.42) {
      movement.sound.fade(movement.sound.volume(), 0.42, MOVEMENT_FADE_MS);
    }
    const safeDuration = Math.max(1, Math.round(durationMs));
    // Server step-completion ticks and socket delivery can land a few ms after
    // the nominal cell duration. Keep the loop alive across that seam so each
    // next tile doesn't sound like an unrelated, restarted footstep.
    const stopAfter = safeDuration + MOVEMENT_STOP_GRACE_MS;
    const fadeAfter = Math.max(0, stopAfter - MOVEMENT_FADE_MS);
    movement.fadeTimer = globalThis.setTimeout(() => {
      // Al finalizar una única casilla hay una salida breve, sin alargar la
      // ruta. Si llega la siguiente casilla antes, este temporizador se borra.
      movement!.sound.fade(movement!.sound.volume(), 0, Math.min(MOVEMENT_FADE_MS, safeDuration));
    }, fadeAfter);
    movement.stopTimer = globalThis.setTimeout(() => {
      movement!.sound.stop(); movement!.active = false;
      movement!.fadeTimer = undefined; movement!.stopTimer = undefined;
    }, stopAfter);
  }
}
