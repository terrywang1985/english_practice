package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/gin-gonic/gin"

	"path/filepath"
)

// Question 题目结构体
type Question struct {
	ID            string   `json:"id"`
	Type          string   `json:"type"`
	Question      string   `json:"question"`
	Options       []string `json:"options"`
	CorrectAnswer int      `json:"correctAnswer"`
	Explanation   string   `json:"explanation"`
	Tag           string   `json:"考点"`
}

var (
	// 全局缓存数据，保护并发读写使用锁
	cachedQuestions []Question
	// 文件版本（这里使用文件最后修改时间的 UnixNano 表示版本）
	jsonVersion string
	dataMutex   sync.RWMutex
)

func main() {
	// 启动时加载一次 JSON 数据
	reloadJSON()

	// 启动文件监控，检测 JSON 文件变化后自动更新缓存
	go watchJsonDataFileChanged()

	r := gin.Default()
	r.Use(CORSMiddleware())

	// /api/questions 接口，返回所有题目数据
	r.GET("/api/questions", func(c *gin.Context) {
		dataMutex.RLock()
		questions := cachedQuestions
		dataMutex.RUnlock()

		// 生成考点列表
		tagsMap := make(map[string]bool)
		for _, item := range questions {
			tagsMap[item.Tag] = true
		}
		tagList := make([]string, 0, len(tagsMap))
		for k := range tagsMap {
			tagList = append(tagList, k)
		}

		c.JSON(http.StatusOK, gin.H{
			"total":     len(questions),
			"tags":      tagList,
			"questions": questions,
			"version":   jsonVersion,
		})
	})

	// /api/version 接口返回当前 JSON 版本号
	r.GET("/api/version", func(c *gin.Context) {
		dataMutex.RLock()
		version := jsonVersion
		dataMutex.RUnlock()
		c.JSON(http.StatusOK, gin.H{
			"version": version,
		})
	})

	r.Run("127.0.0.1:8080")
}

// reloadJSON 读取 data/questions.json 文件，并更新全局缓存数据和版本号
func reloadJSON() {
	file, err := os.ReadFile("data/questions.json")
	if err != nil {
		log.Println("读取 data/questions.json 出错:", err)
		return
	}
	var data []Question
	err = json.Unmarshal(file, &data)
	if err != nil {
		log.Println("解析 JSON 出错:", err)
		return
	}
	fi, err := os.Stat("data/questions.json")
	if err != nil {
		log.Println("获取文件信息出错:", err)
		return
	}
	version := fmt.Sprintf("%d", fi.ModTime().UnixNano())

	dataMutex.Lock()
	cachedQuestions = data
	jsonVersion = version
	dataMutex.Unlock()

	log.Println("重新加载题库数据，共", len(data), "道题，当前版本:", jsonVersion)
}

// watchJsonDataFileChanged 监听 data/questions.json 文件的变化，检测到变更时自动 reloadJSON
func watchJsonDataFileChanged() {
	// 获取 data/questions.json 的绝对路径及所在目录
	jsonPath, err := filepath.Abs("data/questions.json")
	if err != nil {
		log.Fatal("获取 data/questions.json 的绝对路径失败:", err)
	}
	jsonDir := filepath.Dir(jsonPath)

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal("创建 watcher 失败:", err)
	}
	defer watcher.Close()

	// 监听整个目录
	err = watcher.Add(jsonDir)
	if err != nil {
		log.Fatal("添加目录到 watcher 失败:", err)
	}
	log.Println("开始监听目录:", jsonDir, "下的 questions.json 变化...")

	for {
		select {
		case event, ok := <-watcher.Events:
			if !ok {
				return
			}
			// 过滤目标文件
			if filepath.Clean(event.Name) == filepath.Clean(jsonPath) {
				// 处理写入、创建、重命名或删除等事件
				if event.Op&(fsnotify.Write|fsnotify.Create|fsnotify.Rename|fsnotify.Remove) != 0 {
					log.Println("检测到 questions.json 变化，事件：", event)
					// 延时等待文件操作完成
					time.Sleep(100 * time.Millisecond)
					reloadJSON()
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
