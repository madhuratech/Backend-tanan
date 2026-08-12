import pool from "../config/db.js";

const seedAdmins = async () => {
    try {
        const admins = [
            {
                name: "User 1",
                email: "saravana.kandaswamy@tanan.no",
            },
            {
                name: "User 2",
                email: "vijayaganesh.sankar@tanan.no",
            },
        ];

        for (const admin of admins) {
            const email = admin.email.trim().toLowerCase();

            // Check whether admin already exists
            const [existingUsers] = await pool.execute(
                `SELECT id FROM admin_users WHERE email = ?`,
                [email]
            );

            if (existingUsers.length > 0) {
                console.log(`⚠️ ${email} already exists`);
                continue;
            }

            // Microsoft OID will be stored after first successful SSO login
            await pool.execute(
                `INSERT INTO admin_users
                    (
                        name,
                        email,
                        password,
                        microsoft_oid,
                        tenant_id
                    )
                 VALUES (?, ?, NULL, NULL, ?)`,
                [
                    admin.name,
                    email,
                    process.env.MS_TENANT_ID,
                ]
            );

            console.log(`✅ ${admin.name} created: ${email}`);
        }

        console.log("✅ Admin seeding completed");
        process.exit(0);
    } catch (error) {
        console.error("❌ Admin seeding failed:", error);
        process.exit(1);
    }
};

seedAdmins();