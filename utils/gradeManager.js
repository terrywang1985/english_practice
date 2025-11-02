// 关卡管理工具
const SERVER_URL = 'http://127.0.0.1:8080';

// 缓存Key定义
const CACHE_PREFIX = 'grade_';
const VERSION_PREFIX = 'grade_version_';
const PROGRESS_KEY = 'user_progress';
const BACKUP_CONFIG_KEY = 'backup_grades_config';

class GradeManager {
  constructor() {
    this.gradesConfig = null;  // 关卡配置列表
    this.currentGradeData = null;  // 当前加载的关卡数据
  }

  // 加载关卡配置列表
  async loadGradesConfig() {
    try {
      const res = await this.requestServer('/api/grades');
      this.gradesConfig = res;
      // 缓存配置
      wx.setStorageSync(BACKUP_CONFIG_KEY, res);
      return res;
    } catch (error) {
      console.error('加载关卡配置失败:', error);
      // 使用备份数据
      const backup = wx.getStorageSync(BACKUP_CONFIG_KEY);
      if (backup) {
        this.gradesConfig = backup;
        return backup;
      }
      throw error;
    }
  }

  // 加载指定关卡的题目数据（带版本检查）
  async loadGrade(gradeId) {
    console.log(`加载关卡${gradeId}`);

    try {
      // 1. 获取本地缓存版本号
      const localVersion = wx.getStorageSync(`${VERSION_PREFIX}${gradeId}`) || '';
      
      // 2. 请求服务器版本号
      const versionRes = await this.requestServer(`/api/version/grade/${gradeId}`);
      const serverVersion = versionRes.version;
      
      // 3. 版本对比
      if (localVersion && localVersion === serverVersion) {
        console.log(`关卡${gradeId}版本一致，使用缓存`);
        return this.loadGradeFromCache(gradeId);
      }
      
      // 4. 版本不一致或无缓存，从服务器获取
      console.log(`关卡${gradeId}需要更新，从服务器获取`);
      const gradeData = await this.requestServer(`/api/questions/grade/${gradeId}`);
      
      // 5. 保存到缓存
      this.saveGradeToCache(gradeId, gradeData);
      this.currentGradeData = gradeData;
      
      return {
        success: true,
        data: gradeData,
        fromCache: false
      };
      
    } catch (error) {
      console.error(`加载关卡${gradeId}失败:`, error);
      
      // 降级：尝试使用本地缓存
      const cachedData = this.loadGradeFromCache(gradeId);
      if (cachedData) {
        return cachedData;
      }
      
      return {
        success: false,
        error: error.message || '加载失败'
      };
    }
  }

  // 从缓存加载关卡数据
  loadGradeFromCache(gradeId) {
    try {
      const cacheKey = `${CACHE_PREFIX}${gradeId}`;
      const cached = wx.getStorageSync(cacheKey);
      
      if (cached) {
        this.currentGradeData = cached;
        return {
          success: true,
          data: cached,
          fromCache: true
        };
      }
      return null;
    } catch (error) {
      console.error(`读取关卡${gradeId}缓存失败:`, error);
      return null;
    }
  }

  // 保存关卡数据到缓存
  saveGradeToCache(gradeId, gradeData) {
    try {
      const cacheKey = `${CACHE_PREFIX}${gradeId}`;
      const versionKey = `${VERSION_PREFIX}${gradeId}`;
      
      wx.setStorageSync(cacheKey, gradeData);
      wx.setStorageSync(versionKey, gradeData.version);
      
      console.log(`关卡${gradeId}已缓存，版本:`, gradeData.version);
    } catch (error) {
      console.error(`保存关卡${gradeId}缓存失败:`, error);
    }
  }

  // 获取用户进度
  getUserProgress() {
    try {
      const progress = wx.getStorageSync(PROGRESS_KEY);
      if (progress) {
        return progress;
      }
      
      // 初始化进度
      const initialProgress = {
        currentGrade: 1,  // 当前可玩关卡
        completedGrades: [],  // 已完成的关卡ID
        gradeScores: {},  // 各关卡得分 {gradeId: score}
        totalScore: 0  // 总分
      };
      this.saveUserProgress(initialProgress);
      return initialProgress;
    } catch (error) {
      console.error('获取用户进度失败:', error);
      return {
        currentGrade: 1,
        completedGrades: [],
        gradeScores: {},
        totalScore: 0
      };
    }
  }

  // 保存用户进度
  saveUserProgress(progress) {
    try {
      wx.setStorageSync(PROGRESS_KEY, progress);
      console.log('用户进度已保存:', progress);
    } catch (error) {
      console.error('保存用户进度失败:', error);
    }
  }

  // 更新关卡完成状态
  updateGradeProgress(gradeId, score, totalQuestions) {
    const progress = this.getUserProgress();
    
    // 更新得分
    progress.gradeScores[gradeId] = score;
    
    // 如果全对，标记为已完成，解锁下一关
    if (score === totalQuestions) {
      if (!progress.completedGrades.includes(gradeId)) {
        progress.completedGrades.push(gradeId);
      }
      
      // 解锁下一关
      if (gradeId === progress.currentGrade) {
        progress.currentGrade = gradeId + 1;
      }
    }
    
    // 计算总分
    progress.totalScore = Object.values(progress.gradeScores).reduce((sum, s) => sum + s, 0);
    
    this.saveUserProgress(progress);
    return progress;
  }

  // 检查关卡是否解锁
  isGradeUnlocked(gradeId) {
    const progress = this.getUserProgress();
    return gradeId <= progress.currentGrade;
  }

  // 检查关卡是否已完成
  isGradeCompleted(gradeId) {
    const progress = this.getUserProgress();
    return progress.completedGrades.includes(gradeId);
  }

  // 获取关卡得分
  getGradeScore(gradeId) {
    const progress = this.getUserProgress();
    return progress.gradeScores[gradeId] || 0;
  }

  // 请求服务器
  requestServer(path) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${SERVER_URL}${path}`,
        method: 'GET',
        timeout: 5000,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }

  // 获取当前关卡的题目列表
  getQuestions() {
    if (!this.currentGradeData) {
      return [];
    }
    return this.currentGradeData.questions || [];
  }

  // 打乱选项顺序
  shuffleOptions(question) {
    const correctAnswer = question.correctAnswer;
    const correctOption = question.options[correctAnswer];
    
    // Fisher-Yates洗牌算法
    const shuffled = [...question.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // 找到正确答案的新位置
    const newCorrectAnswer = shuffled.indexOf(correctOption);
    
    return {
      ...question,
      options: shuffled,
      correctAnswer: newCorrectAnswer
    };
  }
}

// 导出单例
const gradeManager = new GradeManager();
module.exports = gradeManager;
