// global scope and polyfills are not available in workers, load 'em here
import "@nativescript/core/globals";
import process from "process/browser";
import { Buffer } from "buffer";
(<any> global).process = process;
(<any> global).Buffer  = Buffer;

import { File } from "@nativescript/core";
import VADBuilder, { VAD, VADMode, VADEvent } from "@ozymandiasthegreat/vad";
import DetectorBuilder, { WakewordDetector, KeywordResult } from "@ozymandiasthegreat/wakeword-zero";

import { WorkerMessage, SAMPLE_DIR } from "./shared";


const SAMPLE_RATE = 16000;
const DISCARD = 5;  // Frames to discard for VAD. First few frames are noise and trigger VAD
let BUFFER_IN: Array<number>;
let BUFFER_IN_SIZE = -1;
let BUFFER_OUT: Array<number>;
let BUFFER_OUT_SIZE = -1;
let RECORDER: android.media.AudioRecord;
let PLAYER: android.media.AudioTrack;
let VADInstance: VAD;
let DETECTOR: WakewordDetector;
let LISTENING = false;


async function* generator(): AsyncGenerator<Uint8Array> {
	while (LISTENING) {
		const buffer: Uint8Array = await new Promise((resolve) => {
			setTimeout(() => {
				RECORDER.read(BUFFER_IN, 0, BUFFER_IN_SIZE);
				const buffer = Uint8Array.from(BUFFER_IN);
				resolve(buffer);
			}, 1);  // setImmediate is not available, so use minimal timeout
		});
		yield buffer;
	}
}


(async function() {
	const VAD = await VADBuilder();
	VADInstance = new VAD(VADMode.VERY_AGGRESSIVE, SAMPLE_RATE);
	BUFFER_IN_SIZE = VADInstance.getMinBufferSize(android.media.AudioRecord.getMinBufferSize(
		SAMPLE_RATE,
		android.media.AudioFormat.CHANNEL_IN_MONO,
		android.media.AudioFormat.ENCODING_PCM_16BIT,
	));
	RECORDER = new android.media.AudioRecord(
		android.media.MediaRecorder.AudioSource.VOICE_RECOGNITION,
		SAMPLE_RATE,
		android.media.AudioFormat.CHANNEL_IN_MONO,
		android.media.AudioFormat.ENCODING_PCM_16BIT,
		BUFFER_IN_SIZE,
	);
	BUFFER_IN = Array.create("byte", BUFFER_IN_SIZE);
	BUFFER_OUT_SIZE = android.media.AudioTrack.getMinBufferSize(
		SAMPLE_RATE,
		android.media.AudioFormat.CHANNEL_OUT_MONO,
		android.media.AudioFormat.ENCODING_PCM_16BIT,
	);
	PLAYER = new android.media.AudioTrack(
		android.media.AudioManager.STREAM_MUSIC,
		SAMPLE_RATE,
		android.media.AudioFormat.CHANNEL_OUT_MONO,
		android.media.AudioFormat.ENCODING_PCM_16BIT,
		BUFFER_OUT_SIZE,
		android.media.AudioTrack.MODE_STREAM,
	);
	BUFFER_OUT = Array.create("byte", BUFFER_OUT_SIZE);
	DETECTOR = await DetectorBuilder({ vadMode: VADMode.VERY_AGGRESSIVE });

	// Casting self to <any> because postMessage types are broken.
	// DO NOT put more than one argument to postMessage
	DETECTOR.on("ready", () => (<any> self).postMessage({ action: "ready" } as WorkerMessage<void>));
	DETECTOR.on("data", (event: KeywordResult) => {
		delete event.audioData;
		(<any> self).postMessage({ action: "wakeword", payload: event } as WorkerMessage<KeywordResult>);
	});
	DETECTOR.on("error", (err) => (<any> self).postMessage({ action: "error", payload: err } as WorkerMessage<Error>));

	const templates = (await SAMPLE_DIR.getEntities()).map((f: File) => Uint8Array.from(f.readSync()));
	if (templates.length) {
		DETECTOR.addKeyword("sample", templates);
	}
})();


self.onmessage = async (event: MessageEvent) => {
	const message: WorkerMessage<any> = event.data;
	switch (message.action) {
		case "start":
			if (!LISTENING && RECORDER) {
				LISTENING = true;
				RECORDER.startRecording();
				for await (const buffer of generator()) {
					DETECTOR.process(buffer);
				}
			}
			break;
		case "stop":
			RECORDER?.stop();
			LISTENING = false;
			break;
		case "add":
			if (!LISTENING && RECORDER) {
				let discard =  DISCARD;
				let recording = 0;
				let buffers = [];
				LISTENING = true;
				RECORDER.startRecording();
				for await (const buffer of generator()) {
					(<any> self).postMessage({ action: "recording" } as WorkerMessage<void>);
					const result = VADInstance.processBuffer(new Int16Array(buffer.buffer));
					if (discard) {
						discard--;
						continue;
					}
					if (result === VADEvent.VOICE) {
						recording++;
						buffers.push(buffer);
					} else if (recording >= 5) {
						discard = DISCARD;
						recording = 0;
						RECORDER.stop();
						LISTENING = false;
						const output_size = buffers.length * BUFFER_IN_SIZE;
						const output = Array.create("byte", output_size);
						const template = new Uint8Array(output_size);
						let offset = 0;
						buffers.forEach((buff: Uint8Array) => {
							buff.forEach((i) => {
								output[offset] = i;
								template[offset] = i;
								offset++;
							});
						});
						const number = (await SAMPLE_DIR.getEntities()).length + 1;
						const filename = `sample-${number}.raw`;
						SAMPLE_DIR.getFile(filename).write(output);
						DETECTOR?.addKeyword("sample", [template]);
						(<any> self).postMessage({ action: "stopped" } as WorkerMessage<void>);
					}
				}
			}
			break;
		case "cancel":
			RECORDER?.stop()
			LISTENING = false;
			(<any> self).postMessage({ action: "stopped" } as WorkerMessage<void>);
			break;
		case "remove":
			DETECTOR.removeKeyword("sample");
			(await SAMPLE_DIR.getEntities()).forEach((e) => e.remove());
			(<any> self).postMessage({ action: "removed" } as WorkerMessage<void>);
			break;
		case "play":
			const buffer = Uint8Array.from(await SAMPLE_DIR.getFile(message.payload).read());
			PLAYER.play();
			for (let i = 0; i < buffer.length; i += BUFFER_OUT_SIZE) {
				buffer.slice(i, i + BUFFER_OUT_SIZE).forEach((i, j) => BUFFER_OUT[j] = i);
				PLAYER.write(BUFFER_OUT, 0, BUFFER_OUT_SIZE);
			}
			PLAYER.stop();
			break;
	}
};
