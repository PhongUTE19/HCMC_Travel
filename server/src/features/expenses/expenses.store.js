import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath =
  process.env.EXPENSE_DATA_FILE ||
  path.resolve(__dirname, "../../../../data/expense-data.json");
// Danh mục khởi tạo khi một người dùng chưa có dữ liệu.
const defaults = [
  ["Ăn uống", "expense", "#f97316"],
  ["Mua sắm", "expense", "#a855f7"],
  ["Di chuyển", "expense", "#0ea5e9"],
  ["Nhà cửa", "expense", "#64748b"],
  ["Giáo dục", "expense", "#14b8a6"],
  ["Sức khỏe", "expense", "#ef4444"],
  ["Giải trí", "expense", "#ec4899"],
  ["Lương", "income", "#22c55e"],
  ["Thưởng", "income", "#84cc16"],
  ["Thu nhập khác", "income", "#06b6d4"],
];

// Tên mặc định của bản cũ, dùng để tự cập nhật dữ liệu đã lưu.
const legacyDefaultNames = new Map([
  ["Food & dining", "Ăn uống"],
  ["Transport", "Di chuyển"],
  ["Shopping", "Mua sắm"],
  ["Entertainment", "Giải trí"],
  ["Education", "Giáo dục"],
  ["Salary", "Lương"],
  ["Other income", "Thu nhập khác"],
]);

let database;
async function load() {
  // Chỉ đọc file một lần trong lúc server đang chạy.
  if (database) return database;
  try {
    database = JSON.parse(await fs.readFile(dataPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    database = { transactions: [], categories: [], budgets: [], receipts: [] };
  }
  return database;
}
async function save() {
  // JSON giúp bản prototype chạy local mà chưa cần database ngoài.
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(database, null, 2), "utf8");
}
export async function collection(name, userId) {
  const db = await load();
  if (name === "categories") {
    const userCategories = db.categories.filter((row) => row.userId === userId);
    let hasChanges = false;

    // Đổi tên danh mục tiếng Anh cũ sang tiếng Việt, chỉ áp dụng cho default.
    userCategories.forEach((category) => {
      const vietnameseName = legacyDefaultNames.get(category.name);
      if (category.isDefault && vietnameseName) {
        category.name = vietnameseName;
        hasChanges = true;
      }
    });

    // Thêm các danh mục mới mà dữ liệu cũ chưa có, như Nhà cửa và Sức khỏe.
    defaults.forEach(([defaultName, type, color]) => {
      const exists = userCategories.some((category) => category.name === defaultName && category.type === type);
      if (!exists) {
        db.categories.push({
          id: randomUUID(),
          userId,
          name: defaultName,
          type,
          color,
          isDefault: true,
          createdAt: new Date().toISOString(),
        });
        hasChanges = true;
      }
    });

    if (hasChanges) await save();
  }
  return db[name].filter((row) => row.userId === userId);
}
export async function create(name, userId, values) {
  // userId luôn lấy từ backend, không lấy từ request body.
  await load();
  const row = {
    id: randomUUID(),
    userId,
    ...values,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  database[name].push(row);
  await save();
  return row;
}
export async function owned(name, userId, id) {
  // Chỉ trả về bản ghi của đúng người dùng đang đăng nhập.
  const rows = await collection(name, userId);
  return rows.find((row) => row.id === id) || null;
}
export async function update(name, userId, id, values) {
  const row = await owned(name, userId, id);
  if (!row) return null;
  Object.assign(row, values, { updatedAt: new Date().toISOString() });
  await save();
  return row;
}
export async function remove(name, userId, id) {
  await load();
  const row = await owned(name, userId, id);
  if (!row) return null;
  database[name] = database[name].filter((item) => item.id !== id);
  await save();
  return row;
}
