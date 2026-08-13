import pool, { query } from "../config/db.js";
import fs from "fs";
import path from "path";


const BACKEND_URL = process.env.BACKEND_URL;

function parseSocialLinks(value) {
  if (!value) return [];

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }

  return value;
}

// Helper function to map events with chips and gallery data
async function mapEventsWithChipsAndGallery(dbEvents) {
  if (dbEvents.length === 0) return [];

  const eventIds = dbEvents.map((e) => e.id);
  const chipsRows = await query(
    `SELECT * FROM event_chips WHERE eventId IN (${eventIds.join(",")})`
  );

  const galleryIds = [
    ...new Set(
      dbEvents.map((e) => e.galleryId).filter((id) => id !== null)
    ),
  ];

  let galleries = [];

  if (galleryIds.length > 0) {
    galleries = await query(
      `SELECT id, title FROM galleries WHERE id IN (${galleryIds.join(",")})`
    );
  }

  return dbEvents.map((e) => {
    const eventChips = chipsRows
      .filter((c) => c.eventId === e.id)
      .map((c) => c.chip);

    let galleryObj = null;

    if (e.galleryId) {
      const gall = galleries.find((g) => g.id === e.galleryId);

      if (gall) {
        galleryObj = {
          _id: gall.id.toString(),
          id: gall.id,
          title: gall.title,
        };
      }
    }

    return {
      _id: e.id.toString(),
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      eventDate: e.eventDate,
      image: e.image
        ? e.image.startsWith("http")
          ? e.image
          : `${BACKEND_URL}${e.image}`
        : "",
      chips: eventChips,
      status: e.status,
      gallery: galleryObj,
      socialLinks: parseSocialLinks(e.socialLinks),
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  });
}

export const getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;

    const dbEvents = await query(
      "SELECT * FROM events WHERE id = ?",
      [eventId]
    );

    if (dbEvents.length === 0) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

   

    const mapped = await mapEventsWithChipsAndGallery(dbEvents);

    res.status(200).json(mapped[0]);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getEvents = async (req, res) => {
  try {
    const dbEvents = await query(
      "SELECT * FROM events ORDER BY createdAt DESC"
    );

    const mapped = await mapEventsWithChipsAndGallery(dbEvents);

    res.status(200).json(mapped);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const createEvent = async (req, res) => {
  try {
    console.log(req.file);

    // const image = req.file
    //   ? `${req.protocol}://${req.get(
    //     "host"
    //   )}/uploads/events/${req.file.filename}`
    //   : "";

    const image = req.file
      ? `/uploads/events/${req.file.filename}`
      : "";

    const chips = JSON.parse(req.body.chips || "[]");
    const socialLinks = JSON.parse(req.body.socialLinks || "[]");
    const status = req.body.status || "Upcoming";

    const galleryId =
      status === "Completed" && req.body.gallery
        ? parseInt(req.body.gallery, 10)
        : null;

    const conn = await pool.getConnection();

    let eventId;

    try {
      await conn.beginTransaction();

      const [eventResult] = await conn.execute(
        `INSERT INTO events (
          title,
          description,
          location,
          eventDate,
          image,
          status,
          galleryId,
          socialLinks
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.body.title,
          req.body.description,
          req.body.location,
          req.body.eventDate,
          image,
          status,
          galleryId,
          JSON.stringify(socialLinks),
        ]
      );

      eventId = eventResult.insertId;

      for (const chip of chips) {
        await conn.execute(
          "INSERT INTO event_chips (eventId, chip) VALUES (?, ?)",
          [eventId, chip]
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    const dbEvents = await query(
      "SELECT * FROM events WHERE id = ?",
      [eventId]
    );

    const mapped = await mapEventsWithChipsAndGallery(dbEvents);

    res.status(201).json(mapped[0]);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;

    const dbEvents = await query(
      "SELECT * FROM events WHERE id = ?",
      [eventId]
    );

    if (dbEvents.length === 0) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    const event = dbEvents[0];
    let image = event.image;

    if (req.file) {
      if (image) {
        const imagePath = image.startsWith("http")
          ? new URL(image).pathname
          : image;

        const filePath = path.join(
          process.cwd(),
          imagePath.replace(/^\//, "")
        );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // image = `${req.protocol}://${req.get(
      //   "host"
      // )}/uploads/events/${req.file.filename}`;


      image = `/uploads/events/${req.file.filename}`;
    }

    const title = req.body.title;
    const description = req.body.description;
    const location = req.body.location;
    const eventDate = req.body.eventDate;

    const chips = JSON.parse(req.body.chips || "[]");
    const status = req.body.status || "Upcoming";
    const socialLinks = JSON.parse(req.body.socialLinks || "[]");
    const galleryId =
      status === "Completed" && req.body.gallery
        ? parseInt(req.body.gallery, 10)
        : null;

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE events
         SET
            title = ?,
            description = ?,
            location = ?,
            eventDate = ?,
            image = ?,
            status = ?,
            galleryId = ?,
              socialLinks = ?
         WHERE id = ?`,
        [
          title,
          description,
          location,
          eventDate,
          image,
          status,
          galleryId,
          JSON.stringify(socialLinks),
          eventId,
        ]
      );

      await conn.execute(
        "DELETE FROM event_chips WHERE eventId = ?",
        [eventId]
      );

      for (const chip of chips) {
        await conn.execute(
          "INSERT INTO event_chips (eventId, chip) VALUES (?, ?)",
          [eventId, chip]
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    const updatedDbEvents = await query(
      "SELECT * FROM events WHERE id = ?",
      [eventId]
    );

    const mapped = await mapEventsWithChipsAndGallery(updatedDbEvents);

    res.status(200).json(mapped[0]);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;

    const dbEvents = await query(
      "SELECT * FROM events WHERE id = ?",
      [eventId]
    );

    if (dbEvents.length === 0) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    const event = dbEvents[0];

    if (event.image) {
      try {
        const imagePath = event.image.startsWith("http")
          ? new URL(event.image).pathname
          : event.image;

        const filePath = path.join(
          process.cwd(),
          imagePath.replace(/^\//, "")
        );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.error("Error unlinking image file:", e);
      }
    }

    await query("DELETE FROM events WHERE id = ?", [eventId]);

    res.status(200).json({
      message: "Event deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};