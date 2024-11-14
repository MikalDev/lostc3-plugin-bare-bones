import puppeteer, { Browser, Page } from 'puppeteer';
import { ModelLoader } from '../../Modules/';
import { GPUResourceManager } from '../../Modules/';
import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals';

interface Modules {
    ModelLoader: typeof ModelLoader;
    GPUResourceManager: typeof GPUResourceManager;
}

declare global {
    interface Window {
        Modules: Modules;
    }
}

describe('ModelLoader', () => {
    let browser: Browser;
    let page: Page;
    let gl: WebGL2RenderingContext | null = null;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false,
            dumpio: true,
            devtools: true 
        });
        page = await browser.newPage();

        // Change from about:blank to a file URL
        await page.goto('file://' + process.cwd() + '/index.html');

        // Add console message handlers BEFORE doing anything else
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            console.log(`[Browser ${type}]:`, text);
            
            // Also log any arguments passed to console
            msg.args().forEach(async (arg) => {
                const val = await arg.jsonValue();
                console.log('Argument:', val);
            });
        });

        // Add error handlers
        page.on('pageerror', err => {
            console.error('🔴 Page Error:', err.toString());
        });
        
        page.on('requestfailed', request => 
            console.error('🔴 Request Failed:', {
                url: request.url(),
                error: request.failure()?.errorText,
                method: request.method(),
                headers: request.headers()
            })
        );

        // Now try loading the script and checking what's available
        await page.goto('file://' + process.cwd() + '/index.html');
        
        await page.addScriptTag({
            path: '/Users/danps/Projects/rendera/Addon/Model/dist/index.js',
            type: 'module'
        });

        await page.evaluate(() => {
            // ModelBundle will be the global namespace containing your exports
            (window as any).Modules = {
                ModelLoader: ModelLoader,
                GPUResourceManager: GPUResourceManager
            };
        });
        
        // Update the check to look for the classes on the window object
        const scriptLoaded = await page.evaluate(() => {
            console.log('Available globals:', Object.keys(window));
            // Check if the classes are available globally
            return typeof window.Modules?.ModelLoader !== 'undefined' 
                && typeof window.Modules?.GPUResourceManager !== 'undefined';
        });
        
        if (!scriptLoaded) {
            throw new Error('Bundle script did not load properly');
        }

        // Create a canvas and get WebGL2 context
        await page.evaluate(() => {
            const canvas = document.createElement('canvas');
            document.body.appendChild(canvas);
            const gl = canvas.getContext('webgl2');
            if (!gl) throw new Error('WebGL2 not supported');
            // Store the canvas on window so we can reference it later
            (window as any).__testCanvas = canvas;
            return true; // Just return success
        });
    });

    afterAll(async () => {
        await browser.close();
    });

    it('should load a model successfully using GPUResourceManager', async () => {
        jest.setTimeout(120000);
        
        try {
            // First, verify the modules are available
            const modulesExist = await page.evaluate(() => {
                return typeof window.Modules?.ModelLoader !== 'undefined'
                    && typeof window.Modules?.GPUResourceManager !== 'undefined';
            });
            
            if (!modulesExist) {
                throw new Error('Required modules not found in window.Modules');
            }

            const result = await page.evaluate(async () => {
                const canvas = (window as any).__testCanvas;
                const gl = canvas.getContext('webgl2');
                if (!gl) throw new Error('WebGL2 not supported');
                
                // Access the classes through the window.Modules namespace                
                const gpuResourceManager = new window.Modules.GPUResourceManager(gl);
                const modelLoader = new window.Modules.ModelLoader(gl, gpuResourceManager);
                
                const modelPath = 'https://kindeyegames.com/assets/cube.glb';
                const loadedModel = await modelLoader.loadModel(modelPath);
                
                return loadedModel; // Note: this will be serialized
            });

            expect(result).toBeDefined();
        } catch (error) {
            console.error('🔴 Test failed:', error);
            throw error;
        }
    }, 120000);
});
