Just add something handy but commonly used functions to the `fs` module, the `rmdirSimple` method is just wrapper of [rimraf](https://github.com/isaacs/rimraf).

**funtions**:

- `isdir(fp: string): Promise<boolean>`
- `getFiles(dir: string): Promise<any[]>`
- `listFiles(dir: string, includeExt: RegExp | string = /.*/): Promise<string[]>`
- `copy(dest: string, src: string): Promise<string>`
- `mv(dest: string, src: string): Promise<string>`
- `cut(dest: string, src: string): Promise<string>`
- `hashFile(fp: string, hashAlgorithm: string): Promise<string>`
- `md5(fp: string): Promise<string>`
- `dirSize(dir: string): Promise<number>`
- `renameExts(dir: string, extMap: {[key:string]: string} = {}): Promise<string[]>`
- `copydir(dest: string, src: string): Promise<any[]>`
- `mkdirSimple(fp: string): Promise<string>`
- `rmdirSimple(dir: string): Promise<string>`
- `writeFileSimple(fp: string, data: Buffer|string): Promise<string>`
- `windowsNameSafe(name: string): string`