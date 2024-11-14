import { MaterialData, IGPUResourceManager } from './types';
export declare class GPUResourceManager implements IGPUResourceManager {
    private gl;
    private shaderSystem;
    private materialSystem;
    private buffers;
    private textures;
    private vaos;
    constructor(gl: WebGL2RenderingContext);
    createBuffer(data: BufferSource, usage: number): WebGLBuffer;
    createIndexBuffer(data: BufferSource, usage: number): WebGLBuffer;
    createTexture(image: ImageData | HTMLImageElement): WebGLTexture;
    deleteBuffer(buffer: WebGLBuffer): void;
    deleteTexture(texture: WebGLTexture): void;
    deleteVertexArray(vao: WebGLVertexArrayObject): void;
    createVertexArray(): WebGLVertexArrayObject;
    dispose(): void;
    private createError;
    getShader(modelId: string): WebGLProgram;
    getDefaultShader(): WebGLProgram;
    bindMaterial(materialIndex: number, shader: WebGLProgram): void;
    addMaterial(material: MaterialData): void;
}
export declare class MaterialSystem {
    private gl;
    private materials;
    private currentMaterial;
    private samplerTextureUnitMap;
    constructor(gl: WebGL2RenderingContext, materials: MaterialData[], samplerTextureUnitMap: Record<string, number>);
    addMaterial(material: MaterialData): void;
    bindMaterial(materialIndex: number, shader: WebGLProgram): void;
    private applyMaterial;
}
export declare class ShaderSystem {
    private gl;
    private currentProgram;
    private programs;
    constructor(gl: WebGL2RenderingContext);
    createProgram(vertexSource: string, fragmentSource: string, name: string): WebGLProgram;
    useProgram(name: string): void;
    private compileProgram;
    private compileShader;
    private createError;
    getProgram(name: string): WebGLProgram;
    dispose(): void;
}
//# sourceMappingURL=GPUResourceManager.d.ts.map