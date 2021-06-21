import builder from '@ozymandiasthegreat/vad';


export default async function VoiceActivityFilterBuilder() {
  const { VAD } = await builder();

  class VoiceActivityFilter {
    constructor(options) {
      this.options = options || {}
      this._debouncing = this.debounce
      this._vad = new VAD(this.vadMode)
    }

    static get Mode() {
      return VAD.Mode;
    }

    get sampleRate() {
      return this.options.sampleRate || 16000
    }

    get vadMode() {
      return this.options.vadMode || VAD.Mode.VERY_AGGRESSIVE
    }

    get vadDebounceTime() {
      return this.options.vadDebounceTime || 1000
    }

    get debounce() {
      return this.options.debounce || 20
    }

    async processAudio(audioBuffer) {
      if ( this._debouncing > 0 ) {
        this._debouncing--
        return true
      }
      const res = this._vad.processAudio(new Int16Array(audioBuffer.buffer), this.sampleRate)
      if ( res === VAD.Event.VOICE ) {
        this._debouncing = this.debounce
        return true
      }
      return false
    }

    destroy(err) {
      this._vad = null
    }
  }

  return { VoiceActivityFilter };
}
