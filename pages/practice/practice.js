const gradeManager = require('../../utils/gradeManager');

Page({
  data: {
    gradeId: 0,  // 关卡ID
    gradeData: null,  // 关卡数据
    questions: [], // 当前练习的题目列表
    currentIndex: 0, // 当前题目索引
    currentQuestion: null, // 当前题目对象
    selectedIndex: -1, // 用户选择的选项索引
    showAnswer: false, // 是否显示答案
    totalCount: 8, // 总题数（每次练习题数）
    correctCount: 0, // 答对数量
    optionLabels: ['A', 'B', 'C', 'D'], // 选项标签
    progress: 0, // 进度百分比
    answerRecords: [] // 答题记录
  },

  onLoad(options) {
    const gradeId = parseInt(options.gradeId) || 1;
    this.setData({ gradeId });
    this.initPractice();
  },

  // 初始化练习
  async initPractice() {
    wx.showLoading({
      title: '加载题目中...',
      mask: true
    });

    try {
      const { gradeId } = this.data;
      
      // 加载关卡数据
      const result = await gradeManager.loadGrade(gradeId);
      
      if (!result.success) {
        throw new Error(result.error || '加载失败');
      }
      
      const gradeData = result.data;
      const allQuestions = gradeData.questions || [];
      
      if (allQuestions.length === 0) {
        throw new Error('没有可用的题目');
      }
      
      // 从题库中随机抽取题目（默认8题）
      const totalCount = gradeData.totalQuestions || 8;
      const shuffled = this.shuffleArray([...allQuestions]);
      const questions = shuffled.slice(0, Math.min(totalCount, allQuestions.length));
      
      // 打乱每道题的选项顺序
      const questionsWithShuffledOptions = questions.map(q => gradeManager.shuffleOptions(q));

      this.setData({
        gradeData,
        questions: questionsWithShuffledOptions,
        currentQuestion: questionsWithShuffledOptions[0],
        totalCount: questionsWithShuffledOptions.length,
        progress: (1 / questionsWithShuffledOptions.length) * 100
      });

      wx.hideLoading();
    } catch (error) {
      console.error('初始化练习失败:', error);
      wx.hideLoading();
      wx.showModal({
        title: '加载失败',
        content: error.message || '题库加载失败，请返回重试',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  // Fisher-Yates 洗牌算法
  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  // 选择选项
  selectOption(e) {
    if (this.data.showAnswer) return; // 已显示答案则不允许更改选择

    const index = e.currentTarget.dataset.index;
    this.setData({ selectedIndex: index });
  },

  // 提交答案
  submitAnswer() {
    const { selectedIndex, currentQuestion, currentIndex } = this.data;
    
    if (selectedIndex === -1) {
      wx.showToast({
        title: '请选择一个选项',
        icon: 'none'
      });
      return;
    }

    const isCorrect = selectedIndex === currentQuestion.correctAnswer;
    
    // 记录答题情况
    const record = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      userAnswer: currentQuestion.options[selectedIndex],
      correctAnswer: currentQuestion.options[currentQuestion.correctAnswer],
      isCorrect,
      explanation: currentQuestion.explanation,
      tag: currentQuestion.考点
    };

    const answerRecords = [...this.data.answerRecords, record];
    const correctCount = this.data.correctCount + (isCorrect ? 1 : 0);

    this.setData({
      showAnswer: true,
      answerRecords,
      correctCount
    });

    // 播放反馈音效
    if (isCorrect) {
      wx.showToast({
        title: '回答正确！',
        icon: 'success',
        duration: 1500
      });
    } else {
      wx.showToast({
        title: '答错了',
        icon: 'none',
        duration: 1500
      });
    }
  },

  // 下一题
  nextQuestion() {
    const { currentIndex, questions, totalCount } = this.data;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= totalCount) {
      return;
    }

    this.setData({
      currentIndex: nextIndex,
      currentQuestion: questions[nextIndex],
      selectedIndex: -1,
      showAnswer: false,
      progress: ((nextIndex + 1) / totalCount) * 100
    });
  },

  // 完成练习
  finishPractice() {
    const { gradeId, correctCount, totalCount, answerRecords } = this.data;
    
    wx.redirectTo({
      url: `/pages/result/result?gradeId=${gradeId}&correct=${correctCount}&total=${totalCount}&records=${encodeURIComponent(JSON.stringify(answerRecords))}`
    });
  }
});
