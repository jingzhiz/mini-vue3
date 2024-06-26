import esbuild from 'esbuild'
import minimist from "minimist"
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename) // node中esm没有__dirname
const require = createRequire(import.meta.url) // 在esm中创建require

const argv = minimist(process.argv.slice(2))

const target = argv._[0] || 'reactivity'
const format = argv.f || 'iife' // iife 立即执行函数形式

const entry = resolve(__dirname, `../packages/${target}/src/index.ts`)
const pkg = require(`../packages/${target}/package.json`)

// 打包
const ctx = await esbuild.context({
  entryPoints: [entry], // 入口
  outfile: resolve(__dirname, `../packages/${target}/dist/${target}.js`), // 出口
  bundle: true, // 如果存在依赖关系则打包到一起
  platform: 'browser', // 目标平台
  sourcemap: true, // 允许调试
  format, // 模块化类型 cjs | esm | iife
  globalName: pkg.buildOption?.name
})

console.log('dev start')
ctx.watch()