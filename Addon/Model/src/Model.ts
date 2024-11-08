import { InstanceId, IModel, IInstanceManager, AnimationOptions } from './types';
import { quat } from 'gl-matrix';

export class Model implements IModel {
    readonly instanceId: InstanceId;
    private manager: IInstanceManager;

    constructor(instanceId: InstanceId, manager: IInstanceManager) {
        this.instanceId = instanceId;
        this.manager = manager;
    }

    setPosition(x: number, y: number, z: number): void {
        this.manager.internal.setPosition(
            this.instanceId.id,
            x,
            y,
            z
        );
    }

    setRotation(x: number, y: number, z: number): void {
        // Convert Euler angles to quaternion
        const quat = this.eulerToQuaternion(x, y, z);
        this.manager.internal.setRotation(
            this.instanceId.id,
            quat
        );
    }

    setScale(x: number, y: number, z: number): void {
        this.manager.internal.setScale(
            this.instanceId.id,
            x,
            y,
            z
        );
    }

    playAnimation(name: string, options?: AnimationOptions): void {
        this.manager.internal.playAnimation(
            this.instanceId.id,
            name,
            options
        );
    }

    stopAnimation(): void {
        this.manager.internal.stopAnimation(this.instanceId.id);
    }

    // Additional convenience methods
    setQuaternion(x: number, y: number, z: number, w: number): void {
        const quat = new Float32Array([x, y, z, w]);
        this.manager.internal.setRotation(
            this.instanceId.id,
            quat
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