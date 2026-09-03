import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Server-side persistent storage file path
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "trading_journal_db.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  token: string;
  theme?: "light" | "dark";
  entries: Record<
    string,
    {
      amount: number;
      lots?: number;
      session?: string;
      technique?: string;
      note?: string;
      updatedAt?: string;
    }
  >;
}

interface DatabaseSchema {
  users: Record<string, UserRecord>; // keyed by lowercase email
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading database file:", err);
  }
  return { users: {} };
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}

// Memory cache of database
let db = loadDatabase();

function generateToken(email: string): string {
  return crypto.randomBytes(32).toString("hex") + "_" + Buffer.from(email).toString("base64url");
}

function getUserByToken(token?: string): UserRecord | null {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, "").trim();
  for (const user of Object.values(db.users)) {
    if (user.token === cleanToken) {
      return user;
    }
  }
  return null;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Register or Auto-Login
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, initialEntries, theme } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (cleanEmail.length < 3 || !cleanEmail.includes("@")) {
      return res.status(400).json({ error: "รูปแบบอีเมลไม่ถูกต้อง เช่น yourname@gmail.com" });
    }

    if (String(password).length < 4) {
      return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร" });
    }

    db = loadDatabase();
    if (db.users[cleanEmail]) {
      return res.status(400).json({ error: "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเลือกเข้าสู่ระบบ" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(password), salt);
    const token = generateToken(cleanEmail);
    const now = new Date().toISOString();

    const newUser: UserRecord = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
      token,
      theme: theme || "light",
      entries: initialEntries && typeof initialEntries === "object" ? initialEntries : {},
    };

    db.users[cleanEmail] = newUser;
    saveDatabase(db);

    return res.json({
      success: true,
      message: "สร้างบัญชีและเปิดใช้งานระบบซิงค์สำเร็จ",
      user: {
        email: newUser.email,
        token: newUser.token,
        theme: newUser.theme,
        entries: newUser.entries,
      },
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการสร้างบัญชี" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    db = loadDatabase();
    const user = db.users[cleanEmail];

    if (!user) {
      return res.status(404).json({ error: "ไม่พบบัญชีอีเมลนี้ กรุณาสมัครสมาชิกก่อน" });
    }

    const isMatch = await bcrypt.compare(String(password), user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" });
    }

    // Refresh token
    const token = generateToken(cleanEmail);
    user.token = token;
    user.updatedAt = new Date().toISOString();
    saveDatabase(db);

    return res.json({
      success: true,
      message: "เข้าสู่ระบบและซิงค์ข้อมูลสำเร็จ",
      user: {
        email: user.email,
        token: user.token,
        theme: user.theme || "light",
        entries: user.entries || {},
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
  }
});

// Sync data (GET / POST)
app.get("/api/sync", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);

  if (!user) {
    return res.status(401).json({ error: "เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่" });
  }

  return res.json({
    success: true,
    email: user.email,
    theme: user.theme || "light",
    entries: user.entries || {},
    updatedAt: user.updatedAt,
  });
});

app.post("/api/sync", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);

    if (!user) {
      return res.status(401).json({ error: "เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่" });
    }

    const { entries, theme } = req.body;
    if (entries && typeof entries === "object") {
      user.entries = entries;
    }
    if (theme && (theme === "light" || theme === "dark")) {
      user.theme = theme;
    }
    user.updatedAt = new Date().toISOString();

    db.users[user.email] = user;
    saveDatabase(db);

    return res.json({
      success: true,
      message: "ซิงค์ข้อมูลขึ้นคลาวด์เรียบร้อยแล้ว",
      count: Object.keys(user.entries || {}).length,
      updatedAt: user.updatedAt,
    });
  } catch (err: any) {
    console.error("Sync error:", err);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการซิงค์ข้อมูล" });
  }
});

// Start Express and Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
