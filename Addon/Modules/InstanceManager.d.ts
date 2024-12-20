import { InstanceData, IInstanceManager, IGPUResourceManager, type AnimationOptions } from './types';
import { ModelLoader } from './ModelLoader';
import { Model } from './Model';
import { AnimationController } from './AnimationController';
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
    private _animationController;
    constructor(gl: WebGL2RenderingContext, modelLoader: ModelLoader, gpuResources: IGPUResourceManager);
    initialize(): void;
    createViewProjection(fov: number, resolution: {
        width: number;
        height: number;
    }, near: number, far: number, eye: Float32Array, center: Float32Array, up: Float32Array): {
        view: mat4;
        projection: mat4;
    };
    createModel(modelId: string, animationName?: string): Model;
    deleteModel(instanceId: number): void;
    updateInstance(instanceId: number, deltaTime: number): void;
    render(viewProjection: {
        view: mat4;
        projection: mat4;
    }): void;
    setModelPosition(x: number, y: number, z: number, instance: Model): void;
    setModelRotation(quaternion: Float32Array, instance: Model): void;
    setModelScale(x: number, y: number, z: number, instance: Model): void;
    setModelBindPose(instance: Model): void;
    playModelAnimation(animationName: string, instance: Model, options?: AnimationOptions): void;
    updateModelAnimation(instance: Model, deltaTime: number): void;
    stopModelAnimation(instance: Model): void;
    private createError;
    private addToModelGroup;
    private removeFromModelGroup;
    updateAnimation(instance: InstanceData, deltaTime: number): void;
    private updateWorldMatrixWithScale;
    private updateWorldMatrix;
    private renderModelInstances;
    private startAnimation;
    private cleanupInstance;
    setModelNormalMapEnabled(enabled: boolean, instance: Model): void;
    get animationController(): AnimationController;
}
//# sourceMappingURL=InstanceManager.d.ts.map