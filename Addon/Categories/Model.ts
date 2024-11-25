import { Category, Action, Condition, Expression, Param } from 'jsr:@lost-c3/lib';
//@ts-ignore
import type { Instance } from '../Instance.ts';

@Category({Id: 'model', Name: 'Model'})
export default class ModelCategory {
    /**
     * Actions
     */
    @Action({
        Id: `loadModel`,
        Name: `Load Model`,
        DisplayText: `Load model {0}`,
        Description: ``,
        IsAsync: true,
        Params: [
            new Param({
                Type: 'string',
                Id: 'path',
                Name: 'Path',
                Description: 'Path to the model glb file',
                InitialValue: ''
            })
        ]    })
    loadModel(this: Instance, path: string) {
        console.log('[rendera] *************');
        const gpuResourceCache = this.gpuResourceManager.gpuResourceCache;
        console.log('[rendera] Loading model', path);
        gpuResourceCache.cacheModelMode();
        console.log('[rendera] cached model mode');
        let model;
        this.modelLoader.loadModel(path).then(newModel => {
            model = newModel;
            gpuResourceCache.restoreModelMode();
            console.log('[rendera] restored model mode');
            console.log('[rendera] Model loaded', model);
        });
    };
    
    /**
     * Conditions
     */
    
    /**
     * Expressions
     */
    
}