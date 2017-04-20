# handy-fs

- functions in `class::fs`.
- functions of `class::fs` in promise style with `Async` suffix.
- handy extended functions
    + `#isdir(dir)`
    + `#getFiles(fp)`
    + `#listFiles(fp, includeExt = /.*/)`
    + `#copy(dest, src)`
    + `#mv(dest, src)`
    + `#hashFile(fp, hashAlgorithm)`
    + `#md5(fp)`
    + `#dirSize(dir)`
    + `#renameExts(dir, extMap={})`
    + `#copydir(dest, src)`
    + `#mkdirSimple(fpath)`
    + `#rmdirSimple(dir)`
    + `#writeFileSimple(fpath, data)`
    + `#randFile(dir, exts, num)`
