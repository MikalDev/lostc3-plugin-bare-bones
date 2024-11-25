import { GPUResourceManager, InstanceManager, ModelLoader } from './Modules/index.js';

const C3 = globalThis.C3;

class Instance extends globalThis.ISDKInstanceBase {

	public gpuResourceManager: GPUResourceManager;
	public instanceManager: InstanceManager;
	public modelLoader: ModelLoader;
	readonly PluginConditions = C3.Plugins[Config.AddonId].Cnds;
	constructor() {
		super();
		const properties = this._getInitProperties();

		console.log('Instance');

        if (properties) {
			// Add properties to the instance
        }
		// @ts-ignore c3 globalThis not typed
		const canvas = globalThis.c3canvas
		if (!canvas) {
			throw new Error('[rendera] Canvas not found');
		}
		// @ts-ignore c3 global canvas not typed
		const gl = (canvas.getContext('webgl2')) as WebGL2RenderingContext;
		if (!gl) {
			throw new Error('[rendera] WebGL2 not supported');
		}
		console.log('[rendera] WebGL2 supported', gl);
        // Initialize managers
        this.gpuResourceManager = new GPUResourceManager(gl);
        this.modelLoader = new ModelLoader(gl, this.gpuResourceManager);
        this.instanceManager = new InstanceManager(gl, this.modelLoader, this.gpuResourceManager);
		console.info('[rendera] GPUResourceManager created', this.gpuResourceManager);
		console.info('[rendera] InstanceManager created', this.instanceManager);
		console.info('[rendera] ModelLoader created', this.modelLoader);
	}

	_release() {
		super._release();
	}

};

C3.Plugins[Config.AddonId].Instance = Instance;
// export type { RenderaInstance as Instance };
export type { Instance };