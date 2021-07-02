import type { VAD, VADMode } from "@ozymandiasthegreat/vad";
import type { WakewordDetector } from "./detector.js";
import WakewordDetectorBuilder from "./detector.js";


export type DetectorOptions = {
	bandSize?: number,
	ref?: number,
	channels?: number,
	bitLength?: 8 | 16 | 32,
	sampleRate?: 8000 | 16000 | 32000 | 48000,
	frameLengthMS: 10 | 20 | 30,
	frameShiftMS: number,
	threshold?: number,
	vad?: boolean | VAD,
	vadMode?: VADMode,
	vadDebounceTime?: number,
	preEmphasisCoefficient?: number,
}


export { WakewordDetectorBuilder as default, WakewordDetector, VADMode };
