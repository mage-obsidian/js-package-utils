import { jest } from '@jest/globals';
import createMockConfigResolver from '../__mocks__/configResolver.js';
import path from 'path';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let scenarios = [
    {
        scenario: 'a',
        themes: [
            {
                code: 'Vendor/theme-a',
                expected: {
                    tailwind: {
                        content: [
                            'magento_scenarios/app/code/Vendor/ModuleNameA/view/frontend/templates/**/*.phtml',
                            'magento_scenarios/app/code/Vendor/ModuleNameA/view/frontend/web/from_theme',
                            'magento_scenarios/app/code/Vendor/ModuleNameB/view/frontend/templates/**/*.phtml',
                            'magento_scenarios/app/code/Vendor/ModuleNameC/view/frontend/templates/**/*.phtml'
                        ]
                    }
                }
            },
            {
                code: 'Vendor/theme-b',
                expected: {
                    tailwind: {
                        content: [
                            'magento_scenarios/app/code/Vendor/ModuleNameA/view/frontend/templates/**/*.phtml',
                            'magento_scenarios/app/code/Vendor/ModuleNameA/view/frontend/web/from_theme',
                            'magento_scenarios/app/code/Vendor/ModuleNameB/view/frontend/templates/**/*.phtml',
                            'magento_scenarios/app/code/Vendor/ModuleNameC/view/frontend/templates/**/*.phtml'
                        ]
                    }
                }
            },
            {
                code: 'Vendor/theme-c',
                expected: {
                    tailwind: {}
                }
            },
            {
                code: 'Vendor/theme-d',
                expected: {
                    tailwind: {
                        theme: { extend: {} },
                        plugins: [],
                        content: [
                            'magento_scenarios/app/code/Vendor/ModuleNameA/view/frontend/templates/**/*.phtml',
                            'magento_scenarios/app/code/Vendor/ModuleNameB/view/frontend/templates/**/*.phtml'
                        ]
                    }
                }
            }
        ]
    }
];

for (const scenario of scenarios) {
    for (const themeKey in scenario.themes) {
        let theme = scenario.themes[themeKey];
        const expected = theme.expected;
        expected.tailwind.content = expected.tailwind.content?.map((content) => path.resolve(__dirname, '..', content));
    }
}


let scenariosForResolveFileByTheme = [
    {
        scenario: 'a',
        themes: [
            {
                code: 'Vendor/theme-a',
                moduleName: 'Vendor_ModuleNameA',
                filePath: 'module.config.js',
                includeTailwindConfigFromParentThemes: true,
                expected: 'magento_scenarios/app/design/frontend/Vendor/theme-a/Vendor_ModuleNameA/web/module.config.js'
            },
            {
                code: 'Vendor/theme-a',
                moduleName: 'Vendor_ModuleNameA',
                filePath: 'no_exist_file.js',
                includeTailwindConfigFromParentThemes: true,
                expected: null
            },
            {
                code: 'Vendor/theme-b',
                moduleName: 'Vendor_ModuleNameA',
                filePath: 'module.config.js',
                includeTailwindConfigFromParentThemes: true,
                expected: 'magento_scenarios/app/design/frontend/Vendor/theme-a/Vendor_ModuleNameA/web/module.config.js'
            },
            {
                code: 'Vendor/theme-b',
                moduleName: 'Vendor_ModuleNameA',
                filePath: 'module.config.js',
                includeTailwindConfigFromParentThemes: false,
                expected: null
            },
            {
                code: 'Vendor/theme-c',
                moduleName: 'Vendor_ModuleNameA',
                filePath: 'module.config.js',
                includeTailwindConfigFromParentThemes: true,
                expected: 'magento_scenarios/app/design/frontend/Vendor/theme-a/Vendor_ModuleNameA/web/module.config.js'
            },
            {
                code: 'Vendor/theme-c',
                moduleName: 'Vendor_ModuleNameB',
                filePath: 'module.config.js',
                includeTailwindConfigFromParentThemes: true,
                expected: 'magento_scenarios/app/design/frontend/Vendor/theme-c/Vendor_ModuleNameB/web/module.config.js'
            },
            {
                code: 'Vendor/theme-d',
                moduleName: 'Vendor_ModuleNameA',
                filePath: 'module.config.js',
                includeTailwindConfigFromParentThemes: false,
                expected: null
            },
            {
                code: 'Vendor/theme-d',
                moduleName: 'Vendor_ModuleNameA',
                filePath: 'module.config.js',
                includeTailwindConfigFromParentThemes: true,
                expected: null
            }
        ]
    }
];

for (const scenario of scenariosForResolveFileByTheme) {
    for (const themeKey in scenario.themes) {
        let theme = scenario.themes[themeKey];
        if (!theme.expected) continue;
        theme.expected = path.resolve(__dirname, '..', theme.expected)
    }
}

async function setupResolvers(scenario) {
    jest.unstable_mockModule('#service/configResolver.js', () => ({
        __esModule: true,
        default: createMockConfigResolver(scenario).default,
    }));
    const moduleResolver = await import('#service/moduleResolver.js');
    const themeResolver = await import('#service/themeResolverSync.js');

    return { moduleResolver, themeResolver };
}


describe('getModuleConfigByThemeConfig', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    test.each(scenarios.flatMap(({ scenario, themes }) =>
        themes.map(({ code, expected }) => ([ scenario, code, expected ]))
    ))('Scenario "%s", Theme "%s"', async ( scenario, code, expected ) => {
        const { themeResolver, moduleResolver } = await setupResolvers(scenario);
        const themeConfig = await themeResolver.getThemeConfig(code);
        const result = await moduleResolver.getModuleConfigByThemeConfig(code, themeConfig);
        expect(result).toEqual(
            expected,
            `Expected:\n${JSON.stringify(expected, null, 2)}\nReceived:\n${JSON.stringify(result, null, 2)}\nScenario: "${scenario}", Theme: "${code}"`
        );
    });
});

describe('resolveFileByTheme', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    test.each(scenariosForResolveFileByTheme.flatMap(({ scenario, themes }) =>
        themes.map(({ code, expected, moduleName, filePath, includeTailwindConfigFromParentThemes }) => ([scenario, code, expected, moduleName, filePath, includeTailwindConfigFromParentThemes]))
    ))('Scenario "%s", Theme "%s"', async ( scenario, code, expected, moduleName, filePath, includeTailwindConfigFromParentThemes ) => {
        const { moduleResolver } = await setupResolvers(scenario);
        const result = await moduleResolver.resolveFileByTheme(code, moduleName, filePath, includeTailwindConfigFromParentThemes);
        expect(result).toEqual(
            expected,
            `Expected:\n${JSON.stringify(expected, null, 2)}\nReceived:\n${JSON.stringify(result, null, 2)}\nScenario: "${scenario}", Theme: "${code}"`
        );
    });
});

