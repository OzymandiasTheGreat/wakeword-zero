export function euclideanDistance(x: number, y: number): number {
	const difference = x - y;
	const euclideanDistance = Math.sqrt(difference * difference);
	return euclideanDistance;
}
