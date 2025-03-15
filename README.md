# MySQL-Connector
**MySQL-Connector** 是一个非常轻量化，旨在为 Unity Editor 等第三方工具跨平台访问 MySQL 数据库提供本地 API 服务的简单服务端。

## 注意事项
**MySQL-Connector** 工具包尚处于开发初级阶段，没有提供任何防止恶意 SQL 注入的手段，所以只提供了本地部署、并为本地 Unity Editor 等第三方平台提供 API 的接口。

如果需要部署到 Vercel 等平台实现在线 API，需要自行配置防止 SQL 注入的防护部分。

警告⚠️：如果需要自行提供公开访问的 API，必须配置安全措施！！如果直接开放 API，造成数据库被恶意注入、甚至被 `DROP TABLE`、`DROP DATABASE`的情况，开发者不对此负责。

## 下载和安装
以下提供两种下载方式，任选其一即可。
1. 直接使用“Download ZIP”下载程序包，解压下载好的程序包。
2. 使用 `git clone https://github.com/EverettRain/MySQL-Connector.git` ，直接下载到所处目录。

## 环境准备
如果安装有，可使用任何 JetBrains IDE 或 VSCode 打开下载好的程序包目录，后续操作在 IDE 内完成会更加便利。

打开终端，输入如下命令（如果不使用 IDE，可打开 MacOS 系统“终端”或 Windows 系统“PowerShell”，输入 `cd MySQL-Connector` 进入安装目录）：

检查Node.js版本（需v14+）
```bash
node -v 
```
检查npm版本（需v6+）
```bash
npm -v
```
若未安装 NodeJS，请访问 https://nodejs.org 下载最新 LTS 版本。

清理先前缓存项目（非必须）
```bash
rm -rf node_modules package-lock.json
```
安装项目依赖
```bash
npm install
```

## 启动服务
### IDE 内运行
在控制台内输入
```bash
npm start
```

### 非 IDE 内运行
- Windows 系统：启动软件包内的 start.bat 文件
- MacOS 系统：
    - 在目录中启动终端，输入以下指令给 start.sh 文件提供启动权限
  ```bash
  chmod +x start.sh
  ```
    - 输入以下指令启动程序
  ```bash
  ./start.sh
  ```
  
### 启动完成
如果是第一次启动该程序，可以按照提示进行初始化信息，也可以后期自行在 `_data` 文件夹内编辑 JSON 来修改（JSON 中的个人信息未进行加密，请谨慎保管）。
出现提示即代表运行成功：
```bash
--------------------------------------------------
API 服务已启动
管理后台运行在: http://localhost:3000/dashboard
可用端点列表：
• http://localhost:3000/api/v1/query/exec/example_database
--------------------------------------------------
```
你可以通过网址 http://localhost:3000/dashboard 进入管理后台界面。

## API 使用说明
基础端点
```http request
POST http://localhost:{PORT}/api/v1/query/exec/example_database
Content-Type: application/json

{
  "sql": "SELECT * FROM Student_Info"
}
```
cURL 请求示例
```bash
curl -X POST http://localhost:3000/api/v1/query/exec/example_database \
  -H "Content-Type: application/json" \
  -d '{"sql":"SHOW TABLES"}'
```
Unity C# 请求示例
```csharp
// 需配合UnityWebRequest使用
IEnumerator ExecuteQuery(string sql) {
  using UnityWebRequest request = new UnityWebRequest();
  request.url = "http://localhost:3000/api/raw-sql/exec";
  request.method = "POST";
  request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(
    JsonUtility.ToJson(new { sql = sql })
  ));
  request.downloadHandler = new DownloadHandlerBuffer();
  request.SetRequestHeader("Content-Type", "application/json");
  
  yield return request.SendWebRequest();
  
  if (request.result == UnityWebRequest.Result.Success) {
    Debug.Log(request.downloadHandler.text);
  }
}
```
Unity 快速调用脚本
```csharp
using UnityEngine;
using System.Collections;
using UnityEngine.Networking;
using System.Text;

public static class SQLManager
{
    public static string host;
    public static string port;

    public static void Initialize(string hostInput, string portInput)
    {
        host = hostInput;
        port = portInput;
    }

    public static void CheckSQLSettings()
    {
        Debug.Log("Connection located in: " + host + ":" + port);
    }
    
    public static IEnumerator Request(string sqlQuery) 
    {
        string json = $"{{\"sql\": \"{sqlQuery}\"}}";
        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);

        var request = new UnityWebRequest($"http://{host}:{port}/api/raw-sql/exec", "POST");
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");

        yield return request.SendWebRequest();

        if (request.result != UnityWebRequest.Result.Success) 
        {
            Debug.LogError($"错误: {request.error}");
        } 
        else 
        {
            Debug.Log($"结果: {request.downloadHandler.text}");
        }
    }
}
```
使用方式
```csharp
using UnityEngine;

public class AnyScripts : MonoBehaviour
{
    void Start()
    {
        SQLManager.CheckSQLSettings();
        SQLManager.Initialize("localhost","3000");
        SQLManager.CheckSQLSettings();
        StartCoroutine(SQLManager.Request("SELECT * FROM Student_Info"));
        StartCoroutine(SQLManager.Request("INSERT INTO waiting_delete VALUES (DEFAULT, 'Hyper')"));
    }
}
```
## 安全增强建议
即使只在本地运行，仍建议创建专用测试账户，只提供访问权限，防止对数据库造成破坏
```sql
CREATE USER 'unity_dev'@'localhost' IDENTIFIED BY 'your_password';
GRANT SELECT ON your_database.* TO 'unity_dev'@'localhost';
FLUSH PRIVILEGES;
```

## 维护与支持
如有任何问题，请提交 Issues

联系开发者：everettrain@icloud.com
