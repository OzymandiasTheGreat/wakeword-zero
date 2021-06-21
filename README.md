# wakeword-zero

Based on [Machine Learning on Voice: a gentle introduction with Snips Personal Wake Word Detector](https://medium.com/snips-ai/machine-learning-on-voice-a-gentle-introduction-with-snips-personal-wake-word-detector-133bd6fb568e)

Ported from [node-personal-wakeword](https://github.com/mathquis/node-personal-wakeword)
by Mathieu Quisefit

## Installation

```bash
npm install @ozymandiasthegreat/wakeword-zero
```

## Usage

```javascript
import { DetectorBuilder } from "@ozymandiasthegreat/wakeword-zero";

const Detector = await DetectorBuilder();
const detector = new Detector({
  /*
  sampleRate: 16000,
  bitLength: 16,
  frameShiftMS: 10.0,
  frameLengthMS: 30.0, // Must be a multiple of frameShiftMS
  vad: true, // Use VAD detection
  vadMode: WakewordDetector.VadMode.AGGRESSIVE, // See node-vad modes
  vadDebounceTime: 500,
  band: 5, // DTW window width
  ref: 0.22, // See Snips paper for explanation about this parameter
  preEmphasisCoefficient: 0.97, // Pre-emphasis ratio
  */
  threshold: 0.5 // Default value
})

// *****

// KEYWORD MANAGEMENT

// Add a new keyword using multiple "templates"
await detector.addKeyword('alexa', [
  // WAV templates (trimmed with no noise!)
  './keywords/alexa1.wav',
  './keywords/alexa2.wav',
  './keywords/alexa3.wav'
], {
  // Options
  disableAveraging: true, // Disabled by default, disable templates averaging (note that resources consumption will increase)
  threshold: 0.52 // Per keyword threshold
})

// Keywords can be enabled/disabled at runtime
detector.disableKeyword('alexa')
detector.enableKeyword('alexa')

// *****

// EVENTS

// The detector will emit a "ready" event when its internal audio frame buffer is filled
detector.on('ready', () => {
  console.log('listening...')
})

// The detector will emit an "error" event when it encounters an error (VAD, feature extraction, etc.)
detector.on('error', err => {
  console.error(err.stack)
})

// The detector will emit a "data" event when it has detected a keyword in the audio stream
/* The event payload is:
  {
    "keyword"     : "alexa", // The detected keyword
    "score"       : 0.56878768987, // The detection score
    "threshold"   : 0.5, // The detection threshold used (global or keyword)
    "frames"      : 89, // The number of audio frames used in the detection
    "timestamp"   : 1592574404789, // The detection timestamp (ms)
    "audioData"   : <Buffer> // The utterance audio data (can be written to a file for debugging)
  }
*/
detector.on('data', ({keyword, score, threshold, timestamp}) => {
  console.log(`Detected "${keyword}" with score ${score} / ${threshold}`)
})

// *****

// Create readable stream and
// Pipe to wakeword detector
stream.pipe(detector)

// Or push audio data in chunks
detector.write(chunk)
```

For a complete example check out the docs folder.
