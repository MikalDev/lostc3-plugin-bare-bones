import { ModelId, ModelData, IGPUResourceManager, IModelLoader } from './types';
export declare class ModelLoader implements IModelLoader {
    gl: WebGL2RenderingContext;
    private loadedModels;
    private gpuResources;
    private webio;
    constructor(gl: WebGL2RenderingContext, gpuResources: IGPUResourceManager);
    private createWebIO;
    loadModel(url: string): Promise<ModelId>;
    getModelData(modelId: string): ModelData | null;
    deleteModel(modelId: string): void;
    private processDocument;
    private processRenderableNodes;
    private processMesh;
    private processPrimitive;
    private getMaterialIndex;
    private processMaterials;
    private processAnimations;
    private processJoints;
    private cleanupModelResources;
    private createModelError;
    private generateModelId;
    private createAttributeBuffer;
    private createIndexBuffer;
    private loadTexture;
    private loadImage;
    private getIndexType;
    private getAttributeLocation;
}
//# sourceMappingURL=ModelLoader.d.ts.map