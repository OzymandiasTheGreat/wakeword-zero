import { DTW } from "./dtw/dtw.js";
import { FeatureComparator } from "./comparator.js";


export interface KeywordOptions {
	disableAveraging: boolean;
	threshold: number;
}


export class WakewordKeyword {
	private options: KeywordOptions;
	private averagedTemplate: number[][] = [];
	private _templates: number[][][] = [];
	keyword: string;
	enabled: boolean;

	constructor(keyword: string, options: KeywordOptions) {
		this.keyword = keyword;
		this.options = options;
		this.enabled = true;
	}

	get disableAveraging(): boolean {
		return this.options?.disableAveraging || false;
	}

	get threshold(): number {
		return this.options?.threshold || 0;
	}

	get templates(): number[][][] {
		return this.disableAveraging ? this._templates : [this.averagedTemplate];
	}

	private averageTemplates(): void {
		// According to Guoguo Chen (Kitt.ai) in this paper
		// http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.684.8586&rep=rep1&type=pdf
		// Averaging the templates using DTW does not seem to impact accuracy
		// And greatly reduce resource consumption
		// We choose the longest template as the origin
		// And average each template with the previous average
		this._templates.sort((a, b) => a.length - b.length);

		let origin = this._templates[0];

		for (let i = 1; i < this._templates.length; i++) {
			const frames = this._templates[i];
			const dtw = new DTW({ distanceFunction: FeatureComparator.calculateDistance });
			const score = dtw.compute(origin, frames)
			const avgs = origin.map((features) => {
				return features.map((feature) => {
					return [feature];
				});
			});
			dtw.path()?.forEach(([x, y]) => {
				frames[y].forEach((feature, index) => {
					avgs[x][index].push(feature);
				});
			});
			origin = avgs.map((frame) => {
				return frame.map((featureGroup) => {
					return featureGroup.reduce((result, value) => result + value, 0) / featureGroup.length;
				});
			});
		}
		this.averagedTemplate = origin;
	}

	addFeatures(features: number[][]): void {
		this._templates = [...this._templates, features];
		if (!this.disableAveraging) {
			this.averageTemplates();
		}
	}
}
