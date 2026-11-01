export default {
    multipass: true,
    plugins: [
        {
            name: 'preset-default',
            params: {
                overrides: {
                    removeMetadata: true,
                    removeEditorsNSData: true,
                },
            },
        },
        {
            // C2PA-метаданные приходят из handoff вместе с SVG.
            // В репозиторий и собранные ассеты они попадать не должны.
            name: 'removeC2PA',
            fn: () => ({
                element: {
                    enter: (node, parentNode) => {
                        if (node.name.startsWith('c2pa:')) {
                            parentNode.children = parentNode.children.filter(
                                (child) => child !== node,
                            );

                            return;
                        }

                        for (const name of Object.keys(node.attributes)) {
                            if (name === 'xmlns:c2pa' || name.startsWith('c2pa:')) {
                                delete node.attributes[name];
                            }
                        }
                    },
                },
            }),
        },
    ],
};
