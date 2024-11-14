/// <reference lib="dom" />

import { MaterialSystem } from './GPUResourceManager';
import { Model } from './Model';

// Core identification types
export interface ModelId {
    readonly id: string;
    readonly meshCount: number;
}

export interface InstanceId {
    readonly id: number;
    readonly modelId: string;
}

// Transform and animation
export interface Transform {
    position: Float32Array;
    rotation: Float32Array;
    scale: Float32Array;
}

export interface AnimationState {
    currentAnimation: string | null;
    currentTime: number;
    speed: number;
    blendFactor?: number;
    loop: boolean;
}

// Mesh and GPU resources
export interface MeshPrimitive {
    vao: WebGLVertexArrayObject;
    material: number;
    indexBuffer: WebGLBuffer;
    indexCount: number;
    indexType: number;
    vertexCount: number;
    hasSkin: boolean;
    attributes: {
        POSITION?: WebGLBuffer;
        NORMAL?: WebGLBuffer;
        TEXCOORD_0?: WebGLBuffer;
        JOINTS_0?: WebGLBuffer;
        WEIGHTS_0?: WebGLBuffer;
    };
}

export interface Mesh {
    primitives: MeshPrimitive[];
    name: string;
}

// Materials
export interface MaterialData {
    program: WebGLProgram;
    textures: Map<string, WebGLTexture>;
    uniforms?: Record<string, number | boolean | number[]>;
}

// Define a fixed mapping from sampler names to texture units
export const SAMPLER_TEXTURE_UNIT_MAP: Record<string, number> = {
    'u_BaseColorSampler': 0,
    'u_NormalSampler': 1,
    'u_MetallicRoughnessSampler': 2,
    'u_OcclusionSampler': 3,
    'u_EmissiveSampler': 4,
    // Add more samplers here as needed
};

// Animation
export interface AnimationClip {
    name: string;
    duration: number;
    tracks: AnimationTrack[];
}

export type SkeletalTransformType = 'translation' | 'rotation' | 'scale';
export type InterpolationType = 'LINEAR' | 'STEP' | 'CUBICSPLINE';

export interface AnimationTrack {
    jointIndex: number;
    times: Float32Array;
    values: Float32Array;
    interpolation: InterpolationType;
    transformType: SkeletalTransformType;
}

// Instance data
export interface InstanceData {
    readonly instanceId: InstanceId;
    transform: Transform;
    animationState: AnimationState;
    jointMatrices: Float32Array;
    worldMatrix: Float32Array;
}

// Main class interfaces
export interface IModelLoader {
    loadModel(url: string): Promise<ModelId>;
    getModelData(modelId: string): ModelData | null;
    deleteModel(modelId: string): void;
    getAnimation(modelId: string, animationName: string): AnimationClip | undefined;
}

export interface IInstanceManager {
    setModelPosition(x: number, y: number, z: number, instance: Model): void;
    setModelRotation(quaternion: Float32Array, instance: Model): void;
    setModelScale(x: number, y: number, z: number, instance: Model): void;
    playModelAnimation(name: string, instance: Model, options?: AnimationOptions): void;
    stopModelAnimation(instance: Model): void;
}

export interface IModel {
    readonly instanceId: InstanceId;
    setPosition(x: number, y: number, z: number): void;
    setRotation(quaternion: Float32Array): void;
    setScale(x: number, y: number, z: number): void;
    playAnimation(name: string, options?: AnimationOptions): void;
    stopAnimation(): void;
}

export enum TextureType {
    BaseColor,
    MetallicRoughness,
    Normal,
    Occlusion,
    Emissive
}

// Supporting interfaces
export interface ModelData {
    meshes: Mesh[];
    materials: MaterialData[];
    animations: Map<string, AnimationClip>;
    jointData: JointData[];
}

export interface JointData {
    index: number;
    name: string;
    inverseBindMatrix: Float32Array;
    children: number[];
}

export interface AnimationOptions {
    loop?: boolean;
    speed?: number;
    blendDuration?: number;
}

export type BufferUsage = WebGL2RenderingContext['STATIC_DRAW'] | WebGL2RenderingContext['DYNAMIC_DRAW'];

// GPU resource management
export interface IGPUResourceManager {
    createBuffer(data: BufferSource, usage: BufferUsage): WebGLBuffer;
    createTexture(image: ImageData | HTMLImageElement): WebGLTexture;
    deleteBuffer(buffer: WebGLBuffer): void;
    deleteTexture(texture: WebGLTexture): void;
    deleteVertexArray(vao: WebGLVertexArrayObject): void;
    createVertexArray(): WebGLVertexArrayObject;
    getShader(modelId: string): WebGLProgram | null;
    getDefaultShader(): WebGLProgram;
    createIndexBuffer(data: BufferSource, usage: BufferUsage): WebGLBuffer;
    bindMaterial(materialIndex: number, shader: WebGLProgram): void;
    addMaterial(material: MaterialData): void;
}

// Add this type definition
export type AttributeSemantic = 'POSITION' | 'NORMAL' | 'TEXCOORD_0' | 'JOINTS_0' | 'WEIGHTS_0';