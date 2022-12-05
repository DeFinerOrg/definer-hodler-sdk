// webpack.config.js
var webpack = require("webpack");
var path = require("path");
module.exports = {
  mode: "production",
  optimization: {
    usedExports: true,
  },
  entry: {
    entry: __dirname + "/index.js",
  },
  output: {
    filename: "definer-hodler.min.js",
    path: path.resolve(__dirname, "dist"),
    library: {
      name: "definerHodler",
      type: "umd",
    },
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            exclude: [
              // \\ for Windows, / for macOS and Linux
              /node_modules\\core-js/,
              /node_modules\\webpack\\buildin/,
            ],
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
};
