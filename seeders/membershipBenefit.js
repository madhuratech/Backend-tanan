import pool from "../config/db.js";

const MembershipBenefits = async () => {
    let conn;

    try {
        // =====================================================
        // 1. Get database connection
        // =====================================================
        conn = await pool.getConnection();

        console.log("✅ MySQL Connected Successfully");

        // =====================================================
        // 2. Database information
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
        // 4. Create membership_benefits table
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
        // 5. Check existing records
        // =====================================================
        const [existingBenefits] = await conn.execute(`
            SELECT
                id,
                title,
                description,
                pdf
            FROM membership_benefits
            ORDER BY id
        `);

        console.log("\n========== EXISTING MEMBERSHIP BENEFITS ==========");

        if (existingBenefits.length > 0) {
            console.table(existingBenefits);
        } else {
            console.log("No membership benefits found.");
        }

        // =====================================================
        // 6. Sample membership benefit
        // =====================================================
        const title = "Membership Benefits";

        const description =
            "Discover the benefits and privileges available to our members.";

        const pdf =
            "/uploads/documents/membership-benefits.pdf";

        // =====================================================
        // 7. Check duplicate
        // =====================================================
        const [duplicateCheck] = await conn.execute(
            `
            SELECT id
            FROM membership_benefits
            WHERE title = ?
            LIMIT 1
            `,
            [title]
        );

        // =====================================================
        // 8. Insert only if it does not exist
        // =====================================================
        if (duplicateCheck.length === 0) {
            const [insertResult] = await conn.execute(
                `
                INSERT INTO membership_benefits
                (
                    title,
                    description,
                    pdf
                )
                VALUES (?, ?, ?)
                `,
                [
                    title,
                    description,
                    pdf,
                ]
            );

            console.log(
                `\n✅ Membership benefit inserted successfully. ID: ${insertResult.insertId}`
            );
        } else {
            console.log(
                `\n⚠️ Membership benefit already exists. ID: ${duplicateCheck[0].id}`
            );
        }

        // =====================================================
        // 9. Verify saved data
        // =====================================================
        const [savedBenefits] = await conn.execute(`
            SELECT
                id,
                title,
                description,
                pdf,
                created_at,
                updated_at
            FROM membership_benefits
            ORDER BY id DESC
        `);

        console.log("\n========== SAVED MEMBERSHIP BENEFITS ==========");
        console.table(savedBenefits);

        // =====================================================
        // 10. Commit
        // =====================================================
        await conn.commit();

        console.log(
            "\n========================================"
        );
        console.log(
            "✅ Membership Benefits Seeder Completed"
        );
        console.log(
            "========================================\n"
        );

    } catch (error) {

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

MembershipBenefits();