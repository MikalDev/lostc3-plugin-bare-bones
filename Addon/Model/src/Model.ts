import { InstanceId, IModel, IInstanceManager, AnimationOptions } from './types';
import { quat } from 'gl-matrix';

export class Model implements IModel {
    readonly instanceId: InstanceId;
    private manager: IInstanceManager;

    constructor(instanceId: InstanceId, manager: IInstanceManager) {
        this.instanceId = instanceId;
        this.manager = manager;
    }

    public setNormalMapEnabled(enabled: boolean): void {
        this.manager.setModelNormalMapEnabled(enabled, this);
        console.log('Set normal map enabled:', enabled);
    }

    public setPosition(x: number, y: number, z: number): void {
        this.manager.setModelPosition(x, y, z, this);
    }

    public setRotation(quaternion: Float32Array): void {
        this.manager.setModelRotation(quaternion, this);
    }

    public setScale(x: number, y: number, z: number): void {
        this.manager.setModelScale(x, y, z, this);
    }

    public playAnimation(animationName: string, options?: AnimationOptions): void {
        this.manager.playModelAnimation(animationName, this, options);
    }

    public stopAnimation(): void {
        this.manager.stopModelAnimation(this);
    }

    // Additional convenience methods
    public setQuaternion(x: number, y: number, z: number, w: number): void {
        const quat = new Float32Array([x, y, z, w]);
        this.manager.setModelRotation(
            quat,
            this
        );
    }

    // Helper for converting Euler angles to quaternion
    private eulerToQuaternion(
        x: number, 
        y: number, 
        z: number
    ): Float32Array {

        // Create quaternion from Euler angles (XYZ order)
        const quaternion = quat.create();
        quat.fromEuler(quaternion, x, y, z);
        
        return quaternion as Float32Array;
    }
}