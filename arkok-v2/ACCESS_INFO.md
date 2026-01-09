# 🚀 ArkOK V2 应用访问指南

## ✅ 应用启动状态

### 服务运行信息
- **状态**: ✅ 运行中
- **端口**: 3000
- **PID**: 64292
- **启动时间**: 2026-01-09 07:18:40
- **运行时长**: 约5分钟

### 健康检查结果
```json
{
  "success": true,
  "status": "healthy",
  "service": "arkok-v2-server",
  "version": "2.0.0",
  "environment": "development"
}
```

---

## 🌐 访问方式

### 方式1: 本地访问（推荐测试）
```bash
# 在DevBox终端访问
curl http://localhost:3000/health

# 或使用浏览器（如果支持端口转发）
http://localhost:3000
```

### 方式2: SSH端口转发
在你的本地电脑执行：
```bash
# Linux/Mac
ssh -L 3000:localhost:3000 devbox@101.126.5.123

# Windows PowerShell
ssh -L 3000:localhost:3000 devbox@101.126.5.123
```
然后在浏览器访问：`http://localhost:3000`

### 方式3: 直接公网访问
```
http://101.126.5.123:3000
```
⚠️ **注意**: 需要确保防火墙规则允许3000端口入站

---

## 📊 服务信息

### 主要功能页面
- **首页**: `http://localhost:3000`
- **新手村向导**: `http://localhost:3000/新手村向导.html`
- **赋能中心**: `http://localhost:3000/empowerment`
- **经验账户**: `http://localhost:3000/experience`
- **大屏数据**: `http://localhost:3000/bigscreen`

### API端点
- **健康检查**: `http://localhost:3000/health`
- **API路由**: `http://localhost:3000/api/*`

---

## 🔧 管理命令

### 查看日志
```bash
# 实时查看服务器日志
tail -f server.log

# 查看最近100行
tail -100 server.log
```

### 重启服务
```bash
# 查找进程ID
ps aux | grep ts-node-dev

# 停止服务
kill 64292

# 重新启动
cd server && nohup npm run dev > ../server.log 2>&1 &
```

### 停止服务
```bash
kill 64292
```

---

## 🔍 故障排查

### 服务无法访问？
1. 检查服务状态：`ps aux | grep ts-node-dev`
2. 查看日志：`tail -50 server.log`
3. 检查端口：`netstat -tlnp | grep 3000`
4. 测试健康检查：`curl http://localhost:3000/health`

### 需要重启服务？
```bash
# 一键重启脚本
kill 64292 && sleep 2 && cd server && nohup npm run dev > ../server.log 2>&1 &
```

---

## 📝 更新日志

### 2026-01-09 15:20
- ✅ 合并远程更新成功
- ✅ 新增任务映射配置
- ✅ 更新新手村向导.html
- ✅ 获取荣誉勋章系统
- ✅ 服务启动正常

### 合并内容
- **获取**: skillMapping.config.ts (任务-技能映射)
- **获取**: levelConfig.ts (等级配置)
- **获取**: 新手村向导.html (第七章等新内容)
- **获取**: 荣誉勋章图片 (gold/silver/bronze)
- **保留**: 本地大屏UI优化
- **保留**: 页面样式调整

---

## 🎯 下一步建议

1. **测试新增功能**
   - 检查新手村向导是否包含新章节
   - 验证任务映射是否生效
   - 测试荣誉勋章显示

2. **代码提交（可选）**
   ```bash
   git push origin main
   ```

3. **部署到生产（可选）**
   ```bash
   # 使用你的部署脚本
   ./deploy-public.sh
   ```

---

**文档生成时间**: 2026-01-09 15:23
**服务状态**: ✅ 正常运行
