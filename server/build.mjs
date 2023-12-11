import * as esbuild from 'esbuild'
import * as fs from 'fs';
import requireResolvePlugin from '@chialab/esbuild-plugin-require-resolve';

const result = await esbuild.build({
    entryPoints: ['index.ts'],
    bundle: true,
    outfile: 'dist/index.js',
    external: ['@aws-sdk/*', 'better-sqlite3', 'express'],
    platform: 'node',
    metafile: true,
    sourcemap: true,
    plugins: [
        requireResolvePlugin(),
    ]
})
fs.writeFileSync('dist/meta.json', JSON.stringify(result.metafile, null, 2))
