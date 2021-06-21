import { Transform } from "stream";
import Block from "block-stream2";
import * as MFCC from "node-mfcc";
import * as FFT from "fft-js";
import Utils from "./utils";


export default class FeatureExtractor extends Transform {
  constructor(options) {
    super({
      readableObjectMode: true
    })
    this.options    = options || {}
    this.samples    = []
    this._full      = false
    this._extractor = MFCC.construct(this.samplesPerFrame / 2, 24, 1, this.sampleRate / 2, this.sampleRate)
    this._block     = new Block( this.samplesPerShift * this.sampleRate / 8000 )

    this._block
      .on('drain', () => {
        this._full = false
      })
      .on('data', audioBuffer => {
          const newSamples = this.preEmphasis( audioBuffer )
          if ( this.samples.length >= this.samplesPerFrame ) {
            this.samples = [...this.samples.slice(newSamples.length), ...newSamples]
            try {
              const features = this.extractFeatures( this.samples.slice(0, this.samplesPerFrame) )
              this.push({features, audioBuffer})
            } catch (err) {
              this.error(err)
            }
          } else {
            this.samples = [...this.samples, ...newSamples]
          }
      })
      .on('error', err => this.error(err))
  }

  get full() {
    return this._full
  }

  get sampleRate() {
    return this.options.sampleRate || 16000
  }

  get samplesPerFrame() {
    return this.options.samplesPerFrame || 480
  }

  get samplesPerShift() {
    return this.options.samplesPerShift || 160
  }

  get preEmphasisCoefficient() {
    return this.options.preEmphasisCoefficient || 0.97
  }

  _write(audioData, enc, done) {
    if ( !this._block.write(audioData, enc, done) ) {
      this._full = true
    }
  }

  error(err) {
    this.emit('error', err)
  }

  destroy(err) {
    this._block.removeAllListeners()
    this._block.destroy()
    this._block = null

    this._extractor = null

    super.destroy(err)
  }

  preEmphasis(audioBuffer) {
    const coef = this.preEmphasisCoefficient
    const samples = Array
      .from(
        new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength / Int16Array.BYTES_PER_ELEMENT)
      )
      .map((v, i, list) => {
        return Utils.convertInt16ToFloat32(
          v - coef * ( list[i - 1] || 0 )
        )
      })
    return samples
  }

  extractFeatures(audioFrame) {
    var phasors = FFT.fft(audioFrame)
    var mags = FFT.util.fftMag(phasors)
    return this._extractor(mags).slice(1)
  }
}
