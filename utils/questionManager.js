// 题库管理工具类
const API_BASE_URL = 'http://127.0.0.1:8080'; // 本地服务器地址
const CACHE_KEY = 'questions_cache'; // 缓存key
const VERSION_KEY = 'questions_version'; // 版本号key

class QuestionManager {
  constructor() {
    this.allQuestions = [];
    this.usedQuestions = [];
    this.isLoaded = false;
    this.currentVersion = '';
  }

  // 从服务器加载题库数据（带版本检查）
  async loadQuestionsFromServer() {
    try {
      // 1. 获取本地缓存的版本号
      const localVersion = wx.getStorageSync(VERSION_KEY) || '';
      console.log('本地版本:', localVersion);

      // 2. 请求服务器版本号
      const versionRes = await this.requestServerVersion();
      if (!versionRes.success) {
        console.log('获取服务器版本失败，尝试加载本地缓存');
        return this.loadFromCache();
      }

      const serverVersion = versionRes.version;
      console.log('服务器版本:', serverVersion);

      // 3. 版本对比
      if (localVersion && localVersion === serverVersion) {
        console.log('版本一致，使用本地缓存');
        return this.loadFromCache();
      }

      // 4. 版本不一致，从服务器获取最新数据
      console.log('版本不一致或无缓存，从服务器获取最新数据');
      const questionsRes = await this.requestServerQuestions();
      
      if (questionsRes.success) {
        this.allQuestions = questionsRes.questions;
        this.currentVersion = questionsRes.version;
        this.isLoaded = true;

        // 5. 保存到本地缓存
        this.saveToCache(questionsRes.questions, questionsRes.version);

        console.log('题库更新成功，共', questionsRes.total, '道题');
        return {
          success: true,
          total: questionsRes.total,
          tags: questionsRes.tags,
          version: questionsRes.version,
          fromCache: false
        };
      } else {
        // 服务器请求失败，使用缓存
        return this.loadFromCache();
      }
    } catch (error) {
      console.error('加载题库失败：', error);
      // 出错时使用缓存
      return this.loadFromCache();
    }
  }

  // 请求服务器版本号
  async requestServerVersion() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${API_BASE_URL}/api/version`,
          method: 'GET',
          timeout: 3000,
          success: resolve,
          fail: reject
        });
      });

      if (res.statusCode === 200 && res.data.version) {
        return {
          success: true,
          version: res.data.version
        };
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error('请求服务器版本失败:', error);
      return { success: false };
    }
  }

  // 请求服务器题目数据
  async requestServerQuestions() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${API_BASE_URL}/api/questions`,
          method: 'GET',
          timeout: 5000,
          success: resolve,
          fail: reject
        });
      });

      if (res.statusCode === 200 && res.data.questions) {
        return {
          success: true,
          total: res.data.total,
          tags: res.data.tags,
          questions: res.data.questions,
          version: res.data.version
        };
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error('请求服务器题目失败:', error);
      return { success: false };
    }
  }

  // 从本地缓存加载
  loadFromCache() {
    try {
      const cachedQuestions = wx.getStorageSync(CACHE_KEY);
      const cachedVersion = wx.getStorageSync(VERSION_KEY);

      if (cachedQuestions && cachedQuestions.length > 0) {
        this.allQuestions = cachedQuestions;
        this.currentVersion = cachedVersion || '';
        this.isLoaded = true;

        const tags = this.getAllTags();
        console.log('从缓存加载题库，共', cachedQuestions.length, '道题');
        
        return {
          success: true,
          total: cachedQuestions.length,
          tags: tags,
          version: cachedVersion,
          fromCache: true
        };
      } else {
        // 缓存为空，使用内置备份
        console.log('缓存为空，使用内置备份数据');
        this.loadLocalBackup();
        return {
          success: true,
          total: this.allQuestions.length,
          tags: this.getAllTags(),
          version: 'backup',
          fromCache: false,
          isBackup: true
        };
      }
    } catch (error) {
      console.error('读取缓存失败:', error);
      this.loadLocalBackup();
      return {
        success: false,
        error: '缓存读取失败',
        isBackup: true
      };
    }
  }

  // 保存到本地缓存
  saveToCache(questions, version) {
    try {
      wx.setStorageSync(CACHE_KEY, questions);
      wx.setStorageSync(VERSION_KEY, version);
      console.log('题库已缓存到本地，版本:', version);
    } catch (error) {
      console.error('保存缓存失败:', error);
    }
  }

  // 清除本地缓存
  clearCache() {
    try {
      wx.removeStorageSync(CACHE_KEY);
      wx.removeStorageSync(VERSION_KEY);
      console.log('缓存已清除');
    } catch (error) {
      console.error('清除缓存失败:', error);
    }
  }

  // 加载本地备份数据（当服务器不可用且无缓存时）
  loadLocalBackup() {
    this.allQuestions = [
      {
        "id": "t1",
        "type": "conversion",
        "question": "单数：baby",
        "options": ["babys", "babies", "babyes", "baby's"],
        "correctAnswer": 1,
        "explanation": "baby以辅音+y结尾，改y为i加es，复数为babies",
        "考点": "改y为i+es"
      },
      {
        "id": "t2",
        "type": "conversion",
        "question": "单数：child",
        "options": ["childs", "children", "childes", "childen"],
        "correctAnswer": 1,
        "explanation": "child是不规则变化，复数为children",
        "考点": "不规则变化"
      },
      {
        "id": "s1",
        "type": "sentence",
        "question": "There are three ______ in the box.",
        "options": ["child", "children", "childs", "childes"],
        "correctAnswer": 1,
        "explanation": "句子中'three'提示复数，child是不规则变化，复数为children",
        "考点": "数量词+不规则复数"
      }
    ];
    this.isLoaded = true;
    console.log('使用本地备份数据，共', this.allQuestions.length, '道题');
  }

  // 获取所有题目
  getAllQuestions() {
    return this.allQuestions;
  }

  // 随机获取指定数量的题目（不重复）
  getRandomQuestions(count) {
    const shuffled = this.shuffleArray([...this.allQuestions]);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // 随机打乱数组
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  // 随机打乱选项顺序，并返回新的正确答案索引
  shuffleOptions(question) {
    const optionsWithIndex = question.options.map((option, index) => ({
      option,
      isCorrect: index === question.correctAnswer
    }));

    const shuffled = this.shuffleArray(optionsWithIndex);
    
    const newQuestion = {
      ...question,
      options: shuffled.map(item => item.option),
      correctAnswer: shuffled.findIndex(item => item.isCorrect)
    };

    return newQuestion;
  }

  // 按题型筛选题目
  getQuestionsByType(type) {
    return this.allQuestions.filter(q => q.type === type);
  }

  // 按考点筛选题目
  getQuestionsByTag(tag) {
    return this.allQuestions.filter(q => q.考点 === tag);
  }

  // 获取所有考点
  getAllTags() {
    const tags = new Set(this.allQuestions.map(q => q.考点));
    return Array.from(tags);
  }

  // 重置已使用题目
  resetUsedQuestions() {
    this.usedQuestions = [];
  }
}

module.exports = new QuestionManager();
