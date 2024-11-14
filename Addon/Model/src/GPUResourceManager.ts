import { ModelError, ModelErrorCode } from './errors';
import { MaterialData, IGPUResourceManager, SAMPLER_TEXTURE_UNIT_MAP } from './types';

export class GPUResourceManager implements IGPUResourceManager {
    private gl: WebGL2RenderingContext;
    private shaderSystem: ShaderSystem;
    private materialSystem: MaterialSystem;
    
    // Track resources for cleanup
    private buffers: Set<WebGLBuffer> = new Set();
    private textures: Set<WebGLTexture> = new Set();
    private vaos: Set<WebGLVertexArrayObject> = new Set();

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        this.shaderSystem = new ShaderSystem(gl);
        this.materialSystem = new MaterialSystem(gl, [], SAMPLER_TEXTURE_UNIT_MAP);
    }

    createBuffer(data: BufferSource, usage: number): WebGLBuffer {
        const buffer = this.gl.createBuffer();
        if (!buffer) {
            throw this.createError(
                ModelErrorCode.GL_ERROR,
                'Failed to create WebGL buffer'
            );
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, usage);
        this.buffers.add(buffer);

        return buffer;
    }

    createIndexBuffer(data: BufferSource, usage: number): WebGLBuffer {
        const buffer = this.gl.createBuffer();
        if (!buffer) {
            throw this.createError(
                ModelErrorCode.GL_ERROR,
                'Failed to create WebGL buffer'
            );
        }
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, data, usage);
        this.buffers.add(buffer);

        return buffer;
    }

    createTexture(image: ImageData | HTMLImageElement): WebGLTexture {
        const texture = this.gl.createTexture();
        if (!texture) {
            throw this.createError(
                ModelErrorCode.GL_ERROR,
                'Failed to create WebGL texture'
            );
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            image
        );
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.textures.add(texture);

        return texture;
    }

    deleteBuffer(buffer: WebGLBuffer): void {
        this.gl.deleteBuffer(buffer);
        this.buffers.delete(buffer);
    }

    deleteTexture(texture: WebGLTexture): void {
        this.gl.deleteTexture(texture);
        this.textures.delete(texture);
    }

    deleteVertexArray(vao: WebGLVertexArrayObject): void {
        this.gl.deleteVertexArray(vao);
        this.vaos.delete(vao);
    }

    createVertexArray(): WebGLVertexArrayObject {
        if (!this.gl) throw new Error('Error, no gl context');
        const vao = this.gl.createVertexArray();
        if (!vao) {
            throw this.createError(
                ModelErrorCode.GL_ERROR,
                'Failed to create WebGL vertex array object'
            );
        }
        this.vaos.add(vao);
        return vao;
    }

    // Resource cleanup
    dispose(): void {
        // Clean up all resources
        this.buffers.forEach(buffer => this.deleteBuffer(buffer));
        this.textures.forEach(texture => this.deleteTexture(texture));
        this.vaos.forEach(vao => this.deleteVertexArray(vao));
        this.shaderSystem.dispose();
    }

    private createError(code: ModelErrorCode, message: string): ModelError {
        return { name: 'ModelError', code, message };
    }

    getShader(modelId: string): WebGLProgram {
        const shader = this.shaderSystem.getProgram(modelId);
        if (!shader) {
            throw this.createError(
                ModelErrorCode.RESOURCE_NOT_FOUND,
                `Shader not found for model: ${modelId}`
            );
        }
        return shader;
    }

    getDefaultShader(): WebGLProgram {
        const vertexShader = `#version 300 es
        layout(location = 0) in vec3 position;
        layout(location = 1) in vec3 normal;
        layout(location = 2) in vec2 uv;
        layout(location = 3) in vec4 weights;
        layout(location = 4) in uvec4 joints;

        uniform mat4 u_Model;
        uniform mat4 u_View;
        uniform mat4 u_Projection;
        uniform mat4 u_JointMatrices[64];  // Maximum number of joints
        uniform mat3 u_NormalMatrix;

        out vec2 vUv;
        out vec3 vNormal;
        out vec3 vPosition;

        void main() {
            vUv = uv;
            vNormal = u_NormalMatrix * normal;
            vNormal = -vNormal;
            vPosition = (u_Model * vec4(position, 1.0)).xyz;
            gl_Position = u_Projection * u_View * u_Model * vec4(position, 1.0);
        }`;

        const fragmentShader = `#version 300 es
        precision highp float;

        in vec2 vUv;
        in vec3 vNormal;
        in vec3 vPosition;

        uniform vec3 lightPosition;
        uniform vec3 cameraPosition;
        uniform vec4 u_BaseColorFactor;
        uniform vec3 u_EmissiveFactor;
        uniform float u_MetallicFactor;
        uniform float u_RoughnessFactor;
        
        // Sampler uniforms with standardized names
        uniform sampler2D u_BaseColorSampler;
        uniform sampler2D u_NormalSampler;
        uniform sampler2D u_MetallicRoughnessSampler;
        uniform sampler2D u_OcclusionSampler;
        uniform sampler2D u_EmissiveSampler;

        layout(location = 0) out vec4 fragColor;

        void main() {
            vec3 fixedLightPosition = vec3(10, 0, 10);
            vec3 N = normalize(vNormal);
            vec3 L = normalize(fixedLightPosition - vPosition);

            float dummy = u_MetallicFactor + u_RoughnessFactor + u_EmissiveFactor.x;
            dummy = dummy * 0.0001;

            float NdotL = max(dot(N, L), 0.0);
            vec4 texColor = texture(u_BaseColorSampler, vUv);
            vec4 baseColor = texColor * u_BaseColorFactor;

            // Simple lighting calculation
            float ambient = 0.1;
            fragColor = vec4(baseColor.rgb * (ambient + NdotL), baseColor.a);
            // Debug visualization using normals as colors
            // vec3 normalColor = (N + 1.0) * 0.5; // Convert from [-1,1] to [0,1] range
            // fragColor = vec4(normalColor, 1.0);
        }`;

        return this.shaderSystem.createProgram(vertexShader, fragmentShader, 'default');
    }

    public bindMaterial(materialIndex: number, shader: WebGLProgram): void {
        this.materialSystem.bindMaterial(materialIndex, shader);
    }

    public addMaterial(material: MaterialData): void {
        this.materialSystem.addMaterial(material);
    }
}

// MaterialSystem for handling materials and shaders
export class MaterialSystem {
    private gl: WebGL2RenderingContext;
    private materials: Map<number, MaterialData>;
    private currentMaterial: number | null = null;
    private samplerTextureUnitMap: Record<string, number>;

    constructor(
        gl: WebGL2RenderingContext,
        materials: MaterialData[],
        samplerTextureUnitMap: Record<string, number>
    ) {
        this.gl = gl;
        this.materials = new Map(
            materials.map((mat, index) => [index, mat])
        );
        this.samplerTextureUnitMap = samplerTextureUnitMap;
    }

    addMaterial(material: MaterialData): void {
        this.materials.set(this.materials.size, material);
    }

    bindMaterial(materialIndex: number, shader: WebGLProgram): void {
        if (this.currentMaterial === materialIndex) return;

        const material = this.materials.get(materialIndex);
        if (!material) return;

        this.applyMaterial(material, shader);
        this.currentMaterial = materialIndex;
    }

    private applyMaterial(material: MaterialData, shader: WebGLProgram): void {
        // Bind textures to their fixed texture units based on sampler names
        material.textures.forEach((texture, samplerName) => {
            const textureUnit = this.samplerTextureUnitMap[samplerName];
            if (textureUnit === undefined) {
                console.warn(`No texture unit defined for sampler '${samplerName}'.`);
                return;
            }

            const location = this.gl.getUniformLocation(shader, samplerName);
            if (location === null) {
                // console.warn(`Uniform sampler '${samplerName}' not found in shader.`);
                return;
            }

            this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.uniform1i(location, textureUnit);
        });

        // Set material uniforms
        if (material.uniforms) {
            for (const [name, value] of Object.entries(material.uniforms)) {
                const location = this.gl.getUniformLocation(shader, name);
                if (location === null) continue;

                // Handle different uniform types
                if (Array.isArray(value)) {
                    switch (value.length) {
                        case 2:
                            this.gl.uniform2fv(location, value);
                            break;
                        case 3:
                            this.gl.uniform3fv(location, value);
                            break;
                        case 4:
                            this.gl.uniform4fv(location, value);
                            break;
                        case 16:
                            this.gl.uniformMatrix4fv(location, false, value);
                            break;
                        default:
                            console.warn(`Unhandled uniform array length for '${name}': ${value.length}`);
                    }
                } else if (typeof value === 'number') {
                    this.gl.uniform1f(location, value);
                } else if (typeof value === 'boolean') {
                    this.gl.uniform1i(location, value ? 1 : 0);
                } else {
                    console.warn(`Unhandled uniform type for '${name}': ${typeof value}`);
                }
            }
        }
    }
}

// ShaderSystem for managing shaders and programs
export class ShaderSystem {
    private gl: WebGL2RenderingContext;
    private currentProgram: WebGLProgram | null = null;
    private programs: Map<string, WebGLProgram> = new Map();

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
    }

    createProgram(
        vertexSource: string,
        fragmentSource: string,
        name: string
    ): WebGLProgram {
        const program = this.compileProgram(
            vertexSource,
            fragmentSource
        );
        this.programs.set(name, program);
        return program;
    }

    useProgram(name: string): void {
        const program = this.programs.get(name);
        if (!program) {
            throw this.createError(
                ModelErrorCode.RESOURCE_NOT_FOUND,
                `Shader program '${name}' not found`
            );
        }

        if (this.currentProgram !== program) {
            this.gl.useProgram(program);
            this.currentProgram = program;
        }
    }

    private compileProgram(
        vertexSource: string,
        fragmentSource: string
    ): WebGLProgram {
        const vertexShader = this.compileShader(vertexSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentSource, this.gl.FRAGMENT_SHADER);

        const program = this.gl.createProgram();
        if (!program) {
            throw this.createError(
                ModelErrorCode.GL_ERROR,
                'Failed to create shader program'
            );
        }

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        // Check for linking errors
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw this.createError(
                ModelErrorCode.GL_ERROR,
                `Failed to link shader program: ${info}`
            );
        }

        // Clean up individual shaders as they're no longer needed
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);

        return program;
    }

    private compileShader(source: string, type: number): WebGLShader {
        const shader = this.gl.createShader(type);
        if (!shader) {
            throw this.createError(
                ModelErrorCode.GL_ERROR,
                'Failed to create shader'
            );
        }

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        // Check for compilation errors
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw this.createError(
                ModelErrorCode.GL_ERROR,
                `Failed to compile ${type === this.gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader: ${info}`
            );
        }

        return shader;
    }

    private createError(code: ModelErrorCode, message: string): ModelError {
        return { name: 'ModelError', code, message };
    }

    getProgram(name: string): WebGLProgram {
        const program = this.programs.get(name);
        if (!program) {
            throw this.createError(
                ModelErrorCode.RESOURCE_NOT_FOUND,
                `Shader program '${name}' not found`
            );
        }
        return program;
    }

    dispose(): void {
        // Clean up all resources
        this.programs.forEach(program => this.gl.deleteProgram(program));
    }
}