import { knownFolders } from "@nativescript/core";


export interface WorkerMessage<T> {
	action: string;
	payload: T;
}


export const SAMPLE_DIR = knownFolders.documents().getFolder("SAMPLES");
