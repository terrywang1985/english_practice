const gradeManager = require('../../utils/gradeManager');

Page({
  data: {
    grades: [],  // 关卡列表
    userProgress: null,  // 用户进度
    loading: true,
    loadError: false,
    errorMsg: ''
  },

  onLoad() {
    this.loadGrades();
  },

  onShow() {
    // 每次显示时刷新用户进度
    this.refreshProgress();
  },

  async loadGrades() {
    this.setData({ loading: true, loadError: false });
    
    try {
      // 加载关卡配置列表
      const config = await gradeManager.loadGradesConfig();
      const userProgress = gradeManager.getUserProgress();
      
      // 为每个关卡添加解锁和完成状态
      const grades = config.grades.map(grade => {
        const unlocked = gradeManager.isGradeUnlocked(grade.gradeId);
        const completed = gradeManager.isGradeCompleted(grade.gradeId);
        const score = gradeManager.getGradeScore(grade.gradeId);
        
        return {
          ...grade,
          unlocked,
          completed,
          score
        };
      });
      
      this.setData({
        grades,
        userProgress,
        loading: false
      });
      
    } catch (error) {
      console.error('加载关卡失败：', error);
      this.setData({
        loading: false,
        loadError: true,
        errorMsg: '加载失败，请检查网络连接'
      });
    }
  },

  refreshProgress() {
    const userProgress = gradeManager.getUserProgress();
    const grades = this.data.grades.map(grade => {
      const unlocked = gradeManager.isGradeUnlocked(grade.gradeId);
      const completed = gradeManager.isGradeCompleted(grade.gradeId);
      const score = gradeManager.getGradeScore(grade.gradeId);
      
      return {
        ...grade,
        unlocked,
        completed,
        score
      };
    });
    
    this.setData({ grades, userProgress });
  },

  startGrade(e) {
    const gradeId = e.currentTarget.dataset.id;
    const grade = this.data.grades.find(g => g.gradeId === gradeId);
    
    if (!grade) return;
    
    // 检查是否解锁
    if (!grade.unlocked) {
      wx.showToast({
        title: '请先完成前面的关卡',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 跳转到练习页面
    wx.navigateTo({
      url: `/pages/practice/practice?gradeId=${gradeId}`
    });
  }
});
