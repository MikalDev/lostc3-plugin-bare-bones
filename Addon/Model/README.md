README.md

Imlementation notes:
- Draco decoder is loaded in the ModelLoader.ts file.
- The decoder is loaded using the WebAssembly.instantiate() method, which allows for asynchronous loading of the decoder module.
- The decoder is registered with the WebIO instance in the ModelLoader constructor.
- The wasm file must be in the directory as the index.js rollup output.


