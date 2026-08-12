import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dns from "node:dns/promises";

import pool from "./config/db.js";

import themeRoutes from "./routes/themeRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import galleryRoutes from "./routes/galleryRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import faqRoutes from "./routes/faqRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";


// ========================================
// Environment
// ========================================

dotenv.config();


// ========================================
// DNS
// ========================================

dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);


// ========================================
// Express
// ========================================

const app = express();


// ========================================
// CORS
// ========================================

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",

    "https://tanan.vercel.app",
    "https://admintanan.vercel.app",
    "https://admin.tanan.no",
    "https://tanan.no"
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
    origin(origin, callback) {

        console.log("Incoming Origin:", origin);

        // Allow requests without origin (Postman, Mobile Apps)
        if (!origin) {
            return callback(null, true);
        }

        // Allow any localhost
        if (
            origin.startsWith("http://localhost:") ||
            origin.startsWith("http://127.0.0.1:")
        ) {
            return callback(null, true);
        }

        // Allow any Vercel deployment
        if (origin.endsWith(".vercel.app")) {
            return callback(null, true);
        }

        // Allow configured domains
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.log("Blocked Origin:", origin);

        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },

    credentials: true,

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],

    allowedHeaders: [
        "Origin",
        "Content-Type",
        "Accept",
        "Authorization",
        "X-Requested-With",
    ],
};

app.use(cors(corsOptions));


// ========================================
// Middleware
// ========================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true,
    })
);


// ========================================
// Static Uploads
// ========================================

app.use(
    "/uploads",
    express.static("uploads")
);


// ========================================
// Routes
// ========================================

app.use("/api/themes", themeRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/galleries", galleryRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/dashboard", dashboardRoutes);


// ========================================
// Health Check
// ========================================

app.get("/", (req, res) => {
    res.send("TANAN API Running");
});

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend is running",
        timestamp: new Date().toISOString(),
    });
});

app.get("/tanan-debug", (req, res) => {
    res.json({
        success: true,
        message: "Current TANAN backend is running",
    });
});


// ========================================
// 404
// ========================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found",
    });
});


// ========================================
// Error Handler
// ========================================

app.use((err, req, res, next) => {

    console.error("Server Error:", err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });

});


// ========================================
// Server
// ========================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {

    try {

        await pool.query("SELECT 1");

        console.log("✅ MySQL Database Connected Successfully");

    } catch (error) {

        console.error(
            "❌ Database Connection Failed:",
            error.message
        );

    }

    app.listen(PORT, () => {

        console.log(`🚀 Server running on port ${PORT}`);

    });

};

startServer();