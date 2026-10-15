import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Không kiểm tra thư mục build, thư viện và các file chờ xóa / sao lưu
  { ignores: ["dist", "node_modules", "_to_delete", "_backup"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Quy tắc hook của React: gọi hook đúng chỗ, useEffect khai đủ phụ thuộc
      ...reactHooks.configs.recommended.rules,
      // Mỗi file component chỉ nên export component để Fast Refresh (tải lại nóng) hoạt động đúng
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Biến / tham số không dùng là lỗi; đặt tên bắt đầu bằng "_" nếu cố ý bỏ qua
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Tắt các quy tắc định dạng trùng với Prettier (để Prettier lo phần định dạng)
  prettier,
);
