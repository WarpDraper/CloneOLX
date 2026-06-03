const pool = require("../db");

const getAds = async (req, res) => {
  try {
    const {
      search,
      category_id,
      min_price,
      max_price,
      condition,
      location,
      sort_by = "date_desc",
    } = req.query;

    const values = [];
    const conditions = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(ads.title ILIKE $${values.length} OR ads.description ILIKE $${values.length})`,
      );
    }

    if (category_id) {
      values.push(category_id);
      conditions.push(`ads.category_id = $${values.length}`);
    }

    if (min_price) {
      values.push(min_price);
      conditions.push(`ads.price >= $${values.length}`);
    }

    if (max_price) {
      values.push(max_price);
      conditions.push(`ads.price <= $${values.length}`);
    }

    if (condition) {
      values.push(condition);
      conditions.push(`ads.condition = $${values.length}`);
    }

    if (location) {
      values.push(`%${location}%`);
      conditions.push(`ads.location ILIKE $${values.length}`);
    }

    let orderBy = "ads.created_at DESC";

    if (sort_by === "date_asc") {
      orderBy = "ads.created_at ASC";
    }

    if (sort_by === "price_asc") {
      orderBy = "ads.price ASC";
    }

    if (sort_by === "price_desc") {
      orderBy = "ads.price DESC";
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        ads.*,
        categories.name AS category_name,
        users.name AS seller_name,
        COALESCE(
          json_agg(ad_photos.photo_url) FILTER (WHERE ad_photos.id IS NOT NULL),
          '[]'
        ) AS photos
      FROM ads
      LEFT JOIN categories ON ads.category_id = categories.id
      LEFT JOIN users ON ads.user_id = users.id
      LEFT JOIN ad_photos ON ads.id = ad_photos.ad_id
      ${whereClause}
      GROUP BY ads.id, categories.name, users.name
      ORDER BY ${orderBy}
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка отримання оголошень", error: error.message });
  }
};

const getAdById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        ads.*,
        categories.name AS category_name,
        users.name AS seller_name,
        COALESCE(
          json_agg(ad_photos.photo_url) FILTER (WHERE ad_photos.id IS NOT NULL),
          '[]'
        ) AS photos
      FROM ads
      LEFT JOIN categories ON ads.category_id = categories.id
      LEFT JOIN users ON ads.user_id = users.id
      LEFT JOIN ad_photos ON ads.id = ad_photos.ad_id
      WHERE ads.id = $1
      GROUP BY ads.id, categories.name, users.name
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Оголошення не знайдено" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка отримання оголошення", error: error.message });
  }
};

const createAd = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { title, description, price, condition, location, category_id } =
      req.body;

    if (
      !title ||
      !description ||
      !price ||
      !condition ||
      !location ||
      !category_id
    ) {
      return res
        .status(400)
        .json({ message: "Заповніть усі обов’язкові поля" });
    }

    const adResult = await client.query(
      `
      INSERT INTO ads 
      (title, description, price, condition, location, category_id, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        title,
        description,
        price,
        condition,
        location,
        category_id,
        req.user.id,
      ],
    );

    const ad = adResult.rows[0];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const photoUrl = `/uploads/${file.filename}`;

        await client.query(
          "INSERT INTO ad_photos (ad_id, photo_url) VALUES ($1, $2)",
          [ad.id, photoUrl],
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Оголошення створено",
      ad,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res
      .status(500)
      .json({ message: "Помилка створення оголошення", error: error.message });
  } finally {
    client.release();
  }
};

const updateAd = async (req, res) => {
  try {
    const { id } = req.params;

    const { title, description, price, condition, location, category_id } =
      req.body;

    const ownerCheck = await pool.query(
      "SELECT * FROM ads WHERE id = $1 AND user_id = $2",
      [id, req.user.id],
    );

    if (ownerCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Немає прав на редагування цього оголошення" });
    }

    const result = await pool.query(
      `
      UPDATE ads
      SET 
        title = $1,
        description = $2,
        price = $3,
        condition = $4,
        location = $5,
        category_id = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
      `,
      [title, description, price, condition, location, category_id, id],
    );

    res.json({
      message: "Оголошення оновлено",
      ad: result.rows[0],
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка оновлення оголошення", error: error.message });
  }
};

const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM ads WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Немає прав на видалення цього оголошення" });
    }

    res.json({ message: "Оголошення видалено" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка видалення оголошення", error: error.message });
  }
};

const addPhotosToAd = async (req, res) => {
  try {
    const { id } = req.params;

    const ownerCheck = await pool.query(
      "SELECT * FROM ads WHERE id = $1 AND user_id = $2",
      [id, req.user.id],
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ message: "Немає прав на додавання фото" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Фото не завантажено" });
    }

    const photos = [];

    for (const file of req.files) {
      const photoUrl = `/uploads/${file.filename}`;

      const result = await pool.query(
        "INSERT INTO ad_photos (ad_id, photo_url) VALUES ($1, $2) RETURNING *",
        [id, photoUrl],
      );

      photos.push(result.rows[0]);
    }

    res.status(201).json({
      message: "Фото додано",
      photos,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка додавання фото", error: error.message });
  }
};

module.exports = {
  getAds,
  getAdById,
  createAd,
  updateAd,
  deleteAd,
  addPhotosToAd,
};
