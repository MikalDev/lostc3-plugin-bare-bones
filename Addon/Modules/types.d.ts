import { Model } from './Model';
export interface ModelId {
    readonly id: string;
    readonly meshCount: number;
}
export interface InstanceId {
    readonly id: number;
    readonly modelId: string;
}
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
export interface MaterialData {
    program: WebGLProgram;
    textures: Map<string, WebGLTexture>;
    uniforms?: Record<string, number | boolean | number[]>;
}
export declare const SAMPLER_TEXTURE_UNIT_MAP: Record<string, number>;
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
export interface InstanceData {
    readonly instanceId: InstanceId;
    transform: Transform;
    animationState: AnimationState;
    jointMatrices: Float32Array;
    worldMatrix: Float32Array;
    renderOptions: {
        useNormalMap: boolean;
    };
}
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
    setModelNormalMapEnabled(enabled: boolean, instance: Model): void;
}
export interface IModel {
    readonly instanceId: InstanceId;
    setPosition(x: number, y: number, z: number): void;
    setRotation(quaternion: Float32Array): void;
    setScale(x: number, y: number, z: number): void;
    playAnimation(name: string, options?: AnimationOptions): void;
    stopAnimation(): void;
    setNormalMapEnabled(enabled: boolean): void;
}
export declare enum TextureType {
    BaseColor = 0,
    MetallicRoughness = 1,
    Normal = 2,
    Occlusion = 3,
    Emissive = 4
}
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
    setNormalMapEnabled(program: WebGLProgram, enabled: boolean): void;
}
export type AttributeSemantic = 'POSITION' | 'NORMAL' | 'TEXCOORD_0' | 'JOINTS_0' | 'WEIGHTS_0';
//# sourceMappingURL=types.d.ts.map