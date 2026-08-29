import { query } from "../config/db.js";

const DEFAULT_THEME = "theme1";
const DEFAULT_ANIMATION = "autumn";

const allowedAnimations = {
    theme1: ["autumn", "spring", "summer"],
    theme2: ["winter"],
};

// GET THEME
export const getTheme = async (req, res) => {
    try {
        const themes = await query(
            "SELECT * FROM themes LIMIT 1"
        );

        let theme = themes[0];

        // CREATE DEFAULT IF EMPTY
        if (!theme) {
            const result = await query(
                `
                INSERT INTO themes
                (activeTheme, activeAnimation)
                VALUES (?, ?)
                `,
                [
                    DEFAULT_THEME,
                    DEFAULT_ANIMATION,
                ]
            );

            const newThemes = await query(
                "SELECT * FROM themes WHERE id = ?",
                [result.insertId]
            );

            theme = newThemes[0];
        }

        res.json({
            success: true,
            data: theme,
        });

    } catch (error) {
        console.error("Get Theme Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get theme",
        });
    }
};


// UPDATE THEME + ANIMATION
export const updateTheme = async (req, res) => {
    try {
        const {
            activeTheme,
            activeAnimation,
        } = req.body;

        console.log("Updating Theme:", activeTheme);
        console.log("Updating Animation:", activeAnimation);

        // VALIDATE THEME
        if (!allowedAnimations[activeTheme]) {
            return res.status(400).json({
                success: false,
                message: "Invalid theme",
            });
        }

        // VALIDATE ANIMATION
        if (
            !activeAnimation ||
            !allowedAnimations[activeTheme].includes(
                activeAnimation
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid animation for selected theme",
            });
        }

        const themes = await query(
            "SELECT * FROM themes LIMIT 1"
        );

        let theme = themes[0];

        // CREATE IF EMPTY
        if (!theme) {
            const result = await query(
                `
                INSERT INTO themes
                (activeTheme, activeAnimation)
                VALUES (?, ?)
                `,
                [
                    activeTheme,
                    activeAnimation,
                ]
            );

            const newThemes = await query(
                "SELECT * FROM themes WHERE id = ?",
                [result.insertId]
            );

            theme = newThemes[0];

        } else {

            await query(
                `
                UPDATE themes
                SET
                    activeTheme = ?,
                    activeAnimation = ?
                WHERE id = ?
                `,
                [
                    activeTheme,
                    activeAnimation,
                    theme.id,
                ]
            );

            const newThemes = await query(
                "SELECT * FROM themes WHERE id = ?",
                [theme.id]
            );

            theme = newThemes[0];
        }

        console.log(
            "Saved Theme:",
            theme.activeTheme
        );

        console.log(
            "Saved Animation:",
            theme.activeAnimation
        );

        res.json({
            success: true,
            data: theme,
        });

    } catch (error) {
        console.error("Update Theme Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update theme",
        });
    }
};


// THEME HEARTBEAT
export const themeHeartbeat = async (req, res) => {
    try {
        const themes = await query(
            "SELECT * FROM themes LIMIT 1"
        );

        let theme = themes[0];

        // CREATE DEFAULT IF EMPTY
        if (!theme) {
            const result = await query(
                `
                INSERT INTO themes
                (activeTheme, activeAnimation)
                VALUES (?, ?)
                `,
                [
                    DEFAULT_THEME,
                    DEFAULT_ANIMATION,
                ]
            );

            const newThemes = await query(
                "SELECT * FROM themes WHERE id = ?",
                [result.insertId]
            );

            theme = newThemes[0];
        }

        res.json({
            success: true,
            updatedAt: theme.updatedAt,
        });

    } catch (error) {
        console.error(
            "Theme Heartbeat Error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to check theme heartbeat",
        });
    }
};