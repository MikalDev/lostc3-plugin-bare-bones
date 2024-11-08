import { ModelLoader } from './ModelLoader';
import { InstanceData, AnimationOptions, AnimationState, AnimationClip, AnimationTrack } from './types';
import { mat4, quat } from 'gl-matrix';

export class AnimationController {
    constructor(private modelLoader: ModelLoader) {}

    updateAnimation(instance: InstanceData, deltaTime: number): void {
        if (!instance.animationState.currentAnimation) return;

        // Update time
        const newTime = this.updateAnimationTime(
            instance.animationState,
            deltaTime,
            instance.instanceId.modelId
        );

        // Get animation data
        const animation = this.modelLoader.getAnimation(
            instance.instanceId.modelId,
            instance.animationState.currentAnimation
        );

        if (!animation) {
            this.stopAnimation(instance);
            return;
        }

        // Update instance state
        instance.animationState.currentTime = newTime;

        // Update joint matrices
        this.updateJointMatrices(instance, animation);
    }

    startAnimation(
        instance: InstanceData, 
        animationName: string, 
        options?: AnimationOptions
    ): void {
        instance.animationState = {
            currentAnimation: animationName,
            currentTime: 0,
            speed: options?.speed ?? 1,
            loop: options?.loop ?? true,
            blendFactor: options?.blendDuration ? 0 : undefined
        };
    }

    stopAnimation(instance: InstanceData): void {
        instance.animationState.currentAnimation = null;
        instance.animationState.currentTime = 0;
        instance.animationState.blendFactor = undefined;
    }

    private updateAnimationTime(
        state: AnimationState, 
        deltaTime: number,
        modelId: string
    ): number {
        const newTime = state.currentTime + (deltaTime * state.speed);
        
        const animation = this.modelLoader.getAnimation(
            modelId,
            state.currentAnimation!
        );
        
        if (!animation) return 0;

        // Handle looping
        if (state.loop) {
            return newTime % animation.duration;
        }
        
        // Handle non-looping animations
        return Math.min(newTime, animation.duration);
    }

    private updateJointMatrices(instance: InstanceData, animation: AnimationClip): void {
        // Group transforms by joint
        const jointTransforms = new Map<number, {
            translation?: Float32Array,
            rotation?: Float32Array,
            scale?: Float32Array
        }>();

        // Collect transforms for each joint
        for (const track of animation.tracks) {
            let transforms = jointTransforms.get(track.jointIndex);
            if (!transforms) {
                transforms = {};
                jointTransforms.set(track.jointIndex, transforms);
            }
            
            const values = this.evaluateTrack(track, instance.animationState.currentTime);
            transforms[track.transformType] = values;
        }

        // Get model data for inverse bind matrices
        const modelData = this.modelLoader.getModelData(instance.instanceId.modelId);
        if (!modelData) return;

        // Compose final matrices
        const tempMat = mat4.create();
        const finalMat = mat4.create();
        
        for (const [jointIndex, transforms] of jointTransforms) {
            mat4.identity(tempMat);

            // Apply scale if present
            if (transforms.scale) {
                mat4.scale(tempMat, tempMat, transforms.scale);
            }

            // Apply rotation if present
            if (transforms.rotation) {
                const rotMat = mat4.create();
                mat4.fromQuat(rotMat, transforms.rotation);
                mat4.multiply(tempMat, tempMat, rotMat);
            }

            // Apply translation if present
            if (transforms.translation) {
                mat4.translate(tempMat, tempMat, transforms.translation);
            }

            // Apply inverse bind matrix
            const jointData = modelData.jointData[jointIndex];
            if (jointData) {
                mat4.multiply(finalMat, tempMat, jointData.inverseBindMatrix);
                instance.jointMatrices.set(finalMat, jointIndex * 16);
            } else {
                instance.jointMatrices.set(tempMat, jointIndex * 16);
            }
        }
    }

    private evaluateTrack(
        track: AnimationTrack, 
        time: number
    ): Float32Array {
        // Find the keyframes that bracket the current time
        let startIndex = 0;
        for (let i = 0; i < track.times.length - 1; i++) {
            if (track.times[i] <= time && track.times[i + 1] > time) {
                startIndex = i;
                break;
            }
        }
        
        const endIndex = startIndex + 1;
        
        // Handle edge cases
        if (endIndex >= track.times.length) {
            return track.values.slice(startIndex * track.values.length / track.times.length, 
                                    (startIndex + 1) * track.values.length / track.times.length);
        }
        
        // Calculate interpolation factor (0 to 1)
        const startTime = track.times[startIndex];
        const endTime = track.times[endIndex];
        const factor = (time - startTime) / (endTime - startTime);
        
        const stride = track.values.length / track.times.length;
        const startOffset = startIndex * stride;
        const endOffset = endIndex * stride;
        
        const startValues = track.values.slice(startOffset, startOffset + stride);
        const endValues = track.values.slice(endOffset, endOffset + stride);
        
        if (track.interpolation === 'STEP') {
            return startValues;
        }

        // Only linear interpolation supported for now
        // TODO: Add support for cubic spline interpolation
        
        const result = new Float32Array(stride);
        
        if (track.transformType === 'rotation') {
            quat.slerp(result, startValues, endValues, factor);
        } else {
            // Linear interpolation for translation and scale
            for (let i = 0; i < stride; i++) {
                result[i] = startValues[i] + (endValues[i] - startValues[i]) * factor;
            }
        }
        
        return result;
    }
} 