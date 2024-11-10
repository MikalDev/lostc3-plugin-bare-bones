import { ModelId, ModelData, IGPUResourceManager, AnimationClip, IModelLoader } from './types';
export declare class ModelLoader implements IModelLoader {
    private gl;
    private loadedModels;
    private gpuResources;
    private webio;
    constructor(gl: WebGL2RenderingContext, gpuResources: IGPUResourceManager);
    loadModel(url: string): Promise<ModelId>;
    getModelData(modelId: string): ModelData | null;
    deleteModel(modelId: string): void;
    private processDocument;
    private processMeshes;
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
    private calculateAnimationDuration;
    private processAnimationTrack;
    getAnimation(modelId: string, animationName: string): AnimationClip | undefined;
    private createGLBuffer;
    private getAttributeLocation;
}
//# sourceMappingURL=ModelLoader.d.ts.map