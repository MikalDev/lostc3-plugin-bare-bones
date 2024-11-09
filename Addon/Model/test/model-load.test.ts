import { describe, it, expect, beforeAll } from 'vitest';
import { Window } from 'happy-dom';
import { GPUResourceManager, ModelLoader } from '../dist/index.js';

describe('Model Loading', () => {
    let window: Window;
    
    beforeAll(() => {
        // Setup happy-dom window with WebGL context
        window = new Window();
        global.window = window as any;
        global.document = window.document as unknown as Document;
        // Mock WebGL context
        const canvas = window.document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) {
            throw new Error('WebGL context creation failed');
        }
    });

    it('should load a GLB model successfully', async () => {
        // Assuming you have a test GLB file in your test assets
        const canvas = window.document.createElement('canvas');
        const gl = canvas.getContext('webgl')!;
        const gpuResourceManager = new GPUResourceManager(gl);
        const modelLoader = new ModelLoader(gl, gpuResourceManager);
        const model = await modelLoader.loadModel('./test/assets/test-model.glb');
        
        // Basic assertions to verify model loading
        expect(model).toBeDefined();
        expect(model.id).toBeDefined();
        expect(model.meshCount).toBe(1);
    });
});