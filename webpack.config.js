const webpack = require("webpack");
const path = require("path");


const main = {
	entry: "./index.js",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.wasm$/,
				type: "asset/resource",
			},
		],
	},
};


const node = {
	target: "node",
	output: {
		library: {
			name: "WakeWord",
			type: "commonjs",
		},
		filename: "main.node.js",
		path: path.resolve(__dirname, "dist"),
	},
	externals: [
		"block-stream2",
	],
	resolve: {
		fallback: {
			"node-mfcc": path.resolve("./node_modules/node-mfcc/src/mfcc.js"),
		},
	},
}


const browser = {
	target: "web",
	output: {
		library: {
			name: "WakeWord",
			type: "umd",
		},
		filename: "main.js",
		path: path.resolve(__dirname, "dist"),
	},
	resolve: {
		alias: {
			fs: false,
			os: false,
			path: false,
		},
		fallback: {
			stream: "stream-browserify",
			"node-mfcc": path.resolve("./node_modules/node-mfcc/src/mfcc.js"),
		},
	},
	plugins: [
		new webpack.ProvidePlugin({
			process: "process/browser.js",
			Buffer: ["buffer", "Buffer"],
		}),
	],
}


module.exports = [{...main, ...browser}, {...main, ...node}];
