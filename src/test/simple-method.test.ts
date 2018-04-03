import * as handyFS from '../index';
import * as fs from 'fs';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
chai.should();

describe('mkdirSimple & rmdirSimple', function() {
    const mkDir: string = './testfsp/testfsp';
    const rmDir: string = './testfsp';
    describe('#mkdirSimple()', function () {
        it(`return path equal to the in path`, function() {
            return handyFS.mkdirSimple(mkDir).should.eventually.equal(mkDir);
        });
        it(`the create directory should exist`, function(done) {
            const succ: Function = (stat: fs.Stats) => {
                if (stat.isDirectory) {
                    done();
                } else {
                    done(Error('directory not exist'));
                }
            };
            fs.lstat(mkDir, function(err: Error, stat: fs.Stats) {
                if (err) {
                    done(err);
                } else {
                    succ(stat);
                }
            });
        });
        it(`when directory exist should not throw error`, function() {
            return handyFS.mkdirSimple(mkDir).should.eventually.equal(mkDir);
        });
    });

    describe('#rmdirSimple()', function() {
        it('return path equal to the in path', function () {
            return handyFS.rmdirSimple(rmDir).should.eventually.equal(rmDir);
        });
        it('deleted file should not exist', function(done) {
            fs.lstat(rmDir, function (err: Error, stat: fs.Stats) {
                if (err) {
                    done();
                } else {
                    done(Error('directory exist'));
                }
            });
        });
        it('when directory exist should not throw error', function() {
            return handyFS.rmdirSimple(rmDir).should.eventually.equal(rmDir);
        });
    });
});

describe('#writeFileSimple()', function() {
    const writeFilePath = './testfsp/testfsp/testfsp.txt';
    const rmDir = './testfsp';
    const writeFileContent = 'Consectetur reprehenderit non est tempor aliquip ad ullamco aliqua ipsum cillum laborum et esse.';
    after(function () {
        return handyFS.rmdirSimple(rmDir);
    });

    it('should return the same path', function() {
        return handyFS.writeFileSimple(writeFilePath, writeFileContent).should.eventually.equal(writeFilePath);
    });

    it('should correctly write the content', function(done) {
        fs.readFile(writeFilePath, { encoding: 'utf8' }, function (err: Error, content: string) {
            if (err) {
                done(err);
            } else if (writeFileContent !== content) {
                done(Error('content not match!'));
            } else {
                done();
            }
        });
    });
});
