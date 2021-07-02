import { Transform } from "stream";
import Block from "block-stream2";
import MFCCInit, { MFCC } from "@ozymandiasthegreat/mfcc";
import { FRAME_SIZE } from "@ozymandiasthegreat/vad";
import * as Utils from "./utils.js";
import type { DetectorOptions } from "./index.js";


export interface ExtractorOptions extends DetectorOptions {
	samplesPerFrame: number;
	samplesPerShift: number;
}


class FeatureExtractor extends Transform {
	private options: ExtractorOptions;
	private samples: number[] = [];
	private extractor: MFCC;
	private block: Block;
	full: boolean;

	constructor(mfcc: MFCC, options: ExtractorOptions) {
		super({ readableObjectMode: true });
		this.options   = options || {};
		this.full      = false;
		this.extractor = mfcc;

		this.block     = new Block(this.samplesPerShift * this.sampleRate / 8000);
		this.block.on("drain", () => {
			this.full = false;
		}).on("data", (audioBuffer: ArrayBufferView) => {
			const newSamples = this.preEmphasis(audioBuffer);
			if (this.samples.length >= this.samplesPerFrame) {
				this.samples = [...this.samples.slice(newSamples.length), ...newSamples];
				try {
					const features = this.extractFeatures(this.samples.slice(0, this.samplesPerFrame));
					this.push({ features, audioBuffer });
				} catch (err) {
					this.error(err);
				}
			} else {
				this.samples = [...this.samples, ...newSamples];
			}
		}).on("error", (err) => this.error(err));
	}

	get sampleRate(): number {
		return this.options.sampleRate || 16000;
	}

	get samplesPerFrame(): number {
		return FRAME_SIZE[this.sampleRate][FRAME_SIZE[this.sampleRate].length - 1];
	}

	get samplesPerShift(): number {
		return Math.round(this.samplesPerFrame / 3);
	}

	get preEmphasisCoefficient(): number {
		return this.options.preEmphasisCoefficient || 0.97;
	}

	_write(audioData: ArrayBufferView, enc: BufferEncoding, done: any): void {
		const result = this.block.write(audioData, enc, done);
		if (!result) {
			this.full = true;
		}
	}

	error(err: Error): void {
		this.emit("error", err);
	}

	destroy(err: Error): void {
		this.block.removeAllListeners();
		this.block.destroy();
		this.extractor.destroy();
		super.destroy(err);
	}

	preEmphasis(audioBuffer: ArrayBufferView): number[] {
		const coef = this.preEmphasisCoefficient;
		const samples = Array.from(
			new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength / Int16Array.BYTES_PER_ELEMENT)
		).map((v, i, list) => {
			return Utils.convertInt16ToFloat32(v - coef * ( list[i - 1] || 0 ));
		});
		return samples;
	}

	extractFeatures(audioFrame: number[]): Float64Array {
		const mfcc = this.extractor.getMFCC(audioFrame).slice(1);
		return mfcc;
	}
}


export async function createExtractor(options: ExtractorOptions): Promise<FeatureExtractor> {
	const sampleRate = options.sampleRate || 16000;
	const samplesPerFrame = FRAME_SIZE[sampleRate][FRAME_SIZE[sampleRate].length - 1];

	const mfcc = await MFCCInit({ frameSize: samplesPerFrame, sampleRate });
	return new FeatureExtractor(mfcc, options);
}


export type { FeatureExtractor };
