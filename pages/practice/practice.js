const questionManager = require('../../utils/questionManager');

Page({
  data: {
    mode: 'random', // 练习模式：random/conversion/sentence
    questions: [], // 当前练习的题目列表
    currentIndex: 0, // 当前题目索引
    currentQuestion: null, // 当前题目对象
    selectedIndex: -1, // 用户选择的选项索引
    showAnswer: false, // 是否显示答案
    totalCount: 10, // 总题数
    correctCount: 0, // 答对数量
    optionLabels: ['A', 'B', 'C', 'D'], // 选项标签
    progress: 0, // 进度百分比
    answerRecords: [] // 答题记录
  },

  onLoad(options) {
    const mode = options.mode || 'random';
    this.setData({ mode });
    this.initPractice();
  },

  // 初始化练习
  async initPractice() {
    // 显示加载提示
    wx.showLoading({
      title: '加载题目中...',
      mask: true
    });

    try {
      // 确保题库已加载
      if (!questionManager.isLoaded) {
        await questionManager.loadQuestionsFromServer();
      }

      let questions = [];
      const { mode, totalCount } = this.data;

      // 根据模式获取题目
      if (mode === 'random') {
        questions = questionManager.getRandomQuestions(totalCount);
      } else if (mode === 'conversion') {
        const conversionQuestions = questionManager.getQuestionsByType('conversion');
        questions = questionManager.shuffleArray(conversionQuestions).slice(0, totalCount);
      } else if (mode === 'sentence') {
        const sentenceQuestions = questionManager.getQuestionsByType('sentence');
        questions = questionManager.shuffleArray(sentenceQuestions).slice(0, totalCount);
      }

      // 检查是否有题目
      if (!questions || questions.length === 0) {
        throw new Error('没有可用的题目');
      }

      // 打乱每道题的选项顺序
      questions = questions.map(q => questionManager.shuffleOptions(q));

      this.setData({
        questions,
        currentQuestion: questions[0],
        totalCount: questions.length,
        progress: ((0 + 1) / questions.length) * 100
      });

      wx.hideLoading();
    } catch (error) {
      console.error('初始化练习失败:', error);
      wx.hideLoading();
      wx.showModal({
        title: '加载失败',
        content: '题库加载失败，请返回重试',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
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
    const { correctCount, totalCount, answerRecords } = this.data;
    
    wx.redirectTo({
      url: `/pages/result/result?correct=${correctCount}&total=${totalCount}&records=${JSON.stringify(answerRecords)}`
    });
  }
});
