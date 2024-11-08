import { ModelError, ModelErrorCode } from './errors';
import { InstanceData, IInstanceManager, IGPUResourceManager, InstanceId, type AnimationOptions, MaterialData } from './types';
import { ModelLoader } from './ModelLoader';
import { Model } from './Model';
import { AnimationController } from './AnimationController';

export class InstanceManager implements IInstanceManager {
    private gl: WebGL2RenderingContext;
    private modelLoader: ModelLoader;
    private instances: Map<number, InstanceData> = new Map();
    private instancesByModel: Map<string, Set<number>> = new Map();
    
    // GPU instance data
    private instanceBuffers: Map<string, {
        modelMatrix: WebGLBuffer;
        jointMatrices: WebGLBuffer;
        count: number;
    }> = new Map();
    
    private nextInstanceId = 1;
    private dirtyInstances: Set<number> = new Set();

    private animationController: AnimationController;

    constructor(
        gl: WebGL2RenderingContext,
        modelLoader: ModelLoader,
        private gpuResources: IGPUResourceManager
    ) {
        this.gl = gl;
        this.modelLoader = modelLoader;
        this.animationController = new AnimationController(modelLoader);
    }

    createModel(modelId: string): Model {
        // Verify model exists
        const modelData = this.modelLoader.getModelData(modelId);
        if (!modelData) {
            throw this.createError(
                ModelErrorCode.RESOURCE_NOT_FOUND,
                `Model ${modelId} not found`
            );
        }

        // Create instance data
        const instanceId: InstanceId = {
            id: this.nextInstanceId++,
            modelId
        };

        const instanceData: InstanceData = {
            instanceId,
            transform: {
                position: new Float32Array([0, 0, 0]),
                rotation: new Float32Array([0, 0, 0, 1]), // Quaternion
                scale: new Float32Array([1, 1, 1])
            },
            animationState: {
                currentAnimation: null,
                currentTime: 0,
                speed: 1,
                loop: true
            },
            jointMatrices: new Float32Array((modelData.jointData?.length ?? 0) * 16),
            worldMatrix: new Float32Array(16) // 4x4 matrix
        };

        // Store instance
        this.instances.set(instanceId.id, instanceData);
        
        // Add to model group
        this.addToModelGroup(instanceId);
        
        // Create Model interface
        return new Model(instanceId, this);
    }

    deleteModel(instanceId: number): void {
        this.cleanupInstance(instanceId);
    }

    updateInstance(instanceId: number, deltaTime: number): void {
        const instance = this.instances.get(instanceId);
        if (!instance) return;

        // Update animation if active
        if (instance.animationState.currentAnimation) {
            this.updateAnimation(instance, deltaTime);
        }

        // Update world matrix if transform is dirty
        if (this.dirtyInstances.has(instanceId)) {
            this.updateWorldMatrix(instance);
        }
    }

    render(viewProjection: Float32Array): void {
        // Update GPU buffers for dirty instances
        if (this.dirtyInstances.size > 0) {
            this.updateGPUBuffers();
        }

        // Render each model group
        for (const [modelId, instanceGroup] of this.instancesByModel) {
            this.renderModelInstances(modelId, instanceGroup, viewProjection);
        }
    }

    // Internal methods used by Model class
    internal = {
        setPosition: (instanceId: number, x: number, y: number, z: number) => {
            const instance = this.instances.get(instanceId);
            if (instance) {
                instance.transform.position.set([x, y, z]);
                this.dirtyInstances.add(instanceId);
            }
        },

        setRotation: (instanceId: number, quaternion: Float32Array) => {
            const instance = this.instances.get(instanceId);
            if (instance) {
                instance.transform.rotation.set(quaternion);
                this.dirtyInstances.add(instanceId);
            }
        },

        setScale: (instanceId: number, x: number, y: number, z: number) => {
            const instance = this.instances.get(instanceId);
            if (instance) {
                instance.transform.scale.set([x, y, z]);
                this.dirtyInstances.add(instanceId);
            }
        },

        playAnimation: (
            instanceId: number, 
            animationName: string, 
            options?: AnimationOptions
        ) => {
            const instance = this.instances.get(instanceId);
            if (instance) {
                this.startAnimation(instance, animationName, options);
            }
        },

        stopAnimation: (instanceId: number) => {
            const instance = this.instances.get(instanceId);
            if (instance) {
                instance.animationState.currentAnimation = null;
            }
        }
    };

    private createError(code: ModelErrorCode, message: string): ModelError {
        return { name: 'ModelError', code, message };
    }

    private addToModelGroup(instanceId: InstanceId): void {
        let group = this.instancesByModel.get(instanceId.modelId);
        if (!group) {
            group = new Set();
            this.instancesByModel.set(instanceId.modelId, group);
        }
        group.add(instanceId.id);
    }

    private removeFromModelGroup(instanceId: InstanceId): void {
        const group = this.instancesByModel.get(instanceId.modelId);
        if (group) {
            group.delete(instanceId.id);
            if (group.size === 0) {
                this.instancesByModel.delete(instanceId.modelId);
            }
        }
    }

    private updateAnimation(instance: InstanceData, deltaTime: number): void {
        if (!instance.animationState.currentAnimation) return;

        this.animationController.updateAnimation(instance, deltaTime);
        this.dirtyInstances.add(instance.instanceId.id);
    }

    private updateWorldMatrix(instance: InstanceData): void {
        // Calculate world matrix from position, rotation, and scale
        const matrix = new Float32Array(16);
        // TODO: Implement matrix calculation using instance.transform
        instance.worldMatrix.set(matrix);
    }

    private updateGPUBuffers(): void {
        // Group dirty instances by model
        const dirtyByModel = new Map<string, InstanceData[]>();
        
        for (const instanceId of this.dirtyInstances) {
            const instance = this.instances.get(instanceId);
            if (!instance) continue;
            
            const modelInstances = dirtyByModel.get(instance.instanceId.modelId) || [];
            modelInstances.push(instance);
            dirtyByModel.set(instance.instanceId.modelId, modelInstances);
        }

        // Update buffers for each model
        for (const [modelId, instances] of dirtyByModel) {
            this.updateModelBuffers(modelId, instances);
        }

        this.dirtyInstances.clear();
    }

    private updateModelBuffers(modelId: string, instances: InstanceData[]): void {
        let bufferData = this.instanceBuffers.get(modelId);
        if (!bufferData) {
            const modelMatrix = this.gl.createBuffer();
            const jointMatrices = this.gl.createBuffer();
            
            if (!modelMatrix || !jointMatrices) {
                throw this.createError(
                    ModelErrorCode.GL_ERROR,
                    'Failed to create WebGL buffers'
                );
            }

            bufferData = {
                modelMatrix,
                jointMatrices,
                count: instances.length
            };
            this.instanceBuffers.set(modelId, bufferData);
        }

        // TODO: Implement buffer update logic
    }

    private renderModelInstances(
        modelId: string, 
        instanceGroup: Set<number>, 
        viewProjection: Float32Array
    ): void {
        const buffers = this.instanceBuffers.get(modelId);
        if (!buffers || instanceGroup.size === 0) return;

        const modelData = this.modelLoader.getModelData(modelId);
        if (!modelData) return;

        // For each mesh in the model
        for (const mesh of modelData.meshes) {
            // For each primitive (submesh) that might have different material
            for (const primitive of mesh.primitives) {
                // Get and bind material
                const material = modelData.materials[primitive.material];
                const shader = material.program;
                
                this.gl.useProgram(shader);

                // Bind material textures and uniforms
                this.bindMaterial(material);

                // Bind primitive VAO
                this.gl.bindVertexArray(primitive.vao);

                // Set common uniforms
                const viewProjectionLoc = this.gl.getUniformLocation(shader, 'u_ViewProjection');
                this.gl.uniformMatrix4fv(viewProjectionLoc, false, viewProjection);

                // Draw all instances of this primitive
                if (primitive.indexBuffer) {
                    this.gl.drawElementsInstanced(
                        this.gl.TRIANGLES,
                        primitive.indexCount,
                        primitive.indexType,
                        0,
                        instanceGroup.size
                    );
                } else {
                    this.gl.drawArraysInstanced(
                        this.gl.TRIANGLES,
                        0,
                        primitive.vertexCount,
                        instanceGroup.size
                    );
                }
            }
        }
    }

    private bindMaterial(material: MaterialData): void {
        // Bind textures
        material.textures.forEach((texture, unit) => {
            this.gl.activeTexture(this.gl.TEXTURE0 + unit);
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        });

        // Set material uniforms
        if (material.uniforms) {
            for (const [name, value] of Object.entries(material.uniforms)) {
                const location = this.gl.getUniformLocation(material.program, name);
                if (location === null) continue;

                if (Array.isArray(value)) {
                    switch (value.length) {
                        case 2: this.gl.uniform2fv(location, value); break;
                        case 3: this.gl.uniform3fv(location, value); break;
                        case 4: this.gl.uniform4fv(location, value); break;
                        case 16: this.gl.uniformMatrix4fv(location, false, value); break;
                    }
                } else if (typeof value === 'number') {
                    this.gl.uniform1f(location, value);
                } else if (typeof value === 'boolean') {
                    this.gl.uniform1i(location, value ? 1 : 0);
                }
            }
        }
    }

    private startAnimation(
        instance: InstanceData,
        animationName: string,
        options?: AnimationOptions
    ): void {
        instance.animationState.currentAnimation = animationName;
        instance.animationState.currentTime = 0;
        if (options) {
            instance.animationState.speed = options.speed ?? 1;
            instance.animationState.loop = options.loop ?? true;
        }
    }

    private cleanupInstance(instanceId: number): void {
        const instance = this.instances.get(instanceId);
        if (!instance) return;

        // Remove from model group
        this.removeFromModelGroup(instance.instanceId);
        
        // Clear GPU resources
        const buffers = this.instanceBuffers.get(instance.instanceId.modelId);
        if (buffers) {
            // Clean up instance-specific GPU resources
            this.gpuResources.deleteBuffer(buffers.modelMatrix);
            this.gpuResources.deleteBuffer(buffers.jointMatrices);
        }

        // Remove instance data
        this.instances.delete(instanceId);
        this.dirtyInstances.delete(instanceId);
    }
}