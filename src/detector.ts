import { Transform, Readable } from "stream";
import { Buffer } from "buffer";
import * as pcm from "pcm-util";
import { VAD } from "@ozymandiasthegreat/vad";
import { createExtractor, FeatureExtractor } from "./extractor.js";
import { FeatureComparator } from "./comparator.js";
import { WakewordKeyword, KeywordOptions } from "./keyword.js";
import VoiceActivityFilterBuilder, { VoiceActivityFilter } from "./vad.js";
import type { DetectorOptions } from "./index.js";


interface KeywordResult {
	keyword: string | null;
	score: number;
	threshold: number;
	frames?: number;
	duration?: number;
}


export class WakewordDetector extends Transform {
	private options: DetectorOptions;
	private keywords: Map<string, WakewordKeyword>;
	private buffering: boolean;
	private full: boolean;
	private minFrames: number;
	private maxFrames: number;
	private comparator: FeatureComparator;
	private extractor: FeatureExtractor;
	private vad: VoiceActivityFilter;
	private frames: number[][] = [];
	private chunks: Uint8Array[] = [];
	private state: KeywordResult = { keyword: null, score: 0, threshold: this.threshold };

	constructor(options: DetectorOptions, voiceActivityFilter: VoiceActivityFilter) {
		super({ readableObjectMode: true });

		this.options   = options || {};
		this.keywords  = new Map();
		this.buffering = true;
		this.full      = false;
		this.minFrames = 9999;
		this.maxFrames = 0;

		this.comparator = new FeatureComparator(options);
		createExtractor({
			...options,
			sampleRate: <any> this.sampleRate,
			samplesPerFrame: this.samplesPerFrame,
			samplesPerShift: this.samplesPerShift,
		}).then((extractor) => {
			this.extractor = extractor;
			this.extractor.on("data", ({ features, audioBuffer }) => {
				this.processFeatures(features, audioBuffer);
			}).on("error", (err) => this.error(err)).on("drain", () => {
				this.full = false;
			});
		});
		this.vad = voiceActivityFilter;

		this.clearKeywords();
		this.reset();
	}

	get channels(): number {
		return this.options.channels || 1;
	}

	get bitLength(): number {
		return this.options.bitLength || 16;
	}

	get sampleRate(): number {
		return this.options.sampleRate || 16000;
	}

	get samplesPerFrame(): number {
		return this.sampleRate * this.frameLengthMS / 1000;
	}

	get samplesPerShift(): number {
		return this.sampleRate * this.frameShiftMS / 1000;
	}

	get frameLengthMS(): number {
		return this.options.frameLengthMS || 30.0;
	}

	get frameShiftMS(): number {
		return this.options.frameShiftMS || 10.0;
	}

	get threshold(): number {
		const threshold = parseFloat(<any> this.options?.threshold);
		if (isNaN(threshold)) {
			return 0.5;
		}
		return threshold;
	}

	get useVAD(): boolean {
		return typeof this.options.vad !== "undefined" ? !!this.options.vad : true;
	}

	get vadDebounceTime(): number {
		return this.options.vadDebounceTime || 500;
	}

	private normalizeFeatures(frames: number[][]): number[][] {
		const numFrames = frames.length;
		if (numFrames === 0) {
			return [];
		}

		const numFeatures = frames[0].length;
		const sum = new Array(numFeatures).fill(0);
		const normalizedFrames = new Array(numFrames);

		for (let i = 0; i < numFrames; i++) {
			normalizedFrames[i] = new Array(numFeatures);
			for (let j = 0; j < numFeatures; j++) {
				sum[j] += frames[i][j];
				normalizedFrames[i][j] = frames[i][j]
			}
		}
		for (let i = 0; i < numFrames; i++) {
			for (let j = 0; j < numFeatures; j++) {
				normalizedFrames[i][j] = normalizedFrames[i][j] - sum[j] / numFrames;
			}
		}
		return normalizedFrames;
	}

	private getBestKeyword(features: number[][]): KeywordResult {
		let result: KeywordResult = { keyword: null, score: 0, threshold: this.threshold };
		this.keywords.forEach((kw) => {
			if (!kw.enabled) {
				return;
			}
			const threshold = kw.threshold || this.threshold;
			const templates = kw.templates;
			templates.forEach((template, index) => {
				const frames = features.slice(Math.round(-1 * template.length));
				const score = this.comparator.compare(template, frames);
				if (score < threshold) {
					return;
				}
				if (score < result.score) {
					return;
				}
				result = {
					...result,
					keyword: kw.keyword,
					frames: template.length,
					threshold,
					score,
				};
			});
		});
		return result;
	}

	private runDetection(): void {
		const features = this.normalizeFeatures(this.frames);
		const result = this.getBestKeyword(features);
		if (result.keyword !== null) {
			if (result.keyword && result.keyword === this.state.keyword) {
				if (result.score < this.state.score) {
					const timestamp = Date.now();
					const audioData = Buffer.concat(this.chunks.slice(Math.round(-1.2 * <number> result.frames)));
					const payload = {
						...result,
						score: this.state.score,
						audioData,
						timestamp,
					};
					this.push(payload);
					this.reset();
					return;
				}
			}
		}
		this.state = result;
	}

	private processFeatures(features: number[], audioBuffer: Uint8Array): void {
		this.frames.push(features);
		this.chunks.push(audioBuffer);
		const numFrames = this.frames.length;
		if (numFrames >= this.minFrames) {
			if (this.buffering) {
				this.buffering = false;
				this.emit("ready");
			}
			this.runDetection();
		}
		if (numFrames >= this.maxFrames) {
			this.frames.shift();
			this.chunks.shift();
		}
	}

	async _transform(buffer: Uint8Array, enc: BufferEncoding, done: any): Promise<void> {
		if (this.keywords.size === 0) {
			done();
			return;
		}
		if (this.full) {
			done();
			return;
		}
		if (this.extractor.full) {
			done();
			return;
		}
		let isVoice = true;
		if (this.useVAD) {
			isVoice = this.vad.processAudio(buffer);
		}
		if (!isVoice) {
			done();
			return;
		}
		const result = this.extractor.write(buffer);
		if (!result) {
			this.full = true;
		}
		done();
	}

	destroy(err: Error): void {
		this.vad.destroy(err);
		this.extractor.removeAllListeners();
		this.extractor.destroy(err);
		this.comparator.destroy();
		this.clearKeywords();
		this.reset();
		super.destroy(err);
	}

	error(err: Error): void {
		this.emit("error", err);
	}

	reset(): void {
		this.frames    = [];
		this.chunks    = [];
		this.state     = { keyword: null, score: 0, threshold: this.threshold };
		this.buffering = true;
	}

	process(audioBuffer: Uint8Array, resampleFrom?: Partial<pcm.PCMFormat>): void {
		if (this.destroyed) {
			throw new Error("Unable to process audio buffer with destroyed stream");
		}
		if (resampleFrom) {
			const formatFrom = pcm.normalize(resampleFrom);
			const formatTo: pcm.PCMFormat = pcm.normalize({
				bitDepth: this.bitLength,
				channels: this.channels,
				float: false,
				sampleRate: this.sampleRate,
				signed: false,
			});
			audioBuffer = new Uint8Array(pcm.convert(audioBuffer.buffer, formatFrom, formatTo));
		}
		this.write(audioBuffer);
	}

	async extractFeatures(buffer: Buffer | ArrayBuffer): Promise<number[][]> {
		if (buffer instanceof ArrayBuffer) {
			buffer = new Uint8Array(buffer);
		}

		const reader = Readable.from(<Buffer> buffer);

		return new Promise(async (resolve, reject) => {
			const frames: number[][] = [];
			const extractor: FeatureExtractor = await createExtractor({
				...this.options,
				sampleRate: <any> this.sampleRate,
				samplesPerFrame: this.samplesPerFrame,
				samplesPerShift: this.samplesPerShift,
			});
			extractor.on("data", ({ features }) => {
				frames.push(features);
			});
			reader.on("error", (err) => {
				reject(err);
				extractor.destroy(err);
			}).on("end", () => {
				resolve(this.normalizeFeatures(frames));
				extractor.destroy(<any> null);
			});
			reader.pipe(extractor);
		});
	}

	async match(audioData: Uint8Array): Promise<KeywordResult | null> {
		const st = Date.now();
		const frames = await this.extractFeatures(audioData);
		const features = this.normalizeFeatures(frames);
		const result = this.getBestKeyword(features);
		if (result.keyword !== null) {
			const timestamp = Date.now();
			const et = timestamp;
			const match = {
				...result,
				score: result.score,
				duration: (et - st),
			};
			return match;
		}
		return null;
	}

	async addKeyword(keyword: string, templates: (Buffer | ArrayBuffer)[], options: KeywordOptions): Promise<void> {
		if (this.destroyed) {
			throw new Error("Unable to add keyword");
		}
		let kw = this.keywords.get(keyword);
		if (!kw) {
			kw = new WakewordKeyword(keyword, options);
			this.keywords.set(keyword, kw);
		}
		await Promise.all(templates.map(async (template) => {
			const features = await this.extractFeatures(template);
			this.minFrames = Math.min(this.minFrames, features.length);
			this.maxFrames = Math.max(this.maxFrames, features.length);
			kw?.addFeatures(features);
		}));
	}

	removeKeyword(keyword: string): void {
		if (this.destroyed) {
			throw new Error("Unable to remove keyword");
		}
		this.keywords.delete(keyword);
	}

	clearKeywords(): void {
		this.keywords = new Map();
	}

	enableKeyword(keyword: string): void {
		if (this.destroyed) {
			throw new Error("Unable to enable keyword");
		}
		const kw = this.keywords.get(keyword);
		if (!kw) {
			throw new Error(`Unknown keyword "${keyword}"`);
		}
		kw.enabled = true;
	}

	disableKeyword(keyword: string): void {
		if (this.destroyed) {
			throw new Error("Unable to disable keyword");
		}
		const kw = this.keywords.get(keyword);
		if (!kw) {
			throw new Error(`Unknown keyword "${keyword}"`);
		}
		kw.enabled = false;
	}
}


export default async function(options: DetectorOptions, vad?: VAD) {
	const VoiceActivityFilter = await VoiceActivityFilterBuilder({
		sampleRate: options.sampleRate || 16000,
		vadDebounceTime: options.vadDebounceTime || 500,
	}, vad);

	return new WakewordDetector(options, VoiceActivityFilter);
}
