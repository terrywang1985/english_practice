const questionManager = require('../../utils/questionManager');

Page({
  data: {
    totalQuestions: 0,
    totalTags: 0,
    loading: true,
    loadError: false,
    errorMsg: '',
    fromCache: false,
    version: ''
  },

  onLoad() {
    this.loadStats();
  },

  async loadStats() {
    this.setData({ loading: true, loadError: false });
    
    try {
      // 从服务器加载题库（带版本检查）
      const result = await questionManager.loadQuestionsFromServer();
      
      if (result.success) {
        const allQuestions = questionManager.getAllQuestions();
        const allTags = questionManager.getAllTags();
        
        let statusMsg = '';
        if (result.fromCache) {
          statusMsg = '使用本地缓存数据';
        } else if (result.isBackup) {
          statusMsg = '使用内置备份数据';
        } else {
          statusMsg = '已更新为最新版本';
        }
        
        this.setData({
          totalQuestions: allQuestions.length,
          totalTags: allTags.length,
          loading: false,
          fromCache: result.fromCache || false,
          version: result.version || '',
          loadError: result.isBackup || false,
          errorMsg: statusMsg
        });

        // 如果是从服务器更新的，显示提示
        if (!result.fromCache && !result.isBackup) {
          wx.showToast({
            title: '题库已更新',
            icon: 'success',
            duration: 2000
          });
        }
      } else {
        this.setData({
          loading: false,
          loadError: true,
          errorMsg: result.error || '加载失败'
        });
      }
    } catch (error) {
      console.error('加载错误：', error);
      this.setData({
        loading: false,
        loadError: true,
        errorMsg: '加载失败，请重试'
      });
    }
  },

  startPractice(e) {
    const mode = e.currentTarget.dataset.mode;
    wx.navigateTo({
      url: `/pages/practice/practice?mode=${mode}`
    });
  }
});
