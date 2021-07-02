import * as pcm from "pcm-util";


export function convertAudio(buffer: ArrayBufferView, formatFrom: Partial<pcm.PCMFormat>, formatTo: Partial<pcm.PCMFormat>): ArrayBuffer {
	const fFrom = pcm.normalize(formatFrom);
	const fTo   = pcm.normalize(formatTo);
	return pcm.convert(buffer.buffer, fFrom, fTo);
}


export function convertInt16ToFloat32(n: number): number {
	const v = n < 0 ? n / 32768 : n / 32767;
	return Math.max(-1, Math.min(1, v));
}


export function cosineSimilarity(vectorA: number[] = [], vectorB: number[] = []): number {
	const dimensionality = Math.min(vectorA.length, vectorB.length);
	let dotAB = 0;
	let dotA = 0;
	let dotB = 0;
	let dimension = 0;

	while (dimension < dimensionality) {
		const componentA = vectorA[dimension];
		const componentB = vectorB[dimension];
		dotAB += componentA * componentB;
		dotA += componentA * componentA;
		dotB += componentB * componentB;
		dimension += 1;
	}

	const magnitude = Math.sqrt(dotA * dotB);
	return magnitude === 0 ? 0 : dotAB / magnitude;
}
