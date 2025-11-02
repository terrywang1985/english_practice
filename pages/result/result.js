Page({
  data: {
    correctCount: 0,
    totalCount: 0,
    wrongCount: 0,
    accuracy: 0,
    scoreIcon: '🎉',
    scoreTitle: '太棒了！',
    wrongRecords: [],
    allRecords: []
  },

  onLoad(options) {
    const correctCount = parseInt(options.correct) || 0;
    const totalCount = parseInt(options.total) || 0;
    const records = options.records ? JSON.parse(decodeURIComponent(options.records)) : [];

    this.calculateResult(correctCount, totalCount, records);
  },

  calculateResult(correctCount, totalCount, records) {
    const wrongCount = totalCount - correctCount;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // 根据正确率设置评价
    let scoreIcon = '🎉';
    let scoreTitle = '太棒了！';
    
    if (accuracy === 100) {
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
      allRecords: records
    });
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
