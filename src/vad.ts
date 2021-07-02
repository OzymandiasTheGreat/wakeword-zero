import VADBuilder, { VADMode, VADEvent, VAD } from "@ozymandiasthegreat/vad";
import type { DetectorOptions } from "./index.js";


export interface VoiceActivityFilterOptions extends DetectorOptions {
	debounce: number;
}


export class VoiceActivityFilter {
	private options: Partial<VoiceActivityFilterOptions>;
	private debouncing: number;
	private vad: VAD | null;

	constructor(vad: VAD, options?: Partial<VoiceActivityFilterOptions>) {
		this.options = options || {};
		this.debouncing = this.debounce;
		this.vad = vad;
	}

	get sampleRate(): number {
		return this.options.sampleRate || 16000;
	}

	get vadMode(): VADMode {
		return this.options.vadMode || VADMode.NORMAL;
	}

	get vadDebounceTime(): number {
		return this.options.vadDebounceTime || 1000;
	}

	get debounce(): number {
		return this.options.debounce || 20;
	}

	processAudio(audioBuffer: Uint8Array) {
		if (this.debouncing > 0) {
			this.debouncing--;
			return true;
		}

		const result = this.vad?.processBuffer(new Int16Array(audioBuffer.buffer));
		if (result === VADEvent.VOICE) {
			this.debouncing = this.debounce;
			return true;
		}
		return false;
	}

	destroy(err: Error) {
		this.vad?.destroy();
		this.vad = null;
	}
}


export default async function(options: Partial<VoiceActivityFilterOptions>, vad?: VAD): Promise<VoiceActivityFilter> {
	if (vad) {
		return new VoiceActivityFilter(vad, options);
	}
	const VAD = await VADBuilder();
	return new VoiceActivityFilter(
		new VAD(options.vadMode || VADMode.NORMAL, options.sampleRate || 16000),
		options,
	);
}
