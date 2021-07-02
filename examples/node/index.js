import * as readline from "readline";
import * as process from "process";
import { PassThrough } from "stream";
import { spawn } from "child_process";
import VADBuilder, { VADMode, VADEvent } from "@ozymandiasthegreat/vad";
import DetectorBuilder from "@ozymandiasthegreat/wakeword-zero";


const SAMPLE_RATE = 16000;
const SAMPLES     = [];
let STARTED       = false;
let PRINTING      = -1;
let FINISHED      = false;
let DISCARD       = 5;


const VAD        = await VADBuilder();
const vad        = new VAD(VADMode.VERY_AGGRESSIVE, SAMPLE_RATE);


const rli     = readline.createInterface(process.stdin, process.stdout);
const keyword = await new Promise((resolve) => rli.question("What is my name?", resolve));
rli.close();


const stream   = new PassThrough();
const recorder = spawn("arecord", ["-c", "1", "-r", `${SAMPLE_RATE}`, "-f", "S16_LE"]);
recorder.stdout.pipe(stream);


const detector = await DetectorBuilder({
	bitLength: 16,
	channels: 1,
	sampleRate: SAMPLE_RATE,
	vadMode: VADMode.VERY_AGGRESSIVE,
});
detector.on("ready", () => console.log("LISTENING"));
detector.on("data", (event) => console.log(event));
detector.on("error", (err) => console.error(err));


stream.on("data", async (data) => {
	if (!FINISHED) {
		const i = SAMPLES.length - 1;
		if (PRINTING === i && i + 2 <= 3) {
			PRINTING++;
			console.log(`Please say my name ${i + 2}/3`);
		}
		const voice = vad.processBuffer(new Int16Array(data.buffer));
		if (DISCARD) {
			DISCARD--;
			return;
		}
		if (voice === VADEvent.VOICE) {
			if (!STARTED) {
				STARTED = true;
				SAMPLES.push(data);
			} else {
				SAMPLES[i] = Buffer.concat([SAMPLES[i], data]);
			}
		} else {
			STARTED    = false;
			if (SAMPLES.length === 3) {
				FINISHED = true;
				await detector.addKeyword(keyword, SAMPLES);
				console.log("DONE!");
			}
		}
	} else {
		detector.process(data);
	}
});
