import pool from "../config/db.js";

const seedSocialLinks = async () => {
    const conn = await pool.getConnection();
    const [dbInfo] = await conn.execute(`
  SELECT DATABASE() AS databaseName
`);

    console.log("Seeder database:", dbInfo);
    try {
        await conn.beginTransaction();

        /*
         * 1. Add socialLinks column if it does not exist
         */
        const [columns] = await conn.execute(`
      SHOW COLUMNS FROM events LIKE 'socialLinks'
    `);

        if (columns.length === 0) {
            await conn.execute(`
        ALTER TABLE events
        ADD COLUMN socialLinks JSON NULL
      `);

            console.log("socialLinks column added successfully.");
        } else {
            console.log("socialLinks column already exists.");
        }

        const [events] = await conn.execute(
            `SELECT id, title FROM events ORDER BY id`
        );

        console.log("Existing events:");
        console.table(events);
        const eventId = 14;

        const socialLinks = [
            {
                platform: "instagram",
                url: "https://instagram.com/tanan",
            },
            {
                platform: "facebook",
                url: "https://facebook.com/tanan",
            },
            {
                platform: "youtube",
                url: "https://youtube.com/@tanan",
            },
            {
                platform: "linkedin",
                url: "https://linkedin.com/company/tanan",
            },
            {
                platform: "twitter",
                url: "https://x.com/tanan",
            },
            {
                platform: "website",
                url: "https://tanan.no",
            },
            {
                platform: "other",
                url: "https://example.com",
            },
        ];

        const [result] = await conn.execute(
            `UPDATE events
       SET socialLinks = ?
       WHERE id = ?`,
            [
                JSON.stringify(socialLinks),
                eventId,
            ]
        );

        if (result.affectedRows === 0) {
            throw new Error(`Event with ID ${eventId} was not found.`);
        }

        console.log(
            `Social links updated successfully for event ID: ${eventId}`
        );

        /*
         * 3. Verify the saved data
         */
        const [rows] = await conn.execute(
            `SELECT id, title, socialLinks
       FROM events
       WHERE id = ?`,
            [eventId]
        );

        console.log("Updated event:");
        console.log(rows);

        await conn.commit();

        console.log("Seeder completed successfully.");
    } catch (error) {
        await conn.rollback();

        console.error("Seeder failed:");
        console.error(error);
    } finally {
        conn.release();
        process.exit();
    }
};

seedSocialLinks();