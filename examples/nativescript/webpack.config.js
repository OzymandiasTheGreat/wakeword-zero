const webpack = require("@nativescript/webpack");


module.exports = (env) => {
	webpack.init(env);

	// Learn how to customize:
	// https://docs.nativescript.org/webpack

	webpack.chainWebpack((config) => {
		config.resolve.aliasFields.prepend("browser");
		config.resolve.alias.set("fs", false);
		config.resolve.alias.set("os", false);
		config.resolve.alias.set("path", false);
		config.resolve.alias.set("util", false);
		config.resolve.alias.set("stream", "stream-browserify");
	});


	return webpack.resolveConfig();
};
