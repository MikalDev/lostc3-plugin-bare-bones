import { Animation,Accessor, Document, Node, Primitive, WebIO, Texture, AnimationSampler } from '@gltf-transform/core';
import { ModelError, ModelErrorCode, createModelError } from './errors';
import { AttributeSemantic, ModelId, ModelData, IGPUResourceManager, Mesh, MeshPrimitive, MaterialData, AnimationClip, AnimationTrack, IModelLoader, TextureType } from './types';


export class ModelLoader implements IModelLoader {
    private gl: WebGL2RenderingContext;
    private loadedModels: Map<string, ModelData> = new Map();
    private gpuResources: IGPUResourceManager;
    private webio: WebIO;

    constructor(gl: WebGL2RenderingContext, gpuResources: IGPUResourceManager) {
        this.gl = gl;
        this.gpuResources = gpuResources;
        this.webio = new WebIO();
    }

    async loadModel(url: string): Promise<ModelId> {
        try {
            // Generate deterministic model ID from URL
            const modelId = this.generateModelId(url);
            
            // Check if already loaded
            if (this.loadedModels.has(modelId.id)) {
                return modelId;
            }

            // Load and parse GLB file
            const document = await this.webio.read(url);
            const modelData = await this.processDocument(document);
            
            // Store model data
            this.loadedModels.set(modelId.id, modelData);

            return {
                id: modelId.id,
                meshCount: modelData.meshes.length
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : 'Unknown error';
                
            throw this.createModelError(
                ModelErrorCode.LOAD_FAILED,
                `Failed to load model: ${errorMessage}`
            );
        }
    }

    getModelData(modelId: string): ModelData | null {
        return this.loadedModels.get(modelId) || null;
    }

    deleteModel(modelId: string): void {
        const modelData = this.loadedModels.get(modelId);
        if (!modelData) return;

        // Clean up GPU resources
        this.cleanupModelResources(modelData);
        this.loadedModels.delete(modelId);
    }

    private async processDocument(document: Document): Promise<ModelData> {
        const modelData: ModelData = {
            meshes: [],
            materials: [],
            animations: new Map(),
            jointData: []
        };

        await Promise.all([
            this.processMeshes(document, modelData),
            this.processMaterials(document, modelData),
            this.processAnimations(document, modelData),
            this.processJoints(document, modelData)
        ]);

        return modelData;
    }

    private async processMeshes(
        document: Document, 
        modelData: ModelData
    ): Promise<void> {
        const meshes = document.getRoot().listMeshes();
        
        for (const mesh of meshes) {
            const modelMesh: Mesh = {
                primitives: [],
                name: mesh.getName() || ''
            };

            for (const primitive of mesh.listPrimitives()) {
                const primData = await this.processPrimitive(primitive, document);
                modelMesh.primitives.push(primData);
            }

            modelData.meshes.push(modelMesh);
        }
    }

    private processPrimitive(
        primitive: Primitive,
        document: Document
    ): MeshPrimitive {
        const vao = this.gpuResources.createVertexArray();
        this.gl.bindVertexArray(vao);

        const attributes: MeshPrimitive['attributes'] = {};
        
        // Get position attribute first and validate
        const positionAttribute = primitive.getAttribute('POSITION');
        if (!positionAttribute) {
            throw this.createModelError(
                ModelErrorCode.INVALID_DATA,
                'Primitive missing required POSITION attribute'
            );
        }

        const TYPE_TO_SIZE: Record<string, number> = {
            SCALAR: 1,
            VEC2: 2,
            VEC3: 3,
            VEC4: 4,
            MAT2: 4,
            MAT3: 9,
            MAT4: 16
        };

        // Process vertex attributes
        for (const semantic of primitive.listSemantics()) {
            const accessor = primitive.getAttribute(semantic)!;
            const buffer = this.createAttributeBuffer(accessor);
            attributes[semantic as AttributeSemantic] = buffer;

            const location = this.getAttributeLocation(semantic);
            this.gl.enableVertexAttribArray(location);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            
            const componentType = accessor.getComponentType();
            const elementSize = TYPE_TO_SIZE[accessor.getType()] ?? 1;
            const normalized = accessor.getNormalized();

            this.gl.vertexAttribPointer(
                location,
                elementSize,
                componentType,
                normalized,
                0,  // stride of 0 lets WebGL handle stride automatically
                0   // no offset needed
            );
        }

        // Process indices
        const indices = primitive.getIndices();
        const indexBuffer = indices ? this.createIndexBuffer(indices) : null;

        // Need to unbind buffers before unbinding VAO
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        this.gl.bindVertexArray(null);

        return {
            vao,
            material: this.getMaterialIndex(primitive, document),
            indexBuffer: indexBuffer!,
            indexCount: indices?.getCount() ?? 0,
            indexType: this.getIndexType(indices ?? null),
            vertexCount: positionAttribute.getCount(),
            hasSkin: !!primitive.getAttribute('JOINTS_0'),
            attributes
        };
    }

    private getMaterialIndex(primitive: Primitive, document: Document): number {
        const material = primitive.getMaterial();
        const materials = document.getRoot().listMaterials();
        return material ? materials.indexOf(material) : 0;
    }

    private async processMaterials(
        document: Document, 
        modelData: ModelData
    ): Promise<void> {
        const materials = document.getRoot().listMaterials();
        
        for (const material of materials) {
            const materialData: MaterialData = {
                program: this.gpuResources.getDefaultShader(),
                textures: new Map(),
                uniforms: {
                    u_BaseColorFactor: Array.from(material.getBaseColorFactor() || [1, 1, 1, 1]),
                    u_MetallicFactor: material.getMetallicFactor() ?? 1.0,
                    u_RoughnessFactor: material.getRoughnessFactor() ?? 1.0,
                    u_EmissiveFactor: Array.from(material.getEmissiveFactor() || [0, 0, 0])
                }
            };

            // Load textures
            const baseColorTexture = material.getBaseColorTexture();
            if (baseColorTexture) {
                materialData.textures.set(TextureType.BaseColor, await this.loadTexture(baseColorTexture));
            }

            // Add other texture types similarly...
            modelData.materials.push(materialData);
        }
    }

    private processAnimations(
        document: Document, 
        modelData: ModelData
    )  {
        const animations = document.getRoot().listAnimations();
        
        for (const animation of animations) {
            const clip: AnimationClip = {
                name: animation.getName() || '',
                duration: this.calculateAnimationDuration(animation),
                tracks: []
            };

            // Process each channel instead of sampler directly
            for (const channel of animation.listChannels()) {
                const sampler = channel.getSampler();
                const targetNode = channel.getTargetNode();
                
                if (!sampler || !targetNode) {
                    throw this.createModelError(
                        ModelErrorCode.INVALID_DATA,
                        'Animation channel missing sampler or target node'
                    );
                }

                // Add this: Get the target path (rotation, translation, or scale)
                const targetPath = channel.getTargetPath();
                if (targetPath !== 'translation' && 
                    targetPath !== 'rotation' && 
                    targetPath !== 'scale') {
                    continue; // Skip non-skeletal animation channels
                }

                const jointIndex = modelData.jointData.findIndex(
                    joint => joint.name === targetNode.getName()
                );

                if (jointIndex === -1) continue;

                // Modify to include transform type
                const track = this.processAnimationTrack(sampler, jointIndex, targetPath);
                clip.tracks.push(track);
            }

            modelData.animations.set(clip.name, clip);
        }
    }

    private processJoints(document: Document, modelData: ModelData) {
        const skins = document.getRoot().listSkins();
        if (skins.length === 0) return;

        const skin = skins[0];
        const joints = skin.listJoints();

        if (joints.length === 0) {
            throw this.createModelError(
                ModelErrorCode.INVALID_DATA,
                'Skin contains no joints'
            );
        }

        // Get all inverse bind matrices at once
        const inverseBindMatrices = skin.getInverseBindMatrices();
        if (!inverseBindMatrices) {
            throw this.createModelError(
                ModelErrorCode.INVALID_DATA,
                'Skin missing inverse bind matrices'
            );
        }

        const matrices = inverseBindMatrices.getArray();
        if (!matrices) {
            throw this.createModelError(
                ModelErrorCode.INVALID_DATA,
                'Failed to get inverse bind matrices data'
            );
        }

        modelData.jointData = joints.map((joint, index) => {
            // Get the inverse bind matrix for this joint (16 floats per matrix)
            const matrixOffset = index * 16;
            const inverseBindMatrix = new Float32Array(
                matrices.slice(matrixOffset, matrixOffset + 16)
            );

            // Get child indices, validating each one
            const children = joint.listChildren()
                .map(child => joints.indexOf(child as Node))
                .filter(idx => idx !== -1); // Remove any invalid indices

            return {
                index,
                name: joint.getName() || `joint_${index}`,
                inverseBindMatrix,
                children
            };
        });
    }

    private cleanupModelResources(modelData: ModelData): void {
        // Should null-check resources before deletion
        for (const mesh of modelData.meshes) {
            for (const primitive of mesh.primitives) {
                if (primitive.vao) this.gpuResources.deleteVertexArray(primitive.vao);
                if (primitive.indexBuffer) this.gpuResources.deleteBuffer(primitive.indexBuffer);
                
                // Clean up attribute buffers
                Object.values(primitive.attributes).forEach(buffer => {
                    if (buffer) this.gpuResources.deleteBuffer(buffer);
                });
            }
        }

        // Clean up textures
        for (const material of modelData.materials) {
            // Clean up all texture types
            for (const [_, texture] of material.textures) {
                if (texture) {
                    this.gpuResources.deleteTexture(texture);
                }
            }
        }
    }

    private createModelError(
        code: ModelErrorCode, 
        message: string
    ): ModelError {
        return createModelError(code, message);
    }

    private generateModelId(url: string): ModelId {
        // Simple hash function for URL
        const hash = Array.from(url).reduce(
            (hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 
            0
        );
        return {
            id: `model_${Math.abs(hash).toString(16)}`,
            meshCount: 0  // Will be updated after processing
        };
    }

    // Helper methods for buffer creation and texture loading...
    private createAttributeBuffer(accessor: Accessor): WebGLBuffer {
        const array = accessor.getArray();
        if (!array) {
            throw this.createModelError(
                ModelErrorCode.INVALID_DATA,
                'Accessor array is null'
            );
        }
        return this.gpuResources.createBuffer(array, this.gl.ARRAY_BUFFER);
    }

    private createIndexBuffer(accessor: Accessor): WebGLBuffer {
        const array = accessor.getArray();
        if (!array) {
            throw this.createModelError(
                ModelErrorCode.INVALID_DATA,
                'Index accessor array is null'
            );
        }
        return this.gpuResources.createBuffer(array, this.gl.ELEMENT_ARRAY_BUFFER);
    }

    private async loadTexture(textureNode: Texture): Promise<WebGLTexture> {
        const imageData = await textureNode.getImage();
        if (!imageData) {
            throw this.createModelError(ModelErrorCode.INVALID_DATA, 'Texture image data is null');
        }
        
        // Create a blob from the array buffer and convert to image
        const blob = new Blob([imageData], { type: 'image/png' });
        const imageUrl = URL.createObjectURL(blob);
        const image = await this.loadImage(imageUrl);
        URL.revokeObjectURL(imageUrl);

        const texture = this.gpuResources.createTexture(image);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        // Set texture parameters
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        
        return texture;
    }

    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    private getIndexType(accessor: Accessor | null): number {
        return accessor?.getComponentType() ?? this.gl.UNSIGNED_SHORT;
    }

    private calculateAnimationDuration(animation: Animation): number {
        let maxTime = 0;
        for (const sampler of animation.listSamplers()) {
            const inputAccessor = sampler.getInput();
            if (!inputAccessor) {
                throw this.createModelError(
                    ModelErrorCode.INVALID_DATA,
                    'Animation sampler missing input accessor'
                );
            }
            const times = inputAccessor.getArray();
            if (times && times.length > 0) {
                maxTime = Math.max(maxTime, times[times.length - 1]);
            }
        }
        return maxTime;
    }

    private processAnimationTrack(
        sampler: AnimationSampler, 
        jointIndex: number,
        transformType: 'translation' | 'rotation' | 'scale'
    ): AnimationTrack {
        const input = sampler.getInput();
        const output = sampler.getOutput();
        
        if (!input || !output) {
            throw this.createModelError(
                ModelErrorCode.INVALID_DATA,
                'Animation sampler missing input or output accessor'
            );
        }

        return {
            jointIndex,
            times: new Float32Array(input.getArray() || []),
            values: new Float32Array(output.getArray() || []),
            interpolation: sampler.getInterpolation(),
            transformType
        };
    }

    getAnimation(modelId: string, animationName: string): AnimationClip | undefined {
        const modelData = this.getModelData(modelId);
        return modelData?.animations.get(animationName);
    }

    private createGLBuffer(): WebGLBuffer {
        const buffer = this.gl.createBuffer();
        if (!buffer) {
            throw this.createModelError(
                ModelErrorCode.LOAD_FAILED,
                'Failed to create WebGL buffer'
            );
        }
        return buffer;
    }

    // Helper function to map semantics to attribute locations
    private getAttributeLocation(semantic: string): number {
        switch (semantic) {
            case 'POSITION': return 0;
            case 'NORMAL': return 1;
            case 'TEXCOORD_0': return 2;
            case 'JOINTS_0': return 3;
            case 'WEIGHTS_0': return 4;
            default: throw this.createModelError(
                ModelErrorCode.INVALID_DATA,
                `Unsupported attribute semantic: ${semantic}`
            );
        }
    }
}