import { ModelLoader } from './ModelLoader';
import { InstanceData, AnimationOptions } from './types';
export declare class AnimationController {
    private modelLoader;
    constructor(modelLoader: ModelLoader);
    updateAnimation(instance: InstanceData, deltaTime: number): void;
    startAnimation(instance: InstanceData, animationName: string, options?: AnimationOptions): void;
    stopAnimation(instance: InstanceData): void;
    private updateAnimationTime;
    private updateJointMatrices;
    private evaluateTrack;
}
//# sourceMappingURL=AnimationController.d.ts.map