import { Plugin, Property } from 'jsr:@lost-c3/lib@3.0.0';
import config from "./lost.config.ts";

const Addon = new Plugin(config)

Addon
    .addFilesToOutput()

    .setRuntimeScripts()

//    .addRemoteScripts('https://cdn/index.js')

    /** @Properties  */
    .addPluginProperty('integer', 'Integer', { type: Property.Integer })
    .addPluginProperty('float', 'Float', { type: Property.Float })
    .addPluginProperty('percent', 'Percent', { type: Property.Percent })
    .addPluginProperty('text', 'Text', { type: Property.Text })
    .addPluginProperty('longText', 'Long Text', { type: Property.LongText })
    .addPluginProperty('check', 'Check', { type: Property.Checkbox })
    .addPluginProperty('font', 'Font', { type: Property.Font })
    .addPluginProperty('combo', 'Combo', {
        type: Property.Combo,
        items: [['item1', 'item2']]
    })
    .addPluginProperty('color', 'Color', { type: Property.Color, initialValue: [255, 210, 155] })
    .createGroup('group', 'Awesome Group')
        .addPluginProperty('info', 'Info', { type: Property.Info, info: 'Lost' })
        .addPluginProperty('link', 'Link', {
            type: Property.Link,
            callbackType: 'for-each-instance',
            callback: (inst) => {
                console.log('Link property for each instance');
            }
        })
        .addPluginProperty('link2', 'Link', {
            type: Property.Link,
            callbackType: 'once-for-type',
            callback: (type) => {
                console.log('Link property once for type');
            }
        })
;

export default Addon;
