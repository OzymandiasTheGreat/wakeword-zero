import { Component, OnInit, NgZone } from "@angular/core"
import { check, request } from "@nativescript-community/perms";
import { KeywordResult } from "@ozymandiasthegreat/wakeword-zero";

import { WorkerMessage, SAMPLE_DIR } from "./shared";


@Component({
	selector: "ns-app",
	templateUrl: "./app.component.html",
})
export class AppComponent implements OnInit {
	private worker: Worker;
	isRecording: boolean;
	samples: string[];
	detected: boolean;

	constructor(private zone: NgZone) { }

	ngOnInit(): void {
		check("microphone").then(([status]) => {
			if (status === "authorized") {
				this.loadWorker();
			} else {
				request("microphone").then(([result]) => {
					if (result === "authorized") {
						this.loadWorker();
					}
				});
			}
		});
		this.reloadSamples();
	}

	loadWorker(): void {
		this.worker = new Worker("./listener.worker");
		this.worker.onmessage = async (event: MessageEvent) => {
			const message: WorkerMessage<KeywordResult> = event.data;
			switch (message.action) {
				case "recording":
					this.zone.run(() => this.isRecording = true);
					break;
				case "stopped":
					this.zone.run(() => {
						this.isRecording = false;
						this.reloadSamples();
					});
					break;
				case "ready":
					console.log("LISTENING");
					break;
				case "wakeword":
					this.zone.run(() => this.detected = true);
					setTimeout(() => {
						this.zone.run(() => this.detected = false);
					}, 2500);
					console.log(`Wakeword detected: ${message.payload.keyword} : ${message.payload.score}`);
					break;
				case "error":
					console.log("DETECTOR ERROR", message.payload);
					break
				case "removed":
					console.log("Wakeword removed");
					this.zone.run(() => this.reloadSamples());
					break;
			}
		};
	}

	reloadSamples(): void {
		this.samples = SAMPLE_DIR.getEntitiesSync().map((e) => e.name);
	}

	start(): void {
		this.worker?.postMessage({ action: "start" } as WorkerMessage<void>);
	}

	stop(): void {
		this.worker?.postMessage({ action: "stop" } as WorkerMessage<void>);
	}

	add(): void {
		this.worker?.postMessage({ action: "add" } as WorkerMessage<void>);
	}

	cancel(): void {
		this.worker?.postMessage({ action: "cancel" } as WorkerMessage<void>);
	}

	remove(): void {
		this.worker?.postMessage({ action: "remove" } as WorkerMessage<void>);
	}

	play(filename: string): void {
		this.worker?.postMessage({ action: "play", payload: filename } as WorkerMessage<string>);
	}
}
