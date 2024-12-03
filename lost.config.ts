import type { LostConfig } from 'jsr:@lost-c3/lib@3.0.0';

const config: LostConfig = {
    type: 'plugin',
    // deprecated?: boolean;
    // minConstructVersion?: string;
    canBeBundled: false,
    isSingleGlobal: true,
    objectName: 'Rendera',

    addonId: 'rendera',
    category: '3d',
    addonName: 'Rendera',
    addonDescription: 'Rendera is a 3D renderer for Construct 3',
    version: '1.0.0',
    author: 'Mikal',
    docsUrl: 'https://kindeyegames.itch.io/rendera',
    helpUrl: {
        EN: 'https://kindeyegames.itch.io/rendera'
    },
    websiteUrl: 'https://kindeyegames.itch.io/rendera',
    files: [
        { FileName: "draco_decoder_gltf.wasm", Type: 'copy-to-output' }
    ]
}

export default config;