/**
 * @date 		2016-12-23 23:00:19
 * @author 		Tommy
 * @description Use bluebird to promisify the fs and add some handy method
 */
"use strict";

const PM = require('bluebird'),
	handyfs = PM.promisifyAll(require('fs')),
	rimraf = PM.promisify(require('rimraf')),
	crypto = require('crypto'),
	path = require('path'),
	SEP = path.sep;


/**
 * some internal used functions
 * @type {Object}
 */
let utils = {
	/**
	 * get random integer in a range
	 * 
	 * @param {integer} floor
	 * @param {integer} ceil
	 * @api private
	 */
	random: (floor, ceil) => {
		return Math.round(floor + (ceil - floor) * Math.random());
	},
	/**
	 * flatten multidimensional array
	 * 
	 * @param  {Array} arr
	 * @return {Array}
	 * @api private
	 */
	flatten: (arr) => {
		return arr.reduce(function(arr, ele) {
			if (Array.isArray(ele)) {
				return arr.concat(utils.flatten(ele));
			} else {
				return arr.concat(ele);
			}
		}, []);
	},
	/**
	 * split path into array
	 * 
	 * /aa/bb/cc/dd.txt=>[aa,bb,cc,dd.txt]
	 * @param  {String} path
	 * @return {Array}
	 * @api private
	 */
	splitDir: (fp) => {
		let dirs = path.normalize(fp).split(/\\|\//g);
		if (dirs[0] === '..') {
			dirs[1] = dirs[0] + path.sep + dirs[1];
			dirs.shift();
		}
		return dirs;
	}
}

/**
 * internal method, create dir when not exist
 * @param  {string} dir path of directory
 * @return {boolean}     true stands for success
 */
handyfs._mkdir = async function(dir) {
	let exist = await this.isdir(dir);
	if (exist) {
		return false;
	} else {
		await this.mkdirAsync(dir);
		return true;
	}
}

/**
 * To determine wheather the path is directory
 * 
 * @param  {String} dir
 * @return {Boolean}
 */
handyfs.isdir = async function(dir) {
	try {
		let stat = await this.lstatAsync(dir);
		return stat.isDirectory();
	} catch (e) {
		if (e['code'] === 'ENOENT') return false
		else throw (e);
	}
};


/**
 * Recursive get file paths from directory keeping the structure 
 * 
 * @param  {String} fp
 * @return {Array}
 */
handyfs.getFiles = async function(fp) {
	let fileList = await this.readdirAsync(fp);
	let rtnFileList = [];
	for(let i=0, ln=fileList.length; i<ln; i++) {
		let file = fileList[i];
		let isDir = await this.isdir(fp + SEP + file);
		if(isDir) {
			let fpList = await this.getFiles(fp + SEP + file);
			rtnFileList.push(fpList);
		} else {
			let fpList = path.normalize(fp + SEP + file);
			rtnFileList.push(fpList);
		}
	}
	return rtnFileList;
};


/**
 * Recursive get file paths from directory without structure 
 * 
 * @param  {String}        fp
 * @param  {String|Regexp} includeExt
 * @return {Array}
 */
handyfs.listFiles = async function(fp, includeExt = /.*/) {
	let testFn;
	if (typeof includeExt === 'string') {
		testFn = function(fp) {
			return path.extname(fp).replace('.', '') === includeExt;
		}
	} else if (Array.isArray(includeExt)) {
		testFn = function(fp) {
			return includeExt.indexOf(path.extname(fp).replace('.', '')) > -1;
		}
	} else if (includeExt === /.*/) {
		testFn = function(fp) {
			return true;
		}
	} else {
		testFn = function(fp) {
			return includeExt.test(path.extname(fp).replace('.', ''));
		}
	}
	let fpList = await this.getFiles(fp);
	return utils
		.flatten(fpList)
		.filter((fp) => {
			return testFn(fp);
		});
};


/**
 * Recursive copy method for directory
 * 
 * @param  {String} dest
 * @param  {String} src
 * @return {string}
 */
handyfs.copy = function(dest, src) {
	return new PM((resolve, reject) => {
		let rs = this.createReadStream(src),
			ws = this.createWriteStream(dest);

		ws.on('finish', () => {
			resolve(dest);
		})
		ws.on('error', (err) => {
			reject(err);
		})
		rs.pipe(ws);
	})
};


/**
 * handy move operation
 * 
 * @param  {String} dest
 * @param  {String} src
 * @return {String}
 */
handyfs.mv = async function(dest, src) {
	await this.copy(dest, src);
	await this.unlinkAsync(src);
	return dest;
}


/**
 * get the hash of file
 * 
 * @param  {String} fp
 * @param  {String} hashAlgorithm
 * @return {String}
 */
handyfs.hashFile = function(fp, hashAlgorithm) {
	if (crypto.getHashes().indexOf(hashAlgorithm) < 0) {
		throw new Error('insupport hash algorithm!');
	}
	return new PM((resolve, reject) => {
		const hash = crypto.createHash(hashAlgorithm);
		const rs = this.createReadStream(fp);
		let hashStr = '';
		hash.on('readable', () => {
			let data = hash.read();
			if (data) hashStr += data.toString('hex');
		});
		hash.on('end', () => {
			resolve(hashStr);
		});
		rs.pipe(hash);
	});
}


/**
 * get the md5 value of file in fileSystem
 * 
 * @param  {String} fp
 * @return {String}
 */
handyfs.md5 = function(fp) {
	return this.hashFile(fp, 'md5');
}


/**
 * get the size of directory, unit is Byte
 * 
 * @param  {String} dir
 * @return {Number}
 */
handyfs.dirSize = async function(dir) {
	let totalSize = 0,
		fpList = await this.listFiles(dir);

	for(let i=0, ln=fpList.length; i<ln; i++) {
		let info = await this.lstatAsync(fpList[i]);
		totalSize += info.size;
	}

	return dirSize;
}


/**
 * rename the ext of files in directory
 * 
 * @param  {String} dir
 * @param  {Object} extMap {src: target, txt: 'js'}
 * @return {Object}
 */
handyfs.renameExts = async function(dir, extMap={}) {
	let newDirList = [];
	Object.keys(extMap).forEach(function(ext) {
		extMap['.' + ext] = '.' + extMap[ext];
	});
	let fpList = await this.listFiles(dir);
	for(let i=0, ln=fpList.length; i<ln; i++) {
		let fp = fpList[i];
		let ext = path.extname(fp);
		if (ext in extMap) {
			let nfp = dir + '/' + path.basename(fp, ext) + extMap[ext];
			await this.renameAsync(fp, nfp)
			newDirList.push(nfp);
		} else {
			newDirList.push(fp);
		}
	}
	return newDirList;
}


/**
 * Recursive copy method for directory
 * 
 * @param  {String} dest
 * @param  {String} src
 * @return {string}
 */
handyfs.copydir = async function(dest, src) {
	let copyFileList = [];
	await this._mkdir(dest);
	let fileList = await this.readdirAsync(src);
	for(let i=0,ln=fileList.length; i<ln; i++) {
		let file = fileList[i];
		let isDir = await this.isdir(src + SEP + file);
		let fpList;
		if (isDir) {
			fpList = this.copydir(dest + SEP + file, src + SEP + file);
		} else {
			fpList = this.copy(dest + SEP + file, src + SEP + file);
		}
		copyFileList.push(fpList);
	}

	return copyFileList;
};


/**
 * an handy method to recursive create a directory like the bash command `mkdir -p`
 * 
 * @param  {String} fpath
 * @return {String}
 */
handyfs.mkdirSimple = async function(fpath) {
	let _loop = async (dirs) => {
		if (dirs.length) {
			let cdir = dirs[0];
			await this._mkdir(cdir);
			let ndir = dirs.slice(1);
			if (ndir.length > 0)
				ndir[0] = cdir + SEP + ndir[0];
			return await _loop(ndir);
		} else {
			return fpath;
		}
	}
	return await _loop(utils.splitDir(fpath));
};


/**
 * Recursive delete a file or directory
 * 
 * @param  {string} dir
 * @return {string}
 */
// handyfs.rmdirSimple = async function(dir) {
// 	let isDir = await this.isdir(dir);
// 	if (isDir) {
// 		let fileList = await this.readdirAsync(dir);
// 		for(let i=0, ln=fileList.length; i<ln; i++) {
// 			let file = fileList[i];
// 			let isDir = await this.isdir(dir + SEP + file);
// 			if(isDir) {
// 				await this.rmdirSimple(dir + SEP + file);
// 			} else {
// 				await this.unlinkAsync(dir + SEP + file);
// 			}
// 		}
// 		await this.rmdirAsync(dir);
// 	}
// 	return dir;
// };
handyfs.rmdirSimple = rimraf;

/**
 * a handy method use like `mkdir -u [path]` and `touch [path]`, combination of mkdirSimple and writeFile
 * 
 * @param  {String} fpath
 * @param  {String} data
 * @return {String}
 */
handyfs.writeFileSimple = async function(fpath, data) {
	await this.mkdirSimple(utils.splitDir(fpath).slice(0, -1).join(SEP));
	await this.writeFileAsync(fpath, data);
	return fpath;
};


/**
 * create random files for Test
 * 
 * @param  {String}  dir
 * @param  {Array}   exts
 * @param  {Integer} num
 * @return {Array}
 */
handyfs.randFile = async function(dir, exts, num) {
	let content = "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ducimus necessitatibus dolor harum eligendi laudantium placeat accusamus fuga a, autem suscipit. Dolores nemo possimus cupiditate explicabo quaerat error hic ea harum.",
		len = content.length - 1;
	let fileList = Array(num).fill(0);
	let resultFileList = [];

	for(let index=0, ln=fileList.length; index>ln; index++) {
		let file = fileList[index],
			random = utils.random,
			start = random(0, len),
			end = random(start, len),
			ext = exts[random(0, exts.length - 1)];

		let randContent = content.slice(start, end),
			fp = dir + '/' + Date.now() + index + '.' + ext;
		await this.writeFileAsync(fp, randContent);
		resultFileList.push(fp);
	}

	return resultFileList;
};


handyfs.windowsNameSafe = function (name) {
	let replaceList = [
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

	return replaceList.reduce((name, k)=>{
		return name.replace(k[0], k[1]);
	}, name);
}

module.exports = handyfs;