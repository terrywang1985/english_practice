# 英语单复数专项练习小程序

## 📖 项目简介

这是一个基于 JSON 配置的英语单复数专项练习微信小程序，支持灵活扩展题型和题目，覆盖"纯转换"和"语境运用"两大核心练习模式。

## ✨ 核心特性

- ✅ **纯 JSON 配置**：所有题目、答案、解析均通过 JSON 定义，无需修改代码即可新增题目
- ✅ **双题型覆盖**：支持单复数转换题（conversion）和句子运用题（sentence）
- ✅ **随机出题**：每次练习随机抽取题目，选项顺序随机打乱，避免记忆
- ✅ **即时反馈**：答题后立即显示正确答案、详细解析和考点标签
- ✅ **错题回顾**：练习结束后展示错题列表，帮助针对性复习
- ✅ **多练习模式**：随机混合、纯转换题、纯句子题三种模式可选

## 📁 项目结构

```
weixin_singular and plural/
├── app.js                      # 小程序主入口
├── app.json                    # 小程序配置文件
├── app.wxss                    # 全局样式
├── sitemap.json                # 搜索配置
├── data/
│   └── questions.json          # 题库配置文件（核心）
├── utils/
│   └── questionManager.js      # 题库管理工具类
└── pages/
    ├── index/                  # 首页（选择练习模式）
    │   ├── index.js
    │   ├── index.json
    │   ├── index.wxml
    │   └── index.wxss
    ├── practice/               # 练习页面（答题）
    │   ├── practice.js
    │   ├── practice.json
    │   ├── practice.wxml
    │   └── practice.wxss
    └── result/                 # 结果页面（成绩统计和错题回顾）
        ├── result.js
        ├── result.json
        ├── result.wxml
        └── result.wxss
```

## 📝 JSON 题库规范

### 题目对象字段说明

每道题目必须包含以下字段：

```json
{
  "id": "唯一标识（如 t1/s5，t=转换题，s=句子题）",
  "type": "题型（'conversion' 或 'sentence'）",
  "question": "题干文本",
  "options": ["选项1", "选项2", "选项3", "选项4"],
  "correctAnswer": 0,  // 正确选项的索引（0-3）
  "explanation": "解析文本",
  "考点": "考点标签"
}
```

### 题型设计要点

#### 1. 纯转换题（type: "conversion"）

**题干**：单独给出单数或复数名词

**选项设计**：4 个选项含 1 个正确答案，3 个迷惑项需符合典型错误模式

**示例**：

```json
{
  "id": "t1",
  "type": "conversion",
  "question": "单数：baby",
  "options": ["babys", "babies", "babyes", "baby's"],
  "correctAnswer": 1,
  "explanation": "baby以辅音+y结尾，改y为i加es，复数为babies",
  "考点": "改y为i+es"
}
```

#### 2. 句子运用题（type: "sentence"）

**题干**：含空格的句子，需填入正确单复数形式

**选项设计**：紧扣提示词（冠词、指示代词、数量词、be 动词）设置迷惑项

**示例**：

```json
{
  "id": "s1",
  "type": "sentence",
  "question": "There are three ______ in the box.",
  "options": ["child", "children", "childs", "childes"],
  "correctAnswer": 1,
  "explanation": "句子中'three'提示复数，child是不规则变化，复数为children",
  "考点": "数量词+不规则复数"
}
```

## 🎯 覆盖的考点

当前题库已覆盖以下考点：

1. **改y为i+es**：baby → babies
2. **不规则变化**：child → children, mouse → mice, foot → feet
3. **改f为v+es**：wolf → wolves, knife → knives
4. **单复数同形**：sheep → sheep
5. **以s/x/ch/sh结尾+es**：box → boxes
6. **辅音+o结尾+es**：tomato → tomatoes
7. **不定冠词a/an+单数**
8. **指示代词these/that+复数/单数**
9. **be动词is/are+单数/复数**
10. **不可数名词**：water

## 🚀 如何扩展题库

### 方法一：新增题目到现有考点

直接在 `data/questions.json` 数组末尾添加新题目对象：

```json
{
  "id": "t9",
  "type": "conversion",
  "question": "单数：city",
  "options": ["citys", "cities", "cityes", "city's"],
  "correctAnswer": 1,
  "explanation": "city以辅音+y结尾，改y为i加es，复数为cities",
  "考点": "改y为i+es"
}
```

### 方法二：新增考点和题目

例如新增"以ch结尾+es"考点：

```json
{
  "id": "t10",
  "type": "conversion",
  "question": "单数：watch",
  "options": ["watchs", "watches", "watchies", "watch's"],
  "correctAnswer": 1,
  "explanation": "watch以ch结尾，加es，复数为watches",
  "考点": "以ch结尾+es"
}
```

### 方法三：批量添加句子题

针对特定语法点批量添加题目：

```json
[
  {
    "id": "s11",
    "type": "sentence",
    "question": "This ______ is sweet.",
    "options": ["apples", "apple", "apple's", "applees"],
    "correctAnswer": 1,
    "explanation": "句子中'this'提示单数，应填apple",
    "考点": "指示代词this+单数"
  },
  {
    "id": "s12",
    "type": "sentence",
    "question": "Those ______ are beautiful.",
    "options": ["flower", "flowers", "flower's", "floweres"],
    "correctAnswer": 1,
    "explanation": "句子中'those'提示复数，应填flowers",
    "考点": "指示代词those+复数"
  }
]
```

## 💡 核心逻辑说明

### 1. 题库加载（questionManager.js）

- `getAllQuestions()`：获取全部题目
- `getRandomQuestions(count)`：随机抽取指定数量题目
- `shuffleOptions(question)`：打乱选项顺序并更新正确答案索引
- `getQuestionsByType(type)`：按题型筛选题目
- `getAllTags()`：获取所有考点标签

### 2. 随机出题机制

```javascript
// 根据模式获取题目
if (mode === 'random') {
  questions = questionManager.getRandomQuestions(totalCount);
} else if (mode === 'conversion') {
  const conversionQuestions = questionManager.getQuestionsByType('conversion');
  questions = questionManager.shuffleArray(conversionQuestions).slice(0, totalCount);
}

// 打乱每道题的选项顺序
questions = questions.map(q => questionManager.shuffleOptions(q));
```

### 3. 答题判断与反馈

```javascript
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
```

## 🎨 界面特色

1. **首页**：展示题库总数、考点类型，三种练习模式可选
2. **练习页**：顶部进度条、题型标签、考点徽章，选项支持即时反馈样式（正确绿色、错误红色）
3. **结果页**：成绩圆环显示、正确率统计、错题列表详细回顾

## 📱 使用说明

### 开发环境运行

1. 使用微信开发者工具打开项目
2. 编译运行即可开始练习

### 用户操作流程

1. 进入首页 → 选择练习模式
2. 开始答题 → 选择选项 → 提交答案 → 查看解析
3. 完成全部题目 → 查看成绩和错题回顾
4. 返回首页继续练习

## 🔧 扩展建议

### 1. 新增题型示例：判断题

```json
{
  "id": "j1",
  "type": "judge",
  "question": "The plural of 'man' is 'mans'.",
  "options": ["正确", "错误"],
  "correctAnswer": 1,
  "explanation": "man的复数是不规则变化，应为men，不是mans",
  "考点": "不规则变化判断"
}
```

### 2. 新增难度等级

在题目对象中添加 `difficulty` 字段：

```json
{
  "id": "t11",
  "type": "conversion",
  "difficulty": "hard",
  "question": "单数：ox",
  "options": ["oxs", "oxes", "oxen", "ox"],
  "correctAnswer": 2,
  "explanation": "ox是不规则变化，复数为oxen",
  "考点": "不规则变化"
}
```

### 3. 新增分类标签

在题目对象中添加 `category` 字段：

```json
{
  "id": "s13",
  "type": "sentence",
  "category": "动物类",
  "question": "I see two ______ in the zoo.",
  "options": ["tiger", "tigers", "tigeres", "tiger's"],
  "correctAnswer": 1,
  "explanation": "句子中'two'提示复数，tiger加s变为tigers",
  "考点": "数量词+常规复数"
}
```

## 📄 许可证

本项目仅供学习交流使用。

---

**注意**：扩展题库时，请确保 JSON 格式正确，所有字段完整，避免语法错误导致题库加载失败。
