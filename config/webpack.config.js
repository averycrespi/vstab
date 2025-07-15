const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

const commonConfig = {
  mode: isDevelopment ? 'development' : 'production',
  devtool: isDevelopment ? 'source-map' : false,
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@shared': path.resolve(__dirname, '../src/shared'),
      '@main': path.resolve(__dirname, '../src/main'),
      '@renderer': path.resolve(__dirname, '../src/renderer'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                config: path.resolve(__dirname, 'postcss.config.js'),
              },
            },
          },
        ],
      },
    ],
  },
};

const mainConfig = {
  ...commonConfig,
  target: 'electron-main',
  entry: path.resolve(__dirname, '../src/main/index.ts'),
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'main.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.main.json'),
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
};

const preloadConfig = {
  ...commonConfig,
  target: 'electron-preload',
  entry: path.resolve(__dirname, '../src/preload.ts'),
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'preload.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.main.json'),
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
};

const rendererConfig = {
  ...commonConfig,
  target: 'electron-renderer',
  entry: path.resolve(__dirname, '../src/renderer/index.tsx'),
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'renderer.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.renderer.json'),
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                config: path.resolve(__dirname, 'postcss.config.js'),
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '../src/renderer/index.html'),
      filename: 'index.html',
    }),
  ],
};

module.exports = [mainConfig, preloadConfig, rendererConfig];
