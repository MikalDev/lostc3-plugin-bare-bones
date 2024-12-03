import { Document } from '@gltf-transform/core';
import { ModelId, ModelData, IGPUResourceManager, IModelLoader } from './types';
export declare class ModelLoader implements IModelLoader {
    gl: WebGL2RenderingContext;
    private loadedModels;
    private gpuResources;
    private webio;
    private _pendingDocuments;
    constructor(gl: WebGL2RenderingContext, gpuResources: IGPUResourceManager);
    private createWebIO;
    readDocument(url: string): Promise<boolean>;
    hasModel(modelId: ModelId): boolean;
    processModel(modelId: ModelId): Promise<boolean>;
    get pendingDocuments(): Map<string, Document>;
    processPendingDocuments(): Promise<number>;
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
    generateModelId(url: string): ModelId;
    private createAttributeBuffer;
    private createIndexBuffer;
    private loadTexture;
    private loadImage;
    private getIndexType;
    private getAttributeLocation;
}
//# sourceMappingURL=ModelLoader.d.ts.map