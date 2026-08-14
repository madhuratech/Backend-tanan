import pool from "../config/db.js";

const seedSocialLinks = async () => {
    let conn;

    try {
        // =====================================================
        // 1. Get database connection
        // =====================================================
        conn = await pool.getConnection();

        console.log("✅ MySQL Connected Successfully");

        // =====================================================
        // 2. Show which database we are connected to
        // =====================================================
        const [dbInfo] = await conn.execute(`
            SELECT
                DATABASE() AS databaseName,
                @@hostname AS databaseHost,
                USER() AS databaseUser
        `);

        console.log("\n========== DATABASE INFO ==========");
        console.table(dbInfo);

        // =====================================================
        // 3. Start transaction
        // =====================================================
        await conn.beginTransaction();


        // =====================================================
        // 4. Create membership_benefits table if it does not exist
        // =====================================================
        await conn.execute(`
    CREATE TABLE IF NOT EXISTS membership_benefits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        pdf VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ON UPDATE CURRENT_TIMESTAMP
    )
`);

        console.log(
            "\n✅ membership_benefits table is ready."
        );

        // =====================================================
        // 5. Check whether socialLinks column exists
        // =====================================================
        const [columnCheck] = await conn.execute(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'events'
              AND COLUMN_NAME = 'socialLinks'
        `);

        console.log("\n========== SOCIAL LINKS COLUMN ==========");
        console.table(columnCheck);

        // =====================================================
        // 5. Create socialLinks column if it does not exist
        // =====================================================
        if (columnCheck.length === 0) {
            console.log(
                "\n⚠️ socialLinks column does not exist."
            );

            console.log(
                "Creating socialLinks column..."
            );

            await conn.execute(`
                ALTER TABLE events
                ADD COLUMN socialLinks JSON NULL
            `);

            console.log(
                "✅ socialLinks column created successfully."
            );
        } else {
            console.log(
                "✅ socialLinks column already exists."
            );
        }

        // =====================================================
        // 6. Get existing events
        // =====================================================
        const [events] = await conn.execute(`
            SELECT
                id,
                title
            FROM events
            ORDER BY id
        `);

        console.log("\n========== EXISTING EVENTS ==========");
        console.table(events);

        // =====================================================
        // 7. Event ID to update
        // =====================================================
        const eventId = 14;

        // Check whether event exists
        const [eventCheck] = await conn.execute(
            `
            SELECT
                id,
                title
            FROM events
            WHERE id = ?
            `,
            [eventId]
        );

        if (eventCheck.length === 0) {
            throw new Error(
                `Event with ID ${eventId} was not found in the client database.`
            );
        }

        console.log(
            `\n✅ Event found: ${eventCheck[0].title} (ID: ${eventId})`
        );

        // =====================================================
        // 8. Social links
        // =====================================================
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

        console.log("\n========== SOCIAL LINKS TO SAVE ==========");
        console.dir(socialLinks, { depth: null });

        // =====================================================
        // 9. Update event
        // =====================================================
        const [updateResult] = await conn.execute(
            `
            UPDATE events
            SET socialLinks = ?
            WHERE id = ?
            `,
            [
                JSON.stringify(socialLinks),
                eventId,
            ]
        );

        console.log(
            `\nAffected rows: ${updateResult.affectedRows}`
        );

        if (updateResult.affectedRows === 0) {
            throw new Error(
                `No rows were updated for event ID ${eventId}.`
            );
        }

        console.log(
            `✅ Social links updated successfully for event ID ${eventId}.`
        );

        // =====================================================
        // 10. Verify saved data
        // =====================================================
        const [updatedEvent] = await conn.execute(
            `
            SELECT
                id,
                title,
                socialLinks
            FROM events
            WHERE id = ?
            `,
            [eventId]
        );

        console.log("\n========== UPDATED EVENT ==========");
        console.dir(updatedEvent, { depth: null });

        // =====================================================
        // 11. Parse and display social links
        // =====================================================
        if (updatedEvent.length > 0) {
            let savedLinks = updatedEvent[0].socialLinks;

            if (typeof savedLinks === "string") {
                try {
                    savedLinks = JSON.parse(savedLinks);
                } catch (error) {
                    console.error(
                        "❌ Unable to parse saved socialLinks JSON."
                    );
                }
            }

            console.log("\n========== SAVED SOCIAL LINKS ==========");
            console.dir(savedLinks, { depth: null });
        }

        // =====================================================
        // 12. Commit transaction
        // =====================================================
        await conn.commit();

        console.log(
            "\n========================================"
        );
        console.log(
            "✅ Seeder completed successfully."
        );
        console.log(
            "========================================\n"
        );

    } catch (error) {
        // Rollback only if connection exists
        if (conn) {
            try {
                await conn.rollback();
            } catch (rollbackError) {
                console.error(
                    "Rollback failed:",
                    rollbackError
                );
            }
        }

        console.error("\n❌ SEEDER FAILED:");
        console.error(error);

    } finally {
        if (conn) {
            conn.release();
        }

        await pool.end();

        process.exit();
    }
};

seedSocialLinks();