Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const rimraf = require("rimraf");
const crypto = require("crypto");
const path = require("path");
const util_1 = require("util");
const rimrafAsync = util_1.promisify(rimraf);
class Utils {
    static random(floor, ceil) {
        return Math.round(floor + (ceil - floor) * Math.random());
    }
    static flatten(arr) {
        return arr.reduce((retArr, ele) => {
            return arr.concat(Array.isArray(ele) ? Utils.flatten(ele) : ele);
        }, []);
    }
    static splitDir(fp) {
        let dirList = path.normalize(fp).split(/\\|\//g);
        if (dirList[0] === '..') {
            dirList[1] = path.join(dirList[0], dirList[1]);
        }
        return dirList;
    }
}
const mkdirAsync = util_1.promisify(fs.mkdir);
const lstatAsync = util_1.promisify(fs.lstat);
const readdirAsync = util_1.promisify(fs.readdir);
const unlinkAsync = util_1.promisify(fs.unlink);
const renameAsync = util_1.promisify(fs.rename);
const writeFileAsync = util_1.promisify(fs.writeFile);
async function _mkdir(dir) {
    let exist = await isdir(dir);
    if (!exist) {
        await mkdirAsync(dir);
    }
    return !exist;
}
async function isdir(fp) {
    try {
        const stat = await lstatAsync(fp);
        return stat.isDirectory();
    }
    catch (e) {
        if (e['code'] === 'ENOENT') {
            return false;
        }
        throw (e);
    }
}
exports.isdir = isdir;
async function getFiles(dir) {
    const fileList = await readdirAsync(dir);
    const rtnFileList = [];
    for (let i = 0, ln = fileList.length; i < ln; i++) {
        const file = fileList[i];
        const fp = path.join(dir, file);
        let isDir = await isdir(dir);
        if (isDir) {
            let fpList = await getFiles(fp);
            rtnFileList.push(fpList);
        }
        else {
            let fpList = path.normalize(fp);
            rtnFileList.push(fpList);
        }
    }
    return rtnFileList;
}
exports.getFiles = getFiles;
async function listFiles(dir, includeExt = /.*/) {
    let testFn;
    if (typeof includeExt === 'string') {
        testFn = (dir) => path.extname(dir).replace('.', '') === includeExt;
    }
    else if (Array.isArray(includeExt)) {
        testFn = (dir) => includeExt.indexOf(path.extname(dir).replace('.', '')) > -1;
    }
    else if (includeExt === /.*/) {
        testFn = () => true;
    }
    else {
        testFn = (dir) => includeExt.test(path.extname(dir).replace('.', ''));
    }
    let fpList = await getFiles(dir);
    return Utils
        .flatten(fpList)
        .filter((fp) => testFn(fp));
}
exports.listFiles = listFiles;
function copy(dest, src) {
    return new Promise((resolve, reject) => {
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
exports.copy = copy;
async function mv(dest, src) {
    await copy(dest, src);
    await unlinkAsync(src);
    return dest;
}
exports.mv = mv;
exports.cut = mv;
function hashFile(fp, hashAlgorithm) {
    if (crypto.getHashes().indexOf(hashAlgorithm) < 0) {
        throw Error('insupport hash algorithm');
    }
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(hashAlgorithm);
        const rs = fs.createReadStream(fp);
        let hashStr = '';
        hash.on('readable', () => {
            const readData = hash.read();
            const data = Buffer.isBuffer(readData)
                ? readData
                : Buffer.from(readData);
            data && (hashStr += data.toString('hex'));
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
exports.hashFile = hashFile;
function md5(fp) {
    return hashFile(fp, 'md5');
}
exports.md5 = md5;
async function dirSize(dir) {
    let totalSize = 0;
    const fpList = await listFiles(dir);
    for (let i = 0, ln = fpList.length; i < ln; i += 1) {
        const info = await lstatAsync(fpList[i]);
        totalSize += info.size;
    }
    return totalSize;
}
exports.dirSize = dirSize;
async function renameExts(dir, extMap = {}) {
    let newDirList = [];
    const _extMap = Object.keys(extMap).reduce((map, ext) => {
        map[`.${ext}`] = `.${extMap[ext]}`;
        return map;
    }, {});
    const fpList = await listFiles(dir);
    for (let i = 0, ln = fpList.length; i < ln; i += 1) {
        const fp = fpList[i];
        const ext = path.extname(fp);
        if (ext in _extMap) {
            const nfp = path.join(dir, `${path.basename(fp, ext)}${_extMap[ext]}`);
            await renameAsync(fp, nfp);
        }
        else {
            newDirList.push(fp);
        }
    }
    return newDirList;
}
exports.renameExts = renameExts;
async function copydir(dest, src) {
    let copyFileList = [];
    await _mkdir(dest);
    const fileList = await readdirAsync(src);
    for (let i = 0, ln = fileList.length; i < ln; i++) {
        const file = fileList[i];
        const isDir = await isdir(path.join(src, file));
        const destPath = path.join(dest, file);
        const srcPath = path.join(src, file);
        const fpList = isDir
            ? await copydir(destPath, srcPath)
            : await copy(destPath, srcPath);
        copyFileList.push(fpList);
    }
    return copyFileList;
}
exports.copydir = copydir;
async function mkdirSimple(fp) {
    const loop = async function (dirs) {
        if (dirs.length) {
            const cdir = dirs[0];
            await _mkdir(cdir);
            let ndirs = dirs.slice(1);
            if (ndirs.length > 0) {
                ndirs[0] = path.join(cdir, ndirs[0]);
            }
            return loop(ndirs);
        }
        return fp;
    };
    return loop(Utils.splitDir(fp));
}
exports.mkdirSimple = mkdirSimple;
async function rmdirSimple(dir) {
    await rimrafAsync(dir);
    return dir;
}
exports.rmdirSimple = rmdirSimple;
async function writeFileSimple(fp, data) {
    await mkdirSimple(Utils.splitDir(fp).slice(0, -1).join(path.sep));
    await writeFileAsync(fp, data);
    return fp;
}
exports.writeFileSimple = writeFileSimple;
function windowsNameSafe(name) {
    const replacerList = [
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
    return replacerList.reduce((name, replacer) => name.replace(replacer[0], replacer[1]), name);
}
exports.windowsNameSafe = windowsNameSafe;
