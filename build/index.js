const Bluebird = require("bluebird");
const fs = require("fs");
const rimraf = require("rimraf");
const crypto = require("crypto");
const path = require("path");
global.Promise = Bluebird;
const { promisify, promisifyAll } = Bluebird;
const rimrafAsync = promisify(rimraf);
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
const HandyFS = {
    mkdirAsync: promisify(fs.mkdir),
    lstatAsync: promisify(fs.lstat),
    readdirAsync: promisify(fs.readdir),
    unlinkAsync: promisify(fs.unlink),
    renameAsync: promisify(fs.rename),
    writeFileAsync: promisify(fs.writeFile),
    async _mkdir(dir) {
        let exist = await HandyFS.isdir(dir);
        if (!exist) {
            await HandyFS.mkdirAsync(dir);
        }
        return !exist;
    },
    async isdir(fp) {
        try {
            const stat = await HandyFS.lstatAsync(fp);
            return stat.isDirectory();
        }
        catch (e) {
            if (e['code'] === 'ENOENT') {
                return false;
            }
            throw (e);
        }
    },
    async getFiles(dir) {
        const fileList = await HandyFS.readdirAsync(dir);
        const rtnFileList = [];
        for (let i = 0, ln = fileList.length; i < ln; i++) {
            const file = fileList[i];
            const fp = path.join(dir, file);
            let isDir = await HandyFS.isdir(dir);
            if (isDir) {
                let fpList = await HandyFS.getFiles(fp);
                rtnFileList.push(fpList);
            }
            else {
                let fpList = path.normalize(fp);
                rtnFileList.push(fpList);
            }
        }
        return rtnFileList;
    },
    async listFiles(dir, includeExt = /.*/) {
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
        let fpList = await this.getFiles(dir);
        return Utils
            .flatten(fpList)
            .filter((fp) => testFn(fp));
    },
    copy(dest, src) {
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
    },
    async mv(dest, src) {
        await HandyFS.copy(dest, src);
        await HandyFS.unlinkAsync(src);
        return dest;
    },
    cut(dest, src) {
        return HandyFS.mv(dest, src);
    },
    hashFile(fp, hashAlgorithm) {
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
    },
    md5(fp) {
        return HandyFS.hashFile(fp, 'md5');
    },
    async dirSize(dir) {
        let totalSize = 0;
        const fpList = await HandyFS.listFiles(dir);
        for (let i = 0, ln = fpList.length; i < ln; i += 1) {
            const info = await HandyFS.lstatAsync(fpList[i]);
            totalSize += info.size;
        }
        return totalSize;
    },
    async renameExts(dir, extMap = {}) {
        let newDirList = [];
        const _extMap = Object.keys(extMap).reduce((map, ext) => {
            map[`.${ext}`] = `.${extMap[ext]}`;
            return map;
        }, {});
        const fpList = await HandyFS.listFiles(dir);
        for (let i = 0, ln = fpList.length; i < ln; i += 1) {
            const fp = fpList[i];
            const ext = path.extname(fp);
            if (ext in _extMap) {
                const nfp = path.join(dir, `${path.basename(fp, ext)}${_extMap[ext]}`);
                await HandyFS.renameAsync(fp, nfp);
            }
            else {
                newDirList.push(fp);
            }
        }
        return newDirList;
    },
    async copydir(dest, src) {
        let copyFileList = [];
        await this._mkdir(dest);
        const fileList = await HandyFS.readdirAsync(src);
        for (let i = 0, ln = fileList.length; i < ln; i++) {
            const file = fileList[i];
            const isDir = await HandyFS.isdir(path.join(src, file));
            const destPath = path.join(dest, file);
            const srcPath = path.join(src, file);
            const fpList = isDir
                ? await this.copydir(destPath, srcPath)
                : await this.copy(destPath, srcPath);
            copyFileList.push(fpList);
        }
        return copyFileList;
    },
    async mkdirSimple(fp) {
        const loop = async function (dirs) {
            if (dirs.length) {
                const cdir = dirs[0];
                await HandyFS._mkdir(cdir);
                let ndirs = dirs.slice(1);
                if (ndirs.length > 0) {
                    ndirs[0] = path.join(cdir, ndirs[0]);
                }
                return loop(ndirs);
            }
            return fp;
        };
        return loop(Utils.splitDir(fp));
    },
    async rmdirSimple(dir) {
        await rimrafAsync(dir);
        return dir;
    },
    async writeFileSimple(fp, data) {
        await HandyFS.mkdirSimple(Utils.splitDir(fp).slice(0, -1).join(path.sep));
        await HandyFS.writeFileAsync(fp, data);
        return fp;
    },
    windowsNameSafe(name) {
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
    },
};
module.exports = Object.assign({}, HandyFS, promisifyAll(fs));
