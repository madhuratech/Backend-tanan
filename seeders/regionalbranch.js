import pool from "../config/db.js";

const RegionalBranch = async () => {
    let conn;

    try {
        conn = await pool.getConnection();

        console.log("✅ MySQL Connected Successfully");

        await conn.beginTransaction();

        // =====================================================
        // 1. Check link column
        // =====================================================

        const [columnCheck] = await conn.execute(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'regional_branches'
              AND COLUMN_NAME = 'link'
        `);

        console.log("\n========== LINK COLUMN ==========");
        console.table(columnCheck);

        // =====================================================
        // 2. Create link column if missing
        // =====================================================

        if (columnCheck.length === 0) {
            console.log("\n⚠️ link column does not exist.");

            await conn.execute(`
                ALTER TABLE regional_branches
                ADD COLUMN link VARCHAR(500) NULL AFTER email
            `);

            console.log(
                "✅ link column created successfully."
            );
        } else {
            console.log(
                "✅ link column already exists."
            );
        }

        // =====================================================
        // 3. Show existing branches
        // =====================================================

        const [branches] = await conn.execute(`
            SELECT
                id,
                name,
                number,
                email,
                link
            FROM regional_branches
            ORDER BY id
        `);

        console.log(
            "\n========== EXISTING REGIONAL BRANCHES =========="
        );

        console.table(branches);

        // =====================================================
        // 4. Branch links
        // =====================================================

        const branchLinks = {
    12: "https://virksomhet.brreg.no/nb/oppslag/enheter/934831632",
    13: "https://virksomhet.brreg.no/nb/oppslag/enheter/934831241",
    14: "https://virksomhet.brreg.no/nb/oppslag/enheter/934825292YOUR_ASKER_LIER_LINK",
};

        // =====================================================
        // 5. Update branch links
        // =====================================================

        for (const [branchId, link] of Object.entries(branchLinks)) {

            const [branch] = await conn.execute(
                `
                SELECT
                    id,
                    name
                FROM regional_branches
                WHERE id = ?
                `,
                [branchId]
            );

            if (branch.length === 0) {
                console.log(
                    `⚠️ Branch ID ${branchId} not found.`
                );

                continue;
            }

            await conn.execute(
                `
                UPDATE regional_branches
                SET link = ?
                WHERE id = ?
                `,
                [
                    link,
                    branchId,
                ]
            );

            console.log(
                `✅ Updated ${branch[0].name} (ID: ${branchId})`
            );
        }

        // =====================================================
        // 6. Verify final data
        // =====================================================

        const [updatedBranches] = await conn.execute(`
            SELECT
                id,
                name,
                number,
                email,
                link
            FROM regional_branches
            ORDER BY id
        `);

        console.log(
            "\n========== UPDATED REGIONAL BRANCHES =========="
        );

        console.table(updatedBranches);

        // =====================================================
        // 7. Commit
        // =====================================================

        await conn.commit();

        console.log(
            "\n✅ Regional branches seeder completed successfully."
        );

    } catch (error) {

        if (conn) {
            await conn.rollback();
        }

        console.error(
            "\n❌ Regional branches seeder failed:"
        );

        console.error(error);

    } finally {

        if (conn) {
            conn.release();
        }

        await pool.end();

        process.exit();
    }
};

RegionalBranch();