/// <reference types="node" />
interface DeepArray<T> extends Array<T | DeepArray<T>> { }
/* 深層次疊加的字符串數組 */
export type DeepStringArray = DeepArray<string>;
/**
 * 判斷路徑是否爲目錄
 * @param fp 路徑
 */
export function isdir(fp: string): Promise<boolean>;
/**
 * 尋找該目錄下的所有文件，數組結構安照目錄結構保持
 * @param dir 目錄的路徑
 */
export function getFiles(dir: string): Promise<any[]>;
/**
 * 列出指定後綴名的所有文件路徑
 * @param dir 目錄的路徑
 * @param includeExt 需要獲取文件的後綴
 */
export function listFiles(dir: string, includeExt: RegExp | string): Promise<DeepStringArray>;
/**
 * 複製文件
 * @param dest 複製的目的地
 * @param src 複製的源地址
 */
export function copy(dest: string, src: string): Promise<string>;
/**
 * 剪切文件
 * @param dest 剪切的目的地
 * @param src 剪切的源地址
 */
export function mv(dest: string, src: string): Promise<string>;
/**
 * 剪切文件，mv的別名
 * @param dest 剪切的目的地
 * @param src 剪切的源地址
 */
export function cut(dest: string, src: string): Promise<string>;
/**
 * 計算一個文件的哈希值
 * @param fp 文件的路徑
 * @param hashAlgorithm 哈希算法名
 */
export function hashFile(fp: string, hashAlgorithm: string): Promise<string>;
/**
 * 計算文件的MD5值
 * @param fp 文件的路徑
 */
export function md5(fp: string): Promise<string>;
/**
 * 計算一個路徑的體積
 * @param dir 目錄路徑
 */
export function dirSize(dir: string): Promise<number>;
/**
 * 將要修改的後綴名修改成指定的後綴名
 * @param dir 目錄的路徑
 * @param extMap 需要修改後綴名嘅映射表
 */
export function renameExts(dir: string, extMap: { [key: string]: string }): Promise<string[]>;
/**
 * 複製整個文件夾
 * @param dest 目的地目錄的路徑
 * @param src 源目錄的路徑
 */
export function copydir(dest: string, src: string): Promise<DeepStringArray>;
/**
 * 簡單地創建一個目錄，類似於bash中的`mkdir -p`
 * @param fp 想要創建的目錄的路徑
 */
export function mkdirSimple(fp: string): Promise<string>;
/**
 * 刪除目錄及其下的所有文件，使用的是rimraf
 * @param dir 目錄路徑
 */
export function rmdirSimple(dir: string): Promise<string>;
/**
 * 寫入內容到文件，路徑不存在會自動創建
 * @param fp 寫入文件的路徑
 * @param data 寫入的數據
 */
export function writeFileSimple(fp: string, data: Buffer | string): Promise<string>;
/**
 * 確保文件名喺windows操作系統下是合法的
 * @param name 文件名
 */
export function windowsNameSafe(name: string): string;