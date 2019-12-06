const electronPublicApi = ['electron'];

const nodeModules = {};
electronPublicApi.forEach((apiString) => {
  nodeModules[apiString] = `commonjs ${apiString}`;
});

module.exports = {
  entry: ['babel-polyfill', './app/src/main.js'],
  target: 'node',
  output: {
    filename: 'main.js',
  },
  node: {
    global: false,
    __dirname: false,
  },
  externals: nodeModules,
  module: {
    rules: [{ test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' }],
  },
  devtool: 'source-map',
  mode: 'none',
};
