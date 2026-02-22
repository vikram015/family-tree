const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const shouldAnalyze = process.env.ANALYZE === "true";

module.exports = {
  webpack: {
    plugins: {
      add: shouldAnalyze
        ? [
            new BundleAnalyzerPlugin({
              analyzerMode: "static",
              openAnalyzer: false,
              reportFilename: "bundle-report.html",
            }),
          ]
        : [],
    },
  },
};
