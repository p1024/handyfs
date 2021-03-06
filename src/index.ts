/**
 * @description 呢個模塊是對fs模塊的一些擴充，增加一些常用的文件操作方法
 * @author p1024
 */
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import * as crypto from 'crypto';
import * as path from 'path';
import { promisify } from 'util';

const rimrafAsync = promisify(rimraf);
interface DeepArray<T> extends Array<T | DeepArray<T>> { }
/* 深層次疊加的字符串數組 */
export type DeepStringArray = DeepArray<string>;

class Utils {
    /**
     * 生成一個範圍內的隨機整數
     * @param floor 隨機數的下限
     * @param ceil 隨機數的上限
     */
    static random(floor: number, ceil: number): number {
        return Math.round(floor + (ceil - floor) * Math.random());
    }
    /**
     * 平展多維數組
     * @param arr 等待平展的數組
     */
    static flatten(arr: any[]): any[] {
        return arr.reduce((retArr, ele) => {
            return retArr.concat(Array.isArray(ele) ? Utils.flatten(ele) : ele);
        }, []);
    }
    /**
     * 分割路徑到數組
     * @param fp 文件路徑
     */
    static splitDir(fp: string): string[] {
        let dirList = path.normalize(fp).split(/\\|\//g);
        if (dirList[0] === '..') {
            dirList[1] = path.join(dirList[0], dirList[1]);
        }
        return dirList;
    }
}

const mkdirAsync = promisify(fs.mkdir);
const lstatAsync = promisify(fs.lstat);
const readdirAsync = promisify(fs.readdir);
const unlinkAsync = promisify(fs.unlink);
const renameAsync = promisify(fs.rename);
const writeFileAsync = promisify(fs.writeFile);
/**
 * 安全地創建目錄，當已經存在的時候，唔會拋出錯誤
 * @param dir 待創建目錄路徑
 */
async function _mkdir(dir: string): Promise<boolean> {
    let exist: boolean = await isdir(dir);
    if (!exist) {
        await mkdirAsync(dir);
    }
    return !exist;
}

/**
 * 判斷路徑是否爲目錄
 * @param fp 路徑
 */
export async function isdir(fp: string): Promise<boolean> {
    try {
        const stat: fs.Stats = await lstatAsync(fp);
        return stat.isDirectory();
    } catch (e) {
        if (e['code'] === 'ENOENT') {
            return false;
        }
        throw (e);
    }
}
/**
 * 尋找該目錄下的所有文件，數組結構安照目錄結構保持
 * @param dir 目錄的路徑
 */
export async function getFiles(dir: string): Promise<DeepStringArray> {
    const fileList: string[] = await readdirAsync(dir);
    const rtnFileList: DeepStringArray = [];
    for (let i = 0, ln = fileList.length; i < ln; i++) {
        const file: string = fileList[i];
        const fp: string = path.join(dir, file);
        if (await isdir(fp)) {
            let fpList: DeepStringArray = await getFiles(fp);
            rtnFileList.push(fpList);
        } else {
            let fpList: string = path.normalize(fp);
            rtnFileList.push(fpList);
        }
    }
    return rtnFileList;
}
/**
 * 列出指定後綴名的所有文件路徑
 * @param dir 目錄的路徑
 * @param includeExt 需要獲取文件的後綴
 */
export async function listFiles(dir: string, includeExt: RegExp | string = /.*/): Promise<string[]> {
    let testFn: Function;
    if (typeof includeExt === 'string') {
        testFn = (dir: string) => path.extname(dir).replace('.', '') === includeExt;
    } else if (Array.isArray(includeExt)) {
        testFn = (dir: string) => includeExt.indexOf(path.extname(dir).replace('.', '')) > -1;
    } else if (includeExt === /.*/) {
        testFn = () => true;
    } else {
        testFn = (dir: string) => includeExt.test(path.extname(dir).replace('.', ''));
    }
    let fpList = await getFiles(dir);
    return Utils
        .flatten(fpList)
        .filter((fp: string) => testFn(fp));
}
/**
 * 複製文件
 * @param dest 複製的目的地
 * @param src 複製的源地址
 */
export function copy(dest: string, src: string): Promise<string> {
    return new Promise((resolve: Function, reject: Function) => {
        const rs = fs.createReadStream(src);
        const ws = fs.createWriteStream(dest);
        ws.on('finish', () => {
            resolve(dest);
        });
        ws.on('error', (err) => {
            reject(err);
        });
        rs.pipe(ws);
    });
}
/**
 * 剪切文件
 * @param dest 剪切的目的地
 * @param src 剪切的源地址
 */
export async function mv(dest: string, src: string): Promise<string> {
    await copy(dest, src);
    await unlinkAsync(src);
    return dest;
}
/**
 * 剪切文件，mv的別名
 * @param dest 剪切的目的地
 * @param src 剪切的源地址
 */
export const cut: Function = mv;
/**
 * 計算一個文件的哈希值
 * @param fp 文件的路徑
 * @param hashAlgorithm 哈希算法名
 */
export function hashFile(fp: string, hashAlgorithm: string): Promise<string> {
    return new Promise((resolve: Function, reject: Function) => {
        /* 系統不支持該哈希算法 */
        if (crypto.getHashes().indexOf(hashAlgorithm) < 0) {
            reject(Error(`unsupported hash algorithm: ${hashAlgorithm}`));
        }
        const hash: crypto.Hash = crypto.createHash(hashAlgorithm);
        const rs: fs.ReadStream = fs.createReadStream(fp);
        let hashStr: string = '';
        hash.on('readable', () => {
            const readData = hash.read();
            if (readData) {
                const data: Buffer = Buffer.isBuffer(readData)
                    ? readData
                    : Buffer.from(readData);
                hashStr += data.toString('hex');
            }
        });
        hash.on('end', () => {
            resolve(hashStr);
        });
        hash.on('error', (err) => {
            reject(err);
        });
        rs.pipe(hash);
    });
}
/**
 * 計算文件的MD5值
 * @param fp 文件的路徑
 */
export function md5(fp: string): Promise<string> {
    return hashFile(fp, 'md5');
}
/**
 * 計算一個路徑的體積
 * @param dir 目錄路徑
 */
export async function dirSize(dir: string): Promise<number> {
    let totalSize = 0;
    const fpList: string[] = await listFiles(dir);
    for (let i: number = 0, ln = fpList.length; i < ln; i += 1) {
        const info: fs.Stats = await lstatAsync(fpList[i]);
        totalSize += info.size;
    }
    return totalSize;
}
/**
 * 將要修改的後綴名修改成指定的後綴名
 * @param dir 目錄的路徑
 * @param extMap 需要修改後綴名嘅映射表
 */
export async function renameExts(dir: string, extMap: { [key: string]: string } = {}): Promise<string[]> {
    let newDirList: string[] = [];
    const _extMap: { [key: string]: string } = Object.keys(extMap).reduce((map: { [key: string]: string }, ext: string) => {
        map[`.${ext}`] = `.${extMap[ext]}`;
        return map;
    }, {});
    const fpList: string[] = await listFiles(dir);
    for (let i = 0, ln = fpList.length; i < ln; i += 1) {
        const fp = fpList[i];
        const ext = path.extname(fp);
        if (ext in _extMap) {
            const nfp = path.join(dir, `${path.basename(fp, ext)}${_extMap[ext]}`);
            await renameAsync(fp, nfp);
            newDirList.push(nfp);
        } else {
            newDirList.push(fp);
        }
    }
    return newDirList;
}
/**
 * 複製整個文件夾
 * @param dest 目的地目錄的路徑
 * @param src 源目錄的路徑
 */
export async function copydir(dest: string, src: string): Promise<DeepStringArray> {
    let copyFileList: DeepStringArray = [];
    await _mkdir(dest);
    const fileList: string[] = await readdirAsync(src);
    for (let i = 0, ln = fileList.length; i < ln; i++) {
        const file: string = fileList[i];
        const isDir: boolean = await isdir(path.join(src, file));
        const destPath = path.join(dest, file);
        const srcPath = path.join(src, file);
        const fpList = isDir
            ? await copydir(destPath, srcPath)
            : await copy(destPath, srcPath);
        copyFileList.push(fpList);
    }
    return copyFileList;
}
/**
 * 簡單地創建一個目錄，類似於bash中的`mkdir -p`
 * @param fp 想要創建的目錄的路徑
 */
export async function mkdirSimple(fp: string): Promise<string> {
    const loop: Function = async function (dirs: string[]): Promise<string> {
        if (dirs.length) {
            const cdir: string = dirs[0];
            await _mkdir(cdir);
            let ndirs: string[] = dirs.slice(1);
            if (ndirs.length > 0) {
                ndirs[0] = path.join(cdir, ndirs[0]);
            }
            return loop(ndirs);
        }
        return fp;
    };
    return loop(Utils.splitDir(fp));
}
/**
 * 刪除目錄及其下的所有文件，使用的是rimraf
 * @param dir 目錄路徑
 */
export async function rmdirSimple(dir: string): Promise<string> {
    await rimrafAsync(dir);
    return dir;
}
/**
 * 寫入內容到文件，路徑不存在會自動創建
 * @param fp 寫入文件的路徑
 * @param data 寫入的數據
 */
export async function writeFileSimple(fp: string, data: Buffer | string): Promise<string> {
    await mkdirSimple(Utils.splitDir(fp).slice(0, -1).join(path.sep));
    await writeFileAsync(fp, data);
    return fp;
}
/**
 * 確保文件名喺windows操作系統下是合法的
 * @param name 文件名
 */
export function windowsNameSafe(name: string): string {
    const replacerList: [RegExp, string][] = [
        [/\\/g, '-'],
        [/\//g, '-'],
        [/:/g, '-'],
        [/\*/g, ' '],
        [/\?/g, ' '],
        [/"/g, '\''],
        [/</g, '('],
        [/>/g, ')'],
        [/\|/g, '_']
    ];
    return replacerList.reduce((name: string, replacer: [RegExp, string]): string => name.replace(replacer[0], replacer[1]), name);
}