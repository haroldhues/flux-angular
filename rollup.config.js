import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import { uglify } from 'rollup-plugin-uglify'
import pkg from './package.json'

// Based off https://github.com/rollup/rollup-starter-lib/tree/de859333cf41b94dc7d434882e56798d9fa9c731
export default [
  {
    input: 'src/flux-angular.js',
    external: ['angular'],
    output: {
      globals: {
        angular: 'angular',
      },
      file: pkg.browser,
      format: 'umd',
      name: 'fluxAngular',
      sourcemap: true,
    },
    plugins: [
      // Resolve and include dependencies in the bundle
      resolve({ browser: true }),
      commonjs(),
      babel({
        exclude: ['node_modules/**'],
      }),
      uglify(),
    ],
  },
  {
    input: 'src/flux-angular.js',
    external: ['angular', 'baobab', 'dispatchr'],
    output: [
      { file: pkg.main, format: 'cjs', sourcemap: true },
      { file: pkg.module, format: 'es', sourcemap: true },
    ],
    plugins: [
      babel({
        exclude: ['node_modules/**'],
      }),
    ],
  },
]
