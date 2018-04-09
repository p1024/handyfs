import { promisify } from 'util';
import { exec } from 'child_process';
import * as HandyFS from '../index';
import * as fs from 'fs';
import * as chai from 'chai';
import { platform } from 'os';
import { createHash } from 'crypto';
import * as ChaiAsPromise from 'chai-as-promised';
import * as path from 'path';

chai.use(ChaiAsPromise);
chai.should();

const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const lstatAsync = promisify(fs.lstat);
const execAsync = promisify(exec);

describe('HandyFS unit test', function() {
    const BASEDIR = 'test';
    const DEEPFOLDERDIR = path.join(__dirname, './deepfolder');
    const DEEPSTRUCT = (dir: string = path.join(__dirname, 'deepfolder')) => {
        return [[path.join(dir, '1', '1.txt')], [], path.join(dir, '2.txt'), path.join(dir, '3.js')];
    };
    const DEEPFLATTEN = (dir: string = path.join(__dirname, 'deepfolder')) => {
        return [path.join(dir, '1', '1.txt'), path.join(dir, '2.txt'), path.join(dir, '3.js')];
    };
    const DEEPSIZE = 734;
    const LOREM = 'Ex exercitation cupidatat laboris labore velit officia anim. Est nulla cupidatat proident ex eiusmod sunt enim anim occaecat. Ipsum in dolor consequat sunt aute sit laboris velit do tempor reprehenderit nisi sint elit. Labore ex incididunt commodo sint excepteur irure proident qui eiusmod proident consequat dolor laboris. Non culpa nostrud eu nisi occaecat laboris.';
    before(async function() {
        await mkdirAsync(BASEDIR);
    });

    after(async function() {
        if (platform() === 'win32') {
            await execAsync(`rmdir /s/q ${BASEDIR}`);
        } else {
            await execAsync(`rm -R ${BASEDIR}`);
        }
    });

    describe('#isdir()', async function() {
        it('should return true when inspect a directory', async function () {
            const testDir = path.join(BASEDIR, 'isdirFolder');
            await mkdirAsync(testDir);
            const judge = await HandyFS.isdir(testDir);
            judge.should.equal(true);
        });
        it('should return false when inspect a file', async function() {
            const testDir = path.join(BASEDIR, 'isdirFile');
            await writeFileAsync(testDir, '');
            const judge = await HandyFS.isdir(testDir);
            judge.should.equal(false);
        });
        it('should return false when path is not exist', async function() {
            const testDir = path.join(BASEDIR, 'notexist');
            const judge = await HandyFS.isdir(testDir);
            judge.should.equal(false);
        });
    });

    describe('#getFiles()', function() {
        it('should return and the resut keep structure of the directory', async function() {
            const files = await HandyFS.getFiles(DEEPFOLDERDIR);
            files.should.deep.equal(DEEPSTRUCT());
        });
        it('should throw error when the path not exist', function() {
            const dirNotExist = path.join(BASEDIR, 'notexist');
            return HandyFS.getFiles(dirNotExist).should.be.rejected;
        });
    });

    describe('#listFiles()', function () {
        it('should return all the files in directory', async function() {
            const files = await HandyFS.listFiles(DEEPFOLDERDIR);
            files.should.deep.equal(DEEPFLATTEN());
        });
    });

    describe('#copy()', function() {
        it('dest file\'s content should equal to src files\'s', async function() {
            const src = path.join(BASEDIR, 'copysrc');
            const dest = path.join(BASEDIR, 'destsrc');
            await writeFileAsync(src, LOREM);
            await HandyFS.copy(dest, src);
            const content = await readFileAsync(src, { encoding: 'utf8' });
            content.should.equal(LOREM);
        });
    });

    describe('#mv()/#cut()', function() {
        it('correctly move file from src to dest and keep content completly', async function() {
            const src = path.join(BASEDIR, 'cutsrc');
            const dest = path.join(BASEDIR, 'destsrc');
            await writeFileAsync(src, LOREM);
            await HandyFS.mv(dest, src);
            const content = await readFileAsync(dest, { encoding: 'utf8' });
            content.should.equal(LOREM);
            return lstatAsync(src).should.be.rejected;
        });
    });

    describe('#hashFile()/#md5()', function() {
        const fp: string = path.join(BASEDIR, 'hashfile');
        beforeEach(function () {
            return writeFileAsync(fp, LOREM);
        });
        afterEach(function () {
            return unlinkAsync(fp);
        });
        it('should throw error when hash method not exist', function() {
            const unsupportedAlgorithm = 'unsupported';
            return HandyFS.hashFile(fp, unsupportedAlgorithm).should.be.rejectedWith(Error, `unsupported hash algorithm: ${unsupportedAlgorithm}`, 'not algorithm error');
        });
        it('should correctly calc the hash of file', function () {
            const hash = createHash('md5').update(LOREM).digest('hex');
            return HandyFS.hashFile(fp, 'md5').should.eventually.equal(hash);
        });
    });

    describe('#dirsize()', function() {
        it('should return the correct size of folder', function() {
            return HandyFS.dirSize(DEEPFOLDERDIR).should.eventually.equal(DEEPSIZE);
        });
    });

    describe('#renameExts()', function() {
        it('should correctly rename the exts', async function() {
            const copyFolderDir = path.join(BASEDIR, 'renamefolder');
            await mkdirAsync(copyFolderDir);
            if (platform() === 'win32') {
                console.log(`xcopy ${DEEPFOLDERDIR} ${copyFolderDir} /s/e`);
                await execAsync(`xcopy ${DEEPFOLDERDIR} ${copyFolderDir} /s/e`);
            }
            const newList = await HandyFS.renameExts(copyFolderDir, { js: 'txt' });
            newList.should.deep.equal(DEEPFLATTEN(copyFolderDir).map(dir => {
                return path.extname(dir) === '.js'
                    ? dir.slice(0, -3) + '.txt'
                    : dir;
            }));
        });
    });

    describe('#copydir()', function() {
        it('should correctly copy the folder and keep structor correct', function() {
            const copyFolderDir = path.join(BASEDIR, 'copydirfolder');
            return HandyFS.copydir(copyFolderDir, DEEPFOLDERDIR).should.eventually.deep.equal(DEEPSTRUCT(copyFolderDir));
        });
    });

    describe('#mkdirSimple()', function() {
        it('should create a deep directory folder', async function() {
            const deepFolderPath = path.join(BASEDIR, 'mkdirsimple', 'foo', 'bar', 'baz');
            await HandyFS.mkdirSimple(deepFolderPath);
            const stat = await lstatAsync(deepFolderPath);
            stat.isDirectory().should.equal(true);
        });
    });

    describe('#rmdirSimple()', function() {
        it('should remove a folder with folders and files', async function() {
            const dir = path.join(BASEDIR, 'rmdirsimple');
            await mkdirAsync(dir);
            await writeFileAsync(path.join(dir, 'foo.txt'), '');
            await mkdirAsync(path.join(dir, 'foo'));
            await HandyFS.rmdirSimple(dir);
            return lstatAsync(dir).should.eventually.be.rejected;
        });
    });

    describe('#writeFileSimple()', function() {
        it('create deep directory file if not exist and write', async function() {
            const dir = path.join(BASEDIR, 'writefilesimple', 'foo', 'bar.txt');
            await HandyFS.writeFileSimple(dir, LOREM);
            const content = await readFileAsync(dir, { encoding: 'utf8' });
            content.should.equal(LOREM);
        });
    });

    describe('#windowsNameSafe()', function() {
        it('should convert the unsupported character in windows path', function() {
            const dir = 'foo:baz\\c/foo *hello? "and" <world|program>';
            HandyFS.windowsNameSafe(dir).should.equal(`foo-baz-c-foo  hello  'and' (world_program)`);
        });
    });
});