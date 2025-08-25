// 匯入套件及類型定義 (類別、介面)
import express from "express";
// *** verbatimModuleSyntax 為 true 時，標示匯入類型
import type { Request, Response, NextFunction } from "express";
// 截入環境變數設定檔
import "dotenv/config";

import cookieParser from "cookie-parser";
import session from "express-session";
import sessionFileStore from "session-file-store";
import cors from "cors";

import mainRouter from "./routes/main";
import usersRouter from "./routes/users";
import tryABRouter from "./routes/try_ab";
import apiContactsRouter from "./routes/api-contacts";
import apiLoginRouter from "./routes/api-login";
import apiJwtLoginRouter from "./routes/api-jwt-login";
import { jwtParseMiddleware } from "./middleware";

// 建立伺服器主物件
const app = express();
app.set("view engine", "ejs");

// CORS 白名單設定
const allowedOrigins = [
  "http://localhost:3000", // React 開發伺服器
  "http://localhost:3001", // 另一個前端開發埠
  "http://localhost:5173", // Vite 開發伺服器
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  // 生產環境域名
  process.env.FRONTEND_URL || "https://your-production-domain.com",
];

const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // 允許沒有 origin 的請求（例如移動應用或 Postman）
    if (!origin) return callback(null, true);
    callback(null, allowedOrigins.includes(origin));
  },
  credentials: true, // 允許攜帶 cookies 和認證資訊
  optionsSuccessStatus: 200, // 一些舊版瀏覽器 (IE11, 各種 SmartTV) 在 204 狀態碼上有問題
};

// 套用 CORS 設定
app.use(cors(corsOptions));

// 設定靜態內容資料夾
app.use(express.static("public"));
// 解析 JSON body 的中間件
app.use(express.json());
// 解析 URL-encoded body 的中間件
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser()); // 全域中介軟體：解析 cookies

const FileStore = sessionFileStore(session);
app.use(
  session({
    // 新用戶沒有使用到 session 物件時不會建立 session 和發送 cookie
    saveUninitialized: false,
    resave: false, // 沒變更內容是否強制回存
    secret: process.env.SESSION_SECRET || "development-session-secret",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24小時，單位毫秒
      secure: process.env.NODE_ENV === "production", // 生產環境使用 HTTPS
      httpOnly: true, // 防止 XSS 攻擊
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // 跨站請求設定
    },
    store: new FileStore({
      path: process.env.SESSION_PATH || "./sessions",
      ttl: 86400, // 24小時過期
    }), // 使用檔案作為 session 儲存媒介
  })
);

// ************* 自訂的頂層 "中間件, 中介軟體" *************
// JWT 解析 middleware (可選性驗證)
app.use(jwtParseMiddleware);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.pageName = "";
  res.locals.session = req.session; // 讓所有的 EJS 可以用 session 變數
  res.locals.query = req.query;
  res.locals.cookies = req.cookies;

  next();
});

// 網站根目錄頁面
app.get("/", (req: Request, res: Response) => {
  res.render("home", { name: "prisma" });
});

app.use("/users", usersRouter);
app.use("/try-ab", tryABRouter);
app.use("/", mainRouter);

app.use("/api", apiLoginRouter);
app.use("/api", apiJwtLoginRouter);
app.use("/api/contacts", apiContactsRouter);

const port = +(process.env.PORT || "3002");
app.listen(port, () => {
  console.log(`Express + Prisma 啟動 http://localhost:${port}`);
});
