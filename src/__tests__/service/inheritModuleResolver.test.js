import { jest } from '@jest/globals';
import createMockConfigResolver from '../__mocks__/configResolver.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let scenarios = [
    {
        scenario: 'a',
        themes: [
            { code: 'Vendor/theme-a', codeImport: 'Vendor_ModuleNameA::js/test', expected: '/TEST/web/js/test.js' },
            { code: 'Vendor/theme-a', codeImport: 'Vendor_ModuleNameA::js/test.vue', expected: '/TEST/web/js/test.js' },
            { code: 'Vendor/theme-a', codeImport: 'Vendor_ModuleNameA::js/test.css', expected: undefined },
            { code: 'Vendor/theme-a', codeImport: 'Vendor_ModuleNameB::js/test', expected: undefined },
            { code: 'Vendor/theme-a', codeImport: null, expected: undefined },
            { code: 'Vendor/theme-b', codeImport: 'Vendor_ModuleNameA::js/unknown', expected: undefined }
        ]
    }
];

function mockConfigAndModules(scenario) {
    jest.mock(
        '#service/configResolver.cjs',
        () => createMockConfigResolver(scenario).default
    );
    jest.unstable_mockModule(
        '#service/moduleResolver.js',
        () => ({
            default: {
                getAllJsVueFilesWithInheritanceCached: jest.fn(() => ({
                    'Vendor_ModuleNameA/js/test': '/TEST/web/js/test.js',
                })),
            }
        })
    );
}

async function setupInheritModuleResolver(scenario) {
    mockConfigAndModules(scenario);
    const resolver = await import('#service/inheritModuleResolver.js');
    return resolver.default();
}

describe('inherit-resolver', () => {
    let inheritModuleResolver;

    beforeEach(() => {
        jest.resetModules();
    });

    test.each(scenarios.flatMap(({ scenario, themes }) =>
        themes.map(({ code, codeImport, expected }) => ([scenario, code, codeImport, expected]))
    ))('Scenario "%s", Theme "%s", Import "%s"', async (scenario, code, codeImport, expected) => {
        process.env.CURRENT_THEME = code;
        inheritModuleResolver = await setupInheritModuleResolver(scenario);
        const result = await inheritModuleResolver.resolveId.handler(codeImport);

        expect(result).toEqual(
            expected,
            `Scenario: "${scenario}"
            Theme: "${code}"
            Import: "${codeImport}"
            Expected: ${JSON.stringify(expected, null, 2)}
            Received: ${JSON.stringify(result, null, 2)}`
        );
    });
});