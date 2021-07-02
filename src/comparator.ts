import { DTW } from "./dtw/dtw.js";
import * as Utils from "./utils.js";
import type { DetectorOptions } from "./index.js";


export interface ComparatorOptions extends DetectorOptions { }


export class FeatureComparator {
	private options: ComparatorOptions;
	private dtw: DTW;

	constructor(options: ComparatorOptions) {
		this.options = options || {};
		this.dtw = new DTW({ distanceFunction: FeatureComparator.calculateDistance });
	}

	static calculateDistance(ax: number[], bx: number[]): number {
		return 1 - Utils.cosineSimilarity(ax, bx);
	}

	get bandSize(): number {
		return this.options.bandSize || 5;
	}

	get ref(): number {
		return this.options.ref || 0.22;
	}

	computeProbability(cost: number): number {
		const probability = 1 / (1 + Math.exp((cost - this.ref) / this.ref));
		return probability;
	}

	compare(a: number[][], b: number[][]): number {
		const cost = this.dtw.compute(a, b, this.bandSize);
		const normalizedCost = cost / (a.length + b.length);
		const probability = this.computeProbability(normalizedCost);
		return probability;
	}

	destroy(): void { }
}
