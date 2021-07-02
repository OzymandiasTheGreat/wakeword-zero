function createArray<T>(length: number, value: T): T[] {
	if (typeof value === "undefined") {
		throw new Error("Invalid value: expected a value to be provided");
	}

	return new Array(length).fill(value);
}


export function create<T>(m: number, n: number, value: T): T[][] {
	const matrix = [];
	for (let rowIndex = 0; rowIndex < m; rowIndex++) {
		matrix.push(createArray(n, value));
	}
	return matrix;
}
