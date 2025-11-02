package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/gin-gonic/gin"

	"path/filepath"
)

// GradeData 单个关卡数据结构
type GradeData struct {
	Version        string     `json:"version"`
	GradeID        int        `json:"gradeId"`
	Name           string     `json:"name"`
	Description    string     `json:"description"`
	RequiredScore  int        `json:"requiredScore"`
	TotalQuestions int        `json:"totalQuestions"`
	Questions      []Question `json:"questions"`
}

// Question 题目结构体
type Question struct {
	ID            string   `json:"id"`
	Type          string   `json:"type"`
	Question      string   `json:"question"`
	Options       []string `json:"options"`
	CorrectAnswer int      `json:"correctAnswer"`
	Explanation   string   `json:"explanation"`
	Tag           string   `json:"tag"`
}

// GradesConfig 关卡配置结构
type GradesConfig struct {
	Version     string      `json:"version"`
	TotalGrades int         `json:"totalGrades"`
	Grades      []GradeInfo `json:"grades"`
}

type GradeInfo struct {
	GradeID        int    `json:"gradeId"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	RequiredScore  int    `json:"requiredScore"`
	TotalQuestions int    `json:"totalQuestions"`
	Icon           string `json:"icon"`
}

var (
	// 关卡数据缓存：map[gradeId]GradeData
	gradesCache map[int]*GradeData
	// 关卡配置缓存
	configCache *GradesConfig
	dataMutex   sync.RWMutex
)

func main() {
	// 启动时初始化缓存
	gradesCache = make(map[int]*GradeData)
	loadGradesConfig()

	// 启动文件监控
	go watchDataFiles()

	r := gin.Default()
	r.Use(CORSMiddleware())

	// 获取关卡配置列表
	r.GET("/api/grades", func(c *gin.Context) {
		dataMutex.RLock()
		config := configCache
		dataMutex.RUnlock()

		c.JSON(http.StatusOK, config)
	})

	// 获取指定关卡的版本号
	r.GET("/api/version/grade/:id", func(c *gin.Context) {
		gradeID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的关卡ID"})
			return
		}

		// 加载或获取关卡数据
		gradeData := loadGrade(gradeID)
		if gradeData == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "关卡不存在"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"gradeId": gradeID,
			"version": gradeData.Version,
		})
	})

	// 获取指定关卡的题目数据
	r.GET("/api/questions/grade/:id", func(c *gin.Context) {
		gradeID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的关卡ID"})
			return
		}

		gradeData := loadGrade(gradeID)
		if gradeData == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "关卡不存在"})
			return
		}

		c.JSON(http.StatusOK, gradeData)
	})

	r.Run("127.0.0.1:8080")
}

// loadGradesConfig 加载关卡配置
func loadGradesConfig() {
	file, err := os.ReadFile("data/grades_config.json")
	if err != nil {
		log.Println("读取 grades_config.json 出错:", err)
		return
	}

	var config GradesConfig
	err = json.Unmarshal(file, &config)
	if err != nil {
		log.Println("解析 grades_config.json 出错:", err)
		return
	}

	dataMutex.Lock()
	configCache = &config
	dataMutex.Unlock()

	log.Println("加载关卡配置成功，共", config.TotalGrades, "个关卡")
}

// loadGrade 加载指定关卡的题目数据
func loadGrade(gradeID int) *GradeData {
	// 先检查缓存
	dataMutex.RLock()
	if data, exists := gradesCache[gradeID]; exists {
		dataMutex.RUnlock()
		return data
	}
	dataMutex.RUnlock()

	// 从文件加载
	filename := fmt.Sprintf("data/grade_%d.json", gradeID)
	file, err := os.ReadFile(filename)
	if err != nil {
		log.Printf("读取 %s 出错: %v\n", filename, err)
		return nil
	}

	var gradeData GradeData
	err = json.Unmarshal(file, &gradeData)
	if err != nil {
		log.Printf("解析 %s 出错: %v\n", filename, err)
		return nil
	}

	// 缓存数据
	dataMutex.Lock()
	gradesCache[gradeID] = &gradeData
	dataMutex.Unlock()

	log.Printf("加载关卡%d成功，共%d道题，版本:%s\n", gradeID, len(gradeData.Questions), gradeData.Version)
	return &gradeData
}

// watchDataFiles 监控data目录下的文件变化
func watchDataFiles() {
	dataDir, err := filepath.Abs("data")
	if err != nil {
		log.Fatal("获取 data 目录的绝对路径失败:", err)
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal("创建 watcher 失败:", err)
	}
	defer watcher.Close()

	err = watcher.Add(dataDir)
	if err != nil {
		log.Fatal("添加目录到 watcher 失败:", err)
	}
	log.Println("开始监听目录:", dataDir)

	for {
		select {
		case event, ok := <-watcher.Events:
			if !ok {
				return
			}
			if event.Op&(fsnotify.Write|fsnotify.Create|fsnotify.Rename|fsnotify.Remove) != 0 {
				log.Println("检测到文件变化，事件：", event)
				time.Sleep(100 * time.Millisecond)

				// 处理不同文件变化
				filename := filepath.Base(event.Name)
				if filename == "grades_config.json" {
					loadGradesConfig()
				} else if len(filename) > 11 && filename[:6] == "grade_" && filename[len(filename)-5:] == ".json" {
					// grade_N.json 变化，清除对应缓存
					var gradeID int
					_, err := fmt.Sscanf(filename, "grade_%d.json", &gradeID)
					if err == nil {
						dataMutex.Lock()
						delete(gradesCache, gradeID)
						dataMutex.Unlock()
						log.Printf("清除关卡%d缓存\n", gradeID)
					}
				}
			}
		case err, ok := <-watcher.Errors:
			if !ok {
				return
			}
			log.Println("Watcher 错误:", err)
		}
	}
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET")
		c.Next()
	}
}
