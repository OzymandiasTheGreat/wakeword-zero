import webpack from "webpack";
import CopyPlugin from "copy-webpack-plugin";
import * as path from "path";


const __dirname = new URL("./", import.meta.url).pathname;


const config = {
	entry: "./lib/index.js",
	mode: "development",
	target: "web",
	output: {
		library: {
			name: "WakeWordZero",
			type: "umd",
		},
		filename: "index.js",
		path: path.resolve(__dirname, "dist"),
		publicPath: "auto",
	},
	resolve: {
		alias: {
			fs: false,
			os: false,
			path: false,
			util: false,
		},
		fallback: {
			stream: "stream-browserify",
		},
	},
	plugins: [
		new webpack.ProvidePlugin({
			process: path.resolve("./node_modules/process/browser.js"),
			Buffer: [path.resolve("./node_modules/buffer"), "Buffer"],
		}),
		new CopyPlugin({
			patterns: [
				{
					from: "node_modules/**/*.wasm",
					to: "[name][ext]",
				},
			],
		}),
	],
}


export default config;
