import type { Transform } from "stream";


export interface BlockStreamOptions {
	size?: number;
	zeroPadding?: boolean;
}


export default class BlockStream extends Transform {
	constructor(options?: BlockStreamOptions);
	constructor(size: number, options?: BlockStreamOptions);
}
