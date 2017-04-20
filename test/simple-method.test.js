const handyFS = require('../index');
const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const should = chai.should();

console.log(__dirname)
describe('mkdirSimple & rmdirSimple', function () {
	const mkDir = './testfsp/testfsp/',
		  rmDir = './testfsp';
	describe('#mkdirSimple()', function () {
		it(`return path equal the in path`, function () {
			return handyFS.mkdirSimple(mkDir).should.eventually.equal(mkDir);
		});
		it(`the create directory should exist`, function (done) {
			fs.lstat(mkDir, function (err, stat) {
				if(err) {
					done(err)
				} else {
					if(stat.isDirectory()) {
						done();
					} else {
						done(new Error('directory not exist'));
					}
				}
			});
		});
		it(`when directory exist should not throw error`, function () {
			return handyFS.mkdirSimple(mkDir).should.eventually.equal(mkDir);
		});
	});

	describe('#rmdirSimple()', function () {
		it(`return path equal the in path`, function () {
			return handyFS.rmdirSimple(rmDir).should.eventually.equal(rmDir);
		});
		it(`deleted file should not exist`, function (done) {
			fs.lstat(rmDir, function (err, stat) {
				if(err) {
					done();
				} else {
					done(new Error('directory exist'));
				}
			});
		});
		it(`when directory exist should not throw error`, function () {
			return handyFS.rmdirSimple(rmDir).should.eventually.equal(rmDir);
		});
	});
});

describe('#writeFileSimple()', function () {
	const writeFilePath = `./testfsp/testfsp/testfsp.txt`
	     ,rmDir = `./testfsp`
	     ,writeFileContent = `Lorem ipsum dolor sit amet, consectetur adipisicing elit. Debitis facilis dolor quidem. Tempora nesciunt, quod impedit. Ipsam, voluptatem. Consequuntur eligendi quisquam, doloribus dolor aliquam magni quidem sint quas officiis quasi.`;
	     
	after(function () {
		return handyFS.rmdirSimple(rmDir);
	});
	
	it(`should return the same path`, function () {
		return handyFS.writeFileSimple(writeFilePath, writeFileContent).should.eventually.equal(writeFilePath);
	});
	it(`should correctly write the content`, function (done) {
		fs.readFile(writeFilePath, {encoding: 'utf8'}, function (err, content) {
			if(err) {
				done(err);
			} else if(writeFileContent!==content) {
				done(new Error('content not match'));
			} else {
				done();
			}
		})
	});
});