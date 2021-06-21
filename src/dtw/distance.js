export default function euclideanDistance(x, y) {
  const difference = x - y
  const euclideanDistance = Math.sqrt(difference * difference)
  return euclideanDistance
}
