export interface PCMFormat {
	channels: number;
	sampleRate: number;
	interleaved: boolean;
	float: boolean;
	signed: boolean;
	bitDepth: number;
	byteOrder: "LE" | "BE";
	max: number;
	min: number;
	samplesPerFrame: number;
	id: string;
}


export const defaults: PCMFormat = {
	channels: 2,
	sampleRate: 44100,
	interleaved: true,
	float: false,
	signed: true,
	bitDepth: 16,
	byteOrder: "LE",
	max: 32767,
	min: -32768,
	samplesPerFrame: 1024,
	id: "S_16_LE_2_44100_I"
};


export function normalize(format: Partial<PCMFormat>): PCMFormat;
export function format(audioBuffer: AudioBuffer): PCMFormat;
export function equal(a: PCMFormat, b: PCMFormat): boolean;
export function toAudioBuffer(buffer: Buffer | ArrayBuffer, format: PCMFormat): AudioBuffer;
export function toArrayBuffer(audioBuffer: AudioBuffer, format: PCMFormat): ArrayBuffer;
export function convert(buffer: ArrayBuffer, fromFormat: PCMFormat, toFormat: PCMFormat): ArrayBuffer;
