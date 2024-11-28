import { Category, Action, Condition, Expression, addParam, Param } from 'jsr:@lost-c3/lib@3.0.0';
// import type { Instance } from '@Instance';
import type { Instance } from '../Instance.js';

@Category('modelId', 'Model')
export default class ModelCategory {
    /** @Actions */
    @Action('loadModel', 'Load Model', 'Load model {0}', 'Load model...', {
        params: [
            addParam('path', 'Path', { type: Param.String })
        ]
    })
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
    }

    /** @Conditions */
    @Condition('onCondition', 'On condition', 'On condition')
    onCondition() {
        return false;
    }

    /** @Expressions */
    @Expression('expression', 'Expression')
    Expression() {
        return 'Value';
    }

}