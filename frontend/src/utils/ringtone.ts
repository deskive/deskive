/**
 * Ringtone Utility
 * Generates a pleasant ringtone sound using Web Audio API
 */

export class Ringtone {
  private audioContext: AudioContext | null = null
  private oscillators: OscillatorNode[] = []
  private gainNode: GainNode | null = null
  private isPlaying = false
  private intervalId: number | null = null

  /**
   * Start playing the ringtone
   */
  play(): void {
    if (this.isPlaying) {
      console.log('🔔 [Ringtone] Already playing')
      return
    }

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
      this.gainNode.gain.value = 0.3 // 30% volume

      this.isPlaying = true

      // Play the ringtone pattern (repeating)
      this.playRingtonePattern()

      console.log('🔔 [Ringtone] Started playing')
    } catch (err) {
      console.error('❌ [Ringtone] Failed to start:', err)
    }
  }

  /**
   * Stop playing the ringtone
   */
  stop(): void {
    if (!this.isPlaying) {
      return
    }

    try {
      // Stop interval
      if (this.intervalId !== null) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }

      // Stop all oscillators
      this.oscillators.forEach(osc => {
        try {
          osc.stop()
        } catch (err) {
          // Ignore errors from already stopped oscillators
        }
      })
      this.oscillators = []

      // Close audio context
      if (this.audioContext) {
        this.audioContext.close()
        this.audioContext = null
      }

      this.gainNode = null
      this.isPlaying = false

      console.log('🔇 [Ringtone] Stopped')
    } catch (err) {
      console.error('❌ [Ringtone] Failed to stop:', err)
    }
  }

  /**
   * Play a pleasant ringtone pattern
   * Pattern: Two-tone melody that repeats every 3 seconds
   */
  private playRingtonePattern(): void {
    if (!this.audioContext || !this.gainNode) return

    const playTone = (frequency: number, startTime: number, duration: number) => {
      if (!this.audioContext || !this.gainNode) return

      const oscillator = this.audioContext.createOscillator()
      const envelope = this.audioContext.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.value = frequency

      // Attack and release for smooth sound
      envelope.gain.setValueAtTime(0, startTime)
      envelope.gain.linearRampToValueAtTime(0.3, startTime + 0.05) // Attack
      envelope.gain.linearRampToValueAtTime(0.3, startTime + duration - 0.1)
      envelope.gain.linearRampToValueAtTime(0, startTime + duration) // Release

      oscillator.connect(envelope)
      envelope.connect(this.gainNode)

      oscillator.start(startTime)
      oscillator.stop(startTime + duration)

      this.oscillators.push(oscillator)

      // Clean up oscillator after it stops
      setTimeout(() => {
        const index = this.oscillators.indexOf(oscillator)
        if (index > -1) {
          this.oscillators.splice(index, 1)
        }
      }, (startTime - this.audioContext.currentTime + duration) * 1000 + 100)
    }

    const playPattern = () => {
      if (!this.audioContext || !this.isPlaying) return

      const currentTime = this.audioContext.currentTime

      // Pleasant two-tone ringtone pattern
      // First tone (higher pitch)
      playTone(800, currentTime, 0.3)
      playTone(800, currentTime + 0.35, 0.3)

      // Second tone (lower pitch)
      playTone(600, currentTime + 0.8, 0.5)
    }

    // Play pattern immediately
    playPattern()

    // Then repeat every 1.5 seconds
    this.intervalId = window.setInterval(() => {
      playPattern()
    }, 1500)
  }

  /**
   * Check if ringtone is currently playing
   */
  get playing(): boolean {
    return this.isPlaying
  }
}

/**
 * Global ringtone instance
 */
let globalRingtone: Ringtone | null = null

/**
 * Get or create the global ringtone instance
 */
export function getRingtone(): Ringtone {
  if (!globalRingtone) {
    globalRingtone = new Ringtone()
  }
  return globalRingtone
}

/**
 * Play ringtone (convenience function)
 */
export function playRingtone(): void {
  getRingtone().play()
}

/**
 * Stop ringtone (convenience function)
 */
export function stopRingtone(): void {
  getRingtone().stop()
}
