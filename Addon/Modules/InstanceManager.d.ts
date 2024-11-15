import { IInstanceManager, IGPUResourceManager, type AnimationOptions } from './types';
import { ModelLoader } from './ModelLoader';
import { Model } from './Model';
import { mat4 } from 'gl-matrix';
export declare class InstanceManager implements IInstanceManager {
    private gpuResources;
    private gl;
    private modelLoader;
    private instances;
    private instancesByModel;
    private defaultShaderProgram;
    private instanceBuffers;
    private nextInstanceId;
    private dirtyInstances;
    private animationController;
    constructor(gl: WebGL2RenderingContext, modelLoader: ModelLoader, gpuResources: IGPUResourceManager);
    initialize(): void;
    createViewProjection(fov: number, resolution: {
        width: number;
        height: number;
    }, near: number, far: number, eye: Float32Array, center: Float32Array, up: Float32Array): {
        view: mat4;
        projection: mat4;
    };
    createModel(modelId: string): Model;
    deleteModel(instanceId: number): void;
    updateInstance(instanceId: number, deltaTime: number): void;
    render(viewProjection: {
        view: mat4;
        projection: mat4;
    }): void;
    setModelPosition(x: number, y: number, z: number, instance: Model): void;
    setModelRotation(quaternion: Float32Array, instance: Model): void;
    setModelScale(x: number, y: number, z: number, instance: Model): void;
    playModelAnimation(animationName: string, instance: Model, options?: AnimationOptions): void;
    stopModelAnimation(instance: Model): void;
    private createError;
    private addToModelGroup;
    private removeFromModelGroup;
    private updateAnimation;
    private updateWorldMatrix;
    private updateGPUBuffers;
    private updateModelBuffers;
    private renderModelInstances;
    private startAnimation;
    private cleanupInstance;
    setModelNormalMapEnabled(enabled: boolean, instance: Model): void;
}
//# sourceMappingURL=InstanceManager.d.ts.map