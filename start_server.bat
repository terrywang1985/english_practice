@echo off
echo ========================================
echo 英语单复数练习 - 题库服务器
echo ========================================
echo.
echo 正在初始化 Go 模块...
go mod init english-practice-server 2>nul
go mod tidy

echo.
echo 正在启动服务器...
echo 服务器地址: http://127.0.0.1:8080
echo API接口: http://127.0.0.1:8080/api/questions
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

go run server.go

pause
