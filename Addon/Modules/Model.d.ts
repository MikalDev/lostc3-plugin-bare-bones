import { InstanceId, IModel, IInstanceManager, AnimationOptions } from './types';
export declare class Model implements IModel {
    readonly instanceId: InstanceId;
    private manager;
    constructor(instanceId: InstanceId, manager: IInstanceManager);
    setPosition(x: number, y: number, z: number): void;
    setRotation(x: number, y: number, z: number): void;
    setScale(x: number, y: number, z: number): void;
    playAnimation(name: string, options?: AnimationOptions): void;
    stopAnimation(): void;
    setQuaternion(x: number, y: number, z: number, w: number): void;
    private eulerToQuaternion;
}
//# sourceMappingURL=Model.d.ts.map