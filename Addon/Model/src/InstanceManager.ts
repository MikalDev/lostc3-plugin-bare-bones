import { ModelError, ModelErrorCode } from './errors';
import { InstanceData, IInstanceManager, IGPUResourceManager, InstanceId, type AnimationOptions, MaterialData, SAMPLER_TEXTURE_UNIT_MAP } from './types';
import { ModelLoader } from './ModelLoader';
import { Model } from './Model';
import { AnimationController } from './AnimationController';
import { mat3, mat4 } from 'gl-matrix';

export class InstanceManager implements IInstanceManager {
    private gl: WebGL2RenderingContext;
    private modelLoader: ModelLoader;
    private instances: Map<number, InstanceData> = new Map();
    private instancesByModel: Map<string, Set<number>> = new Map();
    private defaultShaderProgram: WebGLProgram;
    
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
        this.defaultShaderProgram = this.gpuResources.getDefaultShader();
    }

    initialize(): void {
        // Basic WebGL2 initialization
        this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        
        // Enable blending for transparency
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        // Set viewport
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        // Clear any existing buffers/state
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        this.gl.bindVertexArray(null);
        this.gl.useProgram(null);

        // Clear instance tracking
        this.dirtyInstances.clear();
        this.instanceBuffers.clear();

        // Clear canvas
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // Enable additional WebGL features
        this.gl.enable(this.gl.SCISSOR_TEST);  // For viewport clipping
        
        // Set pixel store parameters
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);  // Flip textures right-side up
        this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 4);  // Standard pixel alignment
        
        // Set default texture parameters
        this.gl.activeTexture(this.gl.TEXTURE0);
        
        // Set default line width
        this.gl.lineWidth(1.0);
    }

    createViewProjection(
        fov: number,
        resolution: { width: number, height: number },
        near: number,
        far: number,
        eye: Float32Array,
        center: Float32Array,
        up: Float32Array,
    ): { view: mat4, projection: mat4 } {
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fov * Math.PI / 180, resolution.width / resolution.height, near, far);
        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, eye, center, up);
        return { view: viewMatrix, projection: projectionMatrix };
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
            renderOptions: {
                useNormalMap: false
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

    render(viewProjection: { view: mat4, projection: mat4 }): void {
        // Update GPU buffers for dirty instances
        if (this.dirtyInstances.size > 0) {
            this.updateGPUBuffers();
        }

        // Render each model group
        for (const [modelId, instanceGroup] of this.instancesByModel) {
            this.renderModelInstances(modelId, instanceGroup, viewProjection);
        }
    }

    public setModelPosition(x: number, y: number, z: number, instance: Model): void {
        const instanceData = this.instances.get(instance.instanceId.id);
        if (instanceData) {
            instanceData.transform.position.set([x, y, z]);
            this.dirtyInstances.add(instance.instanceId.id);
        }
    }

    public setModelRotation(quaternion: Float32Array, instance: Model): void {
        const instanceData = this.instances.get(instance.instanceId.id);
        if (instanceData) {
            instanceData.transform.rotation.set(quaternion);
            this.dirtyInstances.add(instance.instanceId.id);
        }
    }

    public setModelScale(x: number, y: number, z: number, instance: Model): void {
        const instanceData = this.instances.get(instance.instanceId.id);
        if (instanceData) {
            instanceData.transform.scale.set([x, y, z]);
            this.dirtyInstances.add(instance.instanceId.id);
        }
    }

    public playModelAnimation(
        animationName: string, 
        instance: Model,
        options?: AnimationOptions
    ): void {
        const instanceData = this.instances.get(instance.instanceId.id);
        if (instanceData) {
            this.startAnimation(instanceData, animationName, options);
        }
    }

    public stopModelAnimation(instance: Model): void {
        const instanceData = this.instances.get(instance.instanceId.id);
        if (instanceData) {
            instanceData.animationState.currentAnimation = null;
        }
    }

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
        const matrix = mat4.create();
        // Create translation matrix
        mat4.fromTranslation(matrix, instance.transform.position);
        
        // Create rotation matrix and multiply with existing matrix
        const rotationMatrix = mat4.create();
        mat4.fromQuat(rotationMatrix, instance.transform.rotation);
        mat4.multiply(matrix, matrix, rotationMatrix);
        
        // Apply scale
        mat4.scale(matrix, matrix, instance.transform.scale);
        instance.worldMatrix.set(matrix);
    }

    private updateGPUBuffers(): void {
        // Just clear dirty instances as we're not using instance buffers anymore
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

        // Update model matrix buffer
        const modelMatrixData = new Float32Array(instances.length * 16);
        for (let i = 0; i < instances.length; i++) {
            modelMatrixData.set(instances[i].worldMatrix, i * 16);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, bufferData.modelMatrix);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            modelMatrixData,
            this.gl.DYNAMIC_DRAW
        );

        // Update joint matrices buffer if instances have skinning
        if (instances.some(instance => instance.jointMatrices)) {
            const jointMatrixData = new Float32Array(
                instances.length * 
                Math.max(...instances.map(i => i.jointMatrices?.length ?? 0))
            );

            let offset = 0;
            for (const instance of instances) {
                if (instance.jointMatrices) {
                    jointMatrixData.set(instance.jointMatrices, offset);
                    offset += instance.jointMatrices.length;
                }
            }

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, bufferData.jointMatrices);
            this.gl.bufferData(
                this.gl.ARRAY_BUFFER,
                jointMatrixData,
                this.gl.DYNAMIC_DRAW
            );
        }

        // Unbind buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }

    private renderModelInstances(
        modelId: string, 
        instanceGroup: Set<number>, 
        viewProjection: { view: mat4, projection: mat4 }
    ): void {
        const modelData = this.modelLoader.getModelData(modelId);
        if (!modelData) return;

        // Basic shader setup TODO: move to GPUResourceManager
        this.gl.useProgram(this.defaultShaderProgram);

        // For each instance
        for (const instanceId of instanceGroup) {
            const instance = this.instances.get(instanceId);
            if (!instance) continue;

            const renderOptions = instance.renderOptions;

            // Set normal map state for this instance
            this.gpuResources.setNormalMapEnabled(
                this.defaultShaderProgram, 
                renderOptions.useNormalMap ?? false
            );

            // Update world matrix
            this.updateWorldMatrix(instance);

            // For each mesh in the model
            for (const mesh of modelData.meshes) {
                for (const primitive of mesh.primitives) {
                    const material = modelData.materials[primitive.material];
                    // const shader = material.program;
                    // TODO: move to GPUResourceManager
                    const shader = this.defaultShaderProgram;

                    // 1. Bind shader
                    // TODO: move to GPUResourceManager
                    this.gl.useProgram(shader);

                    // 2. Bind VAO (contains vertex attributes setup)
                    this.gl.bindVertexArray(primitive.vao);

                    // 3. Set required uniforms
                    const viewLoc = this.gl.getUniformLocation(shader, 'u_View');
                    const projectionLoc = this.gl.getUniformLocation(shader, 'u_Projection');
                    const modelMatrixLoc = this.gl.getUniformLocation(shader, 'u_Model');
                    const normalMatrixLoc = this.gl.getUniformLocation(shader, 'u_NormalMatrix');
                    this.gl.uniformMatrix4fv(viewLoc, false, viewProjection.view);
                    this.gl.uniformMatrix4fv(projectionLoc, false, viewProjection.projection);
                    this.gl.uniformMatrix4fv(modelMatrixLoc, false, instance.worldMatrix);

                    // Calculate normal matrix (inverse transpose of the upper 3x3 model matrix)
                    const normalMatrix = mat3.create();
                    mat3.normalFromMat4(normalMatrix, instance.worldMatrix);

                    // Set the uniform
                    this.gl.uniformMatrix3fv(normalMatrixLoc, false, normalMatrix);

                    // 4. Handle skinning if present
                    if (instance.jointMatrices && instance.jointMatrices.length > 0) {
                        const jointMatricesLoc = this.gl.getUniformLocation(shader, 'u_JointMatrices');
                        if (jointMatricesLoc) {
                            this.gl.uniformMatrix4fv(jointMatricesLoc, false, instance.jointMatrices);
                        }
                    }
                    // 5. Bind material properties (textures and uniforms)
                    this.gpuResources.bindShaderAndMaterial(this.defaultShaderProgram, primitive.material);

                    // 6. Draw
                    if (primitive.indexBuffer) {
                        this.gl.drawElements(
                            this.gl.TRIANGLES,
                            primitive.indexCount,
                            primitive.indexType,
                            0
                        );
                    } else {
                        this.gl.drawArrays(
                            this.gl.TRIANGLES,
                            0,
                            primitive.vertexCount
                        );
                    }
                }
            }
        }

        // 7. Cleanup
        this.gl.bindVertexArray(null);
        this.gl.useProgram(null);
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

    public setModelNormalMapEnabled(enabled: boolean, instance: Model): void {
        const instanceData = this.instances.get(instance.instanceId.id);
        if (instanceData) {
            instanceData.renderOptions.useNormalMap = enabled;
            this.dirtyInstances.add(instance.instanceId.id);
        }
    }
}