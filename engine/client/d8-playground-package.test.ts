import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {describe,it,expect} from 'vitest';

describe('D8 generated Playground project',()=>{
  it('embeds byte-exact source, resolves shared modules and archives the previous build',()=>{
    const root=path.join(process.cwd(),'campaigns/one-shot/playground');
    const version=readFileSync(path.join(root,'VERSION'),'utf8').trim();
    const current=readFileSync(path.join(root,'playground_current.json'),'utf8');
    expect(current).toBe(readFileSync(path.join(root,`playground_v${version}.json`),'utf8'));
    expect(readdirSync(root).filter(name=>/^playground_v\d+\.json$/.test(name))).toEqual([`playground_v${version}.json`]);
    expect(readdirSync(path.join(root,'historico'))).toContain(`playground_v${Number(version)-1}.json`);
    const payload=JSON.parse(JSON.parse(current).payload);
    expect(Buffer.from(payload.unicode,'base64').toString('utf8')).toBe(payload.code);
    const manifest=JSON.parse(payload.code),files=manifest.files as Record<string,string>;
    expect(manifest.entry).toBe('index.ts');
    expect(files['d8night.config.ts']).toContain(`D8_VERSION = "V${version}"`);
    for(const [name,source] of Object.entries(files)){
      expect(source).toBe(readFileSync(path.join(name.startsWith('engine/')?process.cwd():root,name),'utf8'));
      const ast=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true);
      expect((ast as any).parseDiagnostics,name).toHaveLength(0);
      for(const statement of ast.statements){
        if(!ts.isImportDeclaration(statement)&&!ts.isExportDeclaration(statement))continue;
        const module=statement.moduleSpecifier;
        if(!module||!ts.isStringLiteral(module)||!module.text.startsWith('.'))continue;
        const segments=name.split('/');segments.pop();
        for(const segment of module.text.split('/'))if(segment==='..')segments.pop();else if(segment&&segment!=='.')segments.push(segment);
        const resolved=segments.join('/');
        expect([resolved,resolved+'.ts',resolved+'.tsx',resolved+'.js',resolved+'.mjs'].some(candidate=>candidate in files),`${name} -> ${module.text}`).toBe(true);
      }
    }
    expect(files).toHaveProperty('engine/client/interior-camera.ts');
    expect(files).toHaveProperty('engine/client/camera-profile.ts');
    expect(files).toHaveProperty('engine/client/weather-surface.ts');
  });
});
