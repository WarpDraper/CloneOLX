const pool = require("../db");

const getCategories = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка отримання категорій", error: error.message });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("SELECT * FROM categories WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Категорію не знайдено" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка отримання категорії", error: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const result = await pool.query(
      "INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *",
      [name, description || null],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка створення категорії", error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const result = await pool.query(
      "UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *",
      [name, description || null, id],
    );

    res.json(result.rows[0]);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка оновлення категорії", error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM categories WHERE id = $1", [id]);

    res.json({ message: "Категорію видалено" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка видалення категорії", error: error.message });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
