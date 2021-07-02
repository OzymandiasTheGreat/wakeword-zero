import * as Matrix from "./matrix.js";
import { euclideanDistance } from "./distance.js";


export interface DTWOptions {
	distanceFunction?: (x: any, y: any) => number;
}


export class DTW {
	private state: {
		m: number,
		n: number,
		similarity: number,
		distanceCostMatrix: any[][] | null,
	};
	private distanceFunction: (x: any, y: any) => number;

	constructor(options: DTWOptions) {
		this.state = { distanceCostMatrix: null, m: 0, n: 0, similarity: 0 };
		this.distanceFunction = options.distanceFunction || euclideanDistance;
	}

	private computeOptimalPath(s: number[][], t: number[][]): number {
		this.state.m = s.length;
		this.state.n = t.length;
		let distanceCostMatrix = Matrix.create(this.state.m, this.state.n, Number.POSITIVE_INFINITY);

		distanceCostMatrix[0][0] = this.distanceFunction(s[0], t[0]);

		for (let rowIndex = 1; rowIndex < this.state.m; rowIndex++) {
			const cost = this.distanceFunction(s[rowIndex], t[0]);
			distanceCostMatrix[rowIndex][0] = cost + distanceCostMatrix[rowIndex - 1][0];
		}

		for (let columnIndex = 1; columnIndex < this.state.n; columnIndex++) {
			const cost = this.distanceFunction(s[0], t[columnIndex]);
			distanceCostMatrix[0][columnIndex] = cost + distanceCostMatrix[0][columnIndex - 1];
		}

		for (let rowIndex = 1; rowIndex < this.state.m; rowIndex++) {
			for (let columnIndex = 1; columnIndex < this.state.n; columnIndex++) {
				const cost = this.distanceFunction(s[rowIndex], t[columnIndex]);
				distanceCostMatrix[rowIndex][columnIndex] =
					cost + Math.min(
						distanceCostMatrix[rowIndex - 1][columnIndex],
						distanceCostMatrix[rowIndex][columnIndex - 1],
						distanceCostMatrix[rowIndex - 1][columnIndex - 1],
					);
			}
		}

		this.state.distanceCostMatrix = distanceCostMatrix;
		this.state.similarity = distanceCostMatrix[this.state.m - 1][this.state.n - 1];
		return this.state.similarity;
	}

	private computeOptimalPathWithWindow(s: number[][], t: number[][], w: number): number {
		this.state.m = s.length;
		this.state.n = t.length;
		const window = Math.max(w, Math.abs(s.length - t.length));
		let distanceCostMatrix = Matrix.create(this.state.m + 1, this.state.n + 1, Number.POSITIVE_INFINITY);
		distanceCostMatrix[0][0] = 0;

		for (let rowIndex = 1; rowIndex <= this.state.m; rowIndex++) {
			for (let columnIndex = Math.max(1, rowIndex - window); columnIndex <= Math.min(this.state.n, rowIndex + window); columnIndex++) {
				const cost = this.distanceFunction(s[rowIndex - 1], t[columnIndex - 1]);
				distanceCostMatrix[rowIndex][columnIndex] =
					cost + Math.min(
						distanceCostMatrix[rowIndex - 1][columnIndex],
						distanceCostMatrix[rowIndex][columnIndex - 1],
						distanceCostMatrix[rowIndex - 1][columnIndex - 1],
					);
			}
		}

		distanceCostMatrix.shift();
		distanceCostMatrix = distanceCostMatrix.map((row) => row.slice(1, row.length));
		this.state.distanceCostMatrix = distanceCostMatrix;
		this.state.similarity = distanceCostMatrix[this.state.m - 1][this.state.n - 1];
		return this.state.similarity;
	}

	private retrieveOptimalPath(): number[][] {
		let rowIndex = this.state.m - 1;
		let columnIndex = this.state.n - 1;
		const path = [[rowIndex, columnIndex]];
		const epsilon = 1e-14;
		while ((rowIndex > 0) || (columnIndex > 0)) {
			if ((rowIndex > 0) && (columnIndex > 0)) {
				const min = Math.min(
					this.state.distanceCostMatrix![rowIndex - 1][columnIndex],
					this.state.distanceCostMatrix![rowIndex][columnIndex - 1],
					this.state.distanceCostMatrix![rowIndex - 1][columnIndex - 1],
				);
				if (min === this.state.distanceCostMatrix![rowIndex - 1][columnIndex - 1]) {
					rowIndex--;
					columnIndex--;
				} else if (min === this.state.distanceCostMatrix![rowIndex - 1][columnIndex]) {
					rowIndex--;
				} else if (min === this.state.distanceCostMatrix![rowIndex][columnIndex - 1]) {
					columnIndex--;
				}
			} else if ((rowIndex > 0) && (columnIndex === 0)) {
				rowIndex--;
			} else if ((rowIndex === 0) && (columnIndex > 0)) {
				columnIndex--;
			}
			path.push([rowIndex, columnIndex]);
		}
		return path.reverse();
	}

	compute(firstSequence: number[][], secondSequence: number[][], window?: number): number {
		let cost = Number.POSITIVE_INFINITY;
		if (typeof window === "undefined") {
			cost = this.computeOptimalPath(firstSequence, secondSequence);
		} else {
			cost = this.computeOptimalPathWithWindow(firstSequence, secondSequence, window);
		}
		return cost;
	}

	path(): number[][] | null {
		let path = null;
		if (this.state.distanceCostMatrix) {
			path = this.retrieveOptimalPath();
		}
		return path;
	}
}
