/**
 * @jest-environment jsdom
 */

// import 'jest-webgl-canvas-mock'; // This automatically mocks WebGL
import { GPUResourceManager, ModelLoader } from '../src/main.ts';
import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Model Loading', () => {
    let gl: WebGL2RenderingContext;
    beforeAll(() => {
        // Create canvas and get WebGL context
        const canvas = document.createElement('canvas');
        gl = canvas.getContext('webgl2')!;
    });

    it('should load a GLB model successfully', async () => {
        const gpuResourceManager = new GPUResourceManager(gl);
        const modelLoader = new ModelLoader(gl, gpuResourceManager);
        
        const model = await modelLoader.loadModel('./test/assets/cube.glb');
        
        // The mock provides spies for all WebGL methods
        expect(gl.createBuffer).toHaveBeenCalled();
        expect(model).toBeDefined();
        expect(model.id).toBeDefined();
        expect(model.meshCount).toBe(1);
    });
});