import { IInstanceManager, IGPUResourceManager, type AnimationOptions } from './types';
import { ModelLoader } from './ModelLoader';
import { Model } from './Model';
export declare class InstanceManager implements IInstanceManager {
    private gpuResources;
    private gl;
    private modelLoader;
    private instances;
    private instancesByModel;
    private instanceBuffers;
    private nextInstanceId;
    private dirtyInstances;
    private animationController;
    constructor(gl: WebGL2RenderingContext, modelLoader: ModelLoader, gpuResources: IGPUResourceManager);
    createModel(modelId: string): Model;
    deleteModel(instanceId: number): void;
    updateInstance(instanceId: number, deltaTime: number): void;
    render(viewProjection: Float32Array): void;
    internal: {
        setPosition: (instanceId: number, x: number, y: number, z: number) => void;
        setRotation: (instanceId: number, quaternion: Float32Array) => void;
        setScale: (instanceId: number, x: number, y: number, z: number) => void;
        playAnimation: (instanceId: number, animationName: string, options?: AnimationOptions) => void;
        stopAnimation: (instanceId: number) => void;
    };
    private createError;
    private addToModelGroup;
    private removeFromModelGroup;
    private updateAnimation;
    private updateWorldMatrix;
    private updateGPUBuffers;
    private updateModelBuffers;
    private renderModelInstances;
    private bindMaterial;
    private startAnimation;
    private cleanupInstance;
}
