# 项目说明（WeChat Mini Program - 俄罗斯方块）

这是一个微信小程序项目，用于开发俄罗斯方块小游戏。  
项目使用微信小程序框架（WXML / WXSS / JS / JSON）。

## 开发原则（非常重要）

### 🚫 禁止的行为
- 不要对整个项目进行全盘重构  
- 不要删除任何文件  
- 不要自动创建大量无关目录  
- 不要重写 app.js / app.json / project.config.json  
- 不要修改与俄罗斯方块功能无关的页面  
- 未经允许不要运行危险或破坏性的 shell 命令  

### ⚠ 必须遵守的规则
- 所有代码修改必须是“局部修改”，不要全部替换文件内容  
- 修改前必须解释你的修改方案  
- 遵循微信小程序官方规范（生命周期、事件处理等）  
- 对已有代码，只能补充或优化，不可重构其结构  
- 必须保持代码可读性，不要压缩或混淆  

### ✔ 允许的范围
- 在 `pages/tetris` 下新增 / 修改逻辑  
- 编写 canvas 绘制俄罗斯方块逻辑  
- 编写方块生成、旋转、碰撞检测  
- 优化渲染  
- 生成测试数据  

## 项目结构（请严格按照结构工作）

- 根目录：`project.config.json` / `project.private.config.json`（小程序配置），`package.json`（依赖与脚本），`tsconfig.json`，`typings/`（类型声明），`README.md`。
- `miniprogram/`：小程序主目录，包含全局 `app.ts` / `app.json` / `app.less` 与 `sitemap.json`。
- `miniprogram/components/navigation-bar/`：自定义导航栏组件，含 `.ts/.wxml/.less/.json`。
- `miniprogram/pages/`：业务页面目录。
  - `index/`：主页（俄罗斯方块主界面）。
  - `login/`：登录页面。
  - `logs/`：日志页面。
- `miniprogram/utils/util.ts`：通用工具函数。

## 自定义 Codex 命令（提供给 CLI 使用）

### /add-block-logic
在 `tetris.js` 中添加方块移动、旋转、碰撞检测等局部功能。

### /fix-bug
请在分析 bug 后，仅修改最小必要的代码片段。

### /render-tetris
优化 canvas 绘制但不改变结构。

### /explain
解释某段代码用途，不进行修改。

### /checkout-feature
切换到 `feature_version_init` 分支（跟踪远端）。

### /branch-status
执行 `git status --short --branch` 查看当前分支与工作区状态。

### /show-diff <file>
执行 `git diff <file>` 查看指定文件的工作区变更。

### /commit-changes
执行 `git commit -m "chore: add condition stub to private config"` 提交当前暂存区。

### /push-feature
执行 `git push origin feature_version_init` 推送到远端（需网络可用）。
