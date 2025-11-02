const gradeManager = require('../../utils/gradeManager');

Page({
  data: {
    gradeId: 0,
    correctCount: 0,
    totalCount: 0,
    wrongCount: 0,
    accuracy: 0,
    scoreIcon: '🎉',
    scoreTitle: '太棒了！',
    wrongRecords: [],
    allRecords: [],
    isPassed: false,  // 是否通过关卡
    unlockedNext: false  // 是否解锁下一关
  },

  onLoad(options) {
    const gradeId = parseInt(options.gradeId) || 1;
    const correctCount = parseInt(options.correct) || 0;
    const totalCount = parseInt(options.total) || 0;
    const records = options.records ? JSON.parse(decodeURIComponent(options.records)) : [];

    this.setData({ gradeId });
    this.calculateResult(correctCount, totalCount, records);
  },

  calculateResult(correctCount, totalCount, records) {
    const wrongCount = totalCount - correctCount;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // 判断是否通过：全对或者准确率达到80%
    const isPassed = correctCount === totalCount || accuracy >= 80;
    
    // 根据正确率设置评价
    let scoreIcon = '🎉';
    let scoreTitle = '太棒了！';
    
    if (correctCount === totalCount) {
      scoreIcon = '🏆';
      scoreTitle = '完美满分！';
    } else if (accuracy >= 80) {
      scoreIcon = '🎉';
      scoreTitle = '太棒了！';
    } else if (accuracy >= 60) {
      scoreIcon = '👍';
      scoreTitle = '继续加油！';
    } else {
      scoreIcon = '💪';
      scoreTitle = '加油努力！';
    }

    // 筛选错题
    const wrongRecords = records
      .map((record, index) => ({ ...record, index }))
      .filter(record => !record.isCorrect);

    this.setData({
      correctCount,
      totalCount,
      wrongCount,
      accuracy,
      scoreIcon,
      scoreTitle,
      wrongRecords,
      allRecords: records,
      isPassed
    });
    
    // 如果通过，更新进度并检查是否解锁下一关
    if (isPassed) {
      const { gradeId } = this.data;
      const progress = gradeManager.updateGradeProgress(gradeId, correctCount, totalCount);
      
      // 检查是否解锁了新关卡
      const unlockedNext = progress.currentGrade > gradeId;
      
      this.setData({ unlockedNext });
      
      // 显示通关提示
      if (unlockedNext) {
        wx.showToast({
          title: '恭喜解锁下一关！',
          icon: 'success',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: '关卡完成！',
          icon: 'success',
          duration: 2000
        });
      }
    }
  },

  retryPractice() {
    wx.redirectTo({
      url: '/pages/index/index'
    });
  },

  backHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
