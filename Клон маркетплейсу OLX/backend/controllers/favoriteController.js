const pool = require("../db");

const addToFavorites = async (req, res) => {
  try {
    const { ad_id } = req.body;

    if (!ad_id) {
      return res.status(400).json({ message: "ID оголошення обов’язковий" });
    }

    const adCheck = await pool.query("SELECT * FROM ads WHERE id = $1", [
      ad_id,
    ]);

    if (adCheck.rows.length === 0) {
      return res.status(404).json({ message: "Оголошення не знайдено" });
    }

    const result = await pool.query(
      `
      INSERT INTO favorites (user_id, ad_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, ad_id) DO NOTHING
      RETURNING *
      `,
      [req.user.id, ad_id],
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ message: "Оголошення вже є в обраному" });
    }

    res.status(201).json({
      message: "Оголошення додано в обране",
      favorite: result.rows[0],
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка додавання в обране", error: error.message });
  }
};

const getFavorites = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        ads.*,
        categories.name AS category_name,
        COALESCE(
          json_agg(ad_photos.photo_url) FILTER (WHERE ad_photos.id IS NOT NULL),
          '[]'
        ) AS photos
      FROM favorites
      JOIN ads ON favorites.ad_id = ads.id
      LEFT JOIN categories ON ads.category_id = categories.id
      LEFT JOIN ad_photos ON ads.id = ad_photos.ad_id
      WHERE favorites.user_id = $1
      GROUP BY ads.id, categories.name, favorites.created_at
      ORDER BY favorites.created_at DESC
      `,
      [req.user.id],
    );

    res.json(result.rows);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка отримання обраного", error: error.message });
  }
};

const removeFromFavorites = async (req, res) => {
  try {
    const { ad_id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM favorites
      WHERE user_id = $1 AND ad_id = $2
      RETURNING *
      `,
      [req.user.id, ad_id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Оголошення не знайдено в обраному" });
    }

    res.json({ message: "Оголошення видалено з обраного" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка видалення з обраного", error: error.message });
  }
};

module.exports = {
  addToFavorites,
  getFavorites,
  removeFromFavorites,
};
