import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

try {
  await client.connect();

  const result = await client.query(`
    SELECT
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_name = 'Permission'
    ORDER BY ordinal_position
  `);

  console.table(result.rows);
} catch (error) {
  console.error("DATABASE TEST ERROR:", error);
} finally {
  await client.end();
}