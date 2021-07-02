const webpack = require("webpack");
const path = require("path");


const ns = {
	output: {
		library: {
			name: "WakeWord",
			type: "umd",
		},
		filename: "main.ns.js",
		path: path.resolve(__dirname, "dist"),
		globalObject: "this",
		publicPath: "file:///",
		chunkLoading: false,
	},
}


const web = {
	output: {
		library: {
			name: "WakeWord",
			type: "umd",
		},
		filename: "main.js",
		path: path.resolve(__dirname, "dist"),
		publicPath: "auto",
	},
}


const main = {
	entry: "./index.js",
	mode: "development",
	target: "es2015",
	module: {
		rules: [
			{
				test: /\.wasm$/,
				type: "asset/resource",
			},
		],
	},
	externals: [
		"@nativescript/core",
	],
	resolve: {
		alias: {
			fs: false,
			os: false,
			path: false,
			util: false,
		},
		fallback: {
			stream: "stream-browserify",
			"node-mfcc": path.resolve("./node_modules/node-mfcc/src/mfcc.js"),
		},
	},
	plugins: [
		new webpack.ProvidePlugin({
			process: path.resolve("./node_modules/process/browser.js"),
			Buffer: [path.resolve("./node_modules/buffer"), "Buffer"],
		}),
	],
}


module.exports = [{...main, ...ns}, {...main, ...web}];
