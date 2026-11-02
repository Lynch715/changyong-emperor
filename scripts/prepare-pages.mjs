import {rm, readdir, mkdir} from 'node:fs/promises';
import path from 'node:path';

// 清理旧发布目录；仅标记文件无删除权限时，保留它并在构建末尾覆盖。
export async function preparePages(output, io = {rm, readdir, mkdir}) {
  try {
    await io.rm(output, {recursive: true, force: true});
  } catch (error) {
    if (error.code !== 'EPERM' || path.basename(error.path || '') !== '.nojekyll') throw error;
    for (const name of await io.readdir(output)) {
      if (name !== '.nojekyll') await io.rm(path.join(output, name), {recursive: true, force: true});
    }
  }
  await io.mkdir(path.join(output, 'src'), {recursive: true});
}
