import type { LostConfig } from "jsr:@lost-c3/lib";

const Config: LostConfig<'plugin'> = {
    Type: 'plugin',
    Deprecated: false,

    SupportsWorkerMode: false,
    // MinConstructVersion: "LTS",
    CanBeBundled: false,
    IsSingleGlobal: true,

    ObjectName: 'Rendera',
    AddonId: 'rendera',
    AddonName: 'Rendera',
    AddonDescription: 'Rendera 3d models',
    Category: "other",
    Version: '1.0.0',
    Author: 'Mikal',
    WebsiteURL: `https://addon.com`,
    DocsURL: `https://docs.addon.com`,

    Files: [
        {FileName: "draco_decoder_gltf.wasm", Type: 'copy-to-output' }
    ]

};

export default Config;