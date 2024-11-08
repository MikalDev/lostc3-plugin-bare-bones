import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/Model.js',
    format: 'es',
    name: 'Rendra'
  },
  plugins: [
    resolve(),
    typescript()
  ]
}