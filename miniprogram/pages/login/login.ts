// login.ts - 微信授权登录页
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Component({
  data: {
    loading: false,
    error: '',
    canUseProfile: wx.canIUse('getUserProfile'),
    nickName: '',
    avatarUrl: defaultAvatarUrl,
    cloudWarning: '',
    nickInputFocus: false,
    nickInputMode: 'choose' as 'choose' | 'wechat' | 'custom',
  },
  lifetimes: {
    attached() {
      const loggedIn = wx.getStorageSync('loggedIn')
      if (loggedIn) {
        wx.showModal({
          title: '已登录',
          content: '检测到已登录用户，是否直接进入游戏？',
          cancelText: '切换账户',
          confirmText: '进入游戏',
          success: (res) => {
            if (res.confirm) {
              wx.redirectTo({ url: '/pages/index/index' })
            }
          },
        })
      }
    },
  },
  methods: {
    fetchProfile(part: 'avatar' | 'nickname') {
      if (!this.data.canUseProfile) {
        wx.showModal({
          title: '提示',
          content: '当前微信版本过低，请升级后再尝试',
          showCancel: false,
        })
        return
      }
      if (this.data.loading) return
      this.setData({ loading: true, error: '' })
      wx.getUserProfile({
        desc: '用于游戏内展示头像昵称',
        success: (res) => {
          const { nickName, avatarUrl } = res.userInfo || {}
          const update: Record<string, string> = {}
          if (part === 'avatar' && avatarUrl) {
            update.avatarUrl = avatarUrl
          }
          if (part === 'nickname' && nickName) {
            update.nickName = nickName
          }
          if (Object.keys(update).length === 0) {
            this.setData({ error: '未获取到微信资料，请重试或手动设置' })
            return
          }
          this.setData({ ...update })
        },
        fail: () => {
          this.setData({ error: '获取微信资料失败，请重试或手动设置' })
        },
        complete: () => {
          this.setData({ loading: false })
        },
      })
    },
    fillWeChatAvatar() {
      this.fetchProfile('avatar')
    },
    fillWeChatNickname() {
      this.fetchProfile('nickname')
    },
    chooseNickname() {
      wx.showActionSheet({
        itemList: ['使用微信昵称', '自定义输入'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.fillWeChatNickname()
            this.setData({ nickInputMode: 'wechat', nickInputFocus: false })
          } else if (res.tapIndex === 1) {
            this.setData({ error: '', nickInputMode: 'custom', nickInputFocus: true })
          }
        },
      })
    },
    onNickBlur() {
      this.setData({ nickInputFocus: false })
    },
    handleProfileLogin() {
      if (this.data.loading) return
      if (!this.data.canUseProfile) {
        wx.showModal({
          title: '提示',
          content: '当前微信版本过低，请升级后再尝试登录',
          showCancel: false,
        })
        return
      }
      this.setData({ loading: true, error: '' })
      wx.getUserProfile({
        desc: '用于游戏内展示头像昵称',
        success: async (res) => {
          try {
            await this.saveUserToCloud(res.userInfo)
            wx.showToast({ title: '登录成功', icon: 'success', duration: 1000 })
            wx.redirectTo({ url: '/pages/index/index' })
          } catch (error) {
            const message = (error as Error)?.message || '登录失败，请稍后重试'
            this.setData({ error: message })
          }
        },
        fail: () => {
          this.setData({ error: '授权失败，请重试' })
        },
        complete: () => {
          this.setData({ loading: false })
        },
      })
    },
    async handleCustomLogin() {
      if (this.data.loading) return
      const name = (this.data.nickName || '').trim()
      if (!name) {
        this.setData({ error: '请输入昵称后再登录' })
        return
      }
      const userInfo = {
        nickName: name,
        avatarUrl: this.data.avatarUrl || defaultAvatarUrl,
      }
      this.setData({ loading: true, error: '' })
      try {
        await this.saveUserToCloud(userInfo)
        wx.showToast({ title: '登录成功', icon: 'success', duration: 1000 })
        wx.redirectTo({ url: '/pages/index/index' })
      } catch (error) {
        const message = (error as Error)?.message || '登录失败，请稍后重试'
        this.setData({ error: message })
      } finally {
        this.setData({ loading: false })
      }
    },
    onChooseAvatar(e: any) {
      const { avatarUrl } = e.detail || {}
      if (avatarUrl) {
        this.setData({ avatarUrl, error: '' })
      }
    },
    onNameInput(e: any) {
      this.setData({ nickName: e.detail.value, error: '' })
    },
    async saveUserToCloud(userInfo: { nickName: string; avatarUrl: string }) {
      if (!wx.cloud) {
        return this.saveLocalOnly(userInfo, '当前微信版本不支持云开发，已改为本地登录')
      }
      const openid = await this.getOpenId()
      const db = wx.cloud.database()
      const timestamp = db.serverDate()
      try {
        await db.collection('users').doc(openid).set({
          data: {
            ...userInfo,
            updatedAt: timestamp,
            createdAt: timestamp,
          },
        })
      } catch (error) {
        const errMsg = (error as any)?.errMsg || ''
        if (errMsg.includes('FunctionNotFound') || errMsg.includes('not find')) {
          return this.saveLocalOnly(userInfo, '未找到云环境或云函数，已暂存本地，请部署云函数后重试')
        }
        if (errMsg.includes('Invalid Key Name: _openid')) {
          this.setData({ cloudWarning: '云端已自动写入 openid，无需手动设置 _openid，已改为正常写入' })
        }
        console.error('写入用户信息失败', error)
        throw new Error('写入用户信息失败，请稍后再试')
      }
      wx.setStorageSync('userInfo', userInfo)
      wx.setStorageSync('loggedIn', true)
      wx.setStorageSync('openid', openid)
    },
    async getOpenId(): Promise<string> {
      const cached = wx.getStorageSync('openid')
      if (cached) return cached
      try {
        // 依赖已部署的云函数 login，返回 openid
        const res = await wx.cloud.callFunction({ name: 'login' })
        const openid = (res.result as any)?.openid || (res.result as any)?.openId
        if (openid) {
          wx.setStorageSync('openid', openid)
          return openid
        }
      } catch (error) {
        console.error('获取 openid 失败', error)
        const errMsg = (error as any)?.errMsg || ''
        if (errMsg.includes('not find function') || errMsg.includes('FunctionNotFound')) {
          this.setData({
            cloudWarning: '未找到云函数 login，已改为本地登录，请在云开发控制台创建并部署 login 云函数后再试',
          })
          return this.ensureLocalOpenId()
        }
      }
      throw new Error('获取 openid 失败，请稍后重试')
    },
    ensureLocalOpenId() {
      const fallback = `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      wx.setStorageSync('openid', fallback)
      return fallback
    },
    saveLocalOnly(userInfo: { nickName: string; avatarUrl: string }, tip: string) {
      wx.setStorageSync('userInfo', userInfo)
      wx.setStorageSync('loggedIn', true)
      wx.showToast({ title: tip, icon: 'none', duration: 1500 })
    },
  },
})
