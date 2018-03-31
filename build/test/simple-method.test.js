Object.defineProperty(exports, "__esModule", { value: true });
const handyFS = require('../index');
const fs = require("fs");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
describe('mkdirSimple & rmdirSimple', function () {
    const mkDir = './testfsp/testfsp';
    const rmDir = './testfsp';
    describe('#mkdirSimple()', function () {
        it(`return path equal to the in path`, function () {
            return handyFS.mkdirSimple(mkDir).should.eventually.equal(mkDir);
        });
        it(`the create directory should exist`, function (done) {
            const succ = (stat) => {
                if (stat.isDirectory) {
                    done();
                }
                else {
                    done(Error('directory not exist'));
                }
            };
            fs.lstat(mkDir, function (err, stat) {
                if (err) {
                    done(err);
                }
                else {
                    succ(stat);
                }
            });
        });
        it(`when directory exist should not throw error`, function () {
            return handyFS.mkdirSimple(mkDir).should.eventually.equal(mkDir);
        });
    });
    describe('#rmdirSimple()', function () {
        it('return path equal to the in path', function () {
            return handyFS.rmdirSimple(rmDir).should.eventually.equal(rmDir);
        });
        it('deleted file should not exist', function (done) {
            fs.lstat(rmDir, function (err, stat) {
                if (err) {
                    done();
                }
                else {
                    done(Error('directory exist'));
                }
            });
        });
        it('when directory exist should not throw error', function () {
            return handyFS.rmdirSimple(rmDir).should.eventually.equal(rmDir);
        });
    });
});
describe('#writeFileSimple()', function () {
    const writeFilePath = './testfsp/testfsp/testfsp.txt';
    const rmDir = './testfsp';
    const writeFileContent = 'Consectetur reprehenderit non est tempor aliquip ad ullamco aliqua ipsum cillum laborum et esse.';
    after(function () {
        return handyFS.rmdirSimple(rmDir);
    });
    it('should return the same path', function () {
        return handyFS.writeFileSimple(writeFilePath, writeFileContent).should.eventually.equal(writeFilePath);
    });
    it('should correctly write the content', function (done) {
        fs.readFile(writeFilePath, { encoding: 'utf8' }, function (err, content) {
            if (err) {
                done(err);
            }
            else if (writeFileContent !== content) {
                done(Error('content not match!'));
            }
            else {
                done();
            }
        });
    });
});
