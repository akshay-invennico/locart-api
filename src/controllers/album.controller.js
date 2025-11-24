const Album = require("../models/albumn.model");
const { uploadMultipleToS3 } = require("../services/awsS3");

const createAlbum = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Album name is required",
      });
    }

    let photos = [];
    if (req.files && req.files.length > 0) {
      try {
        const uploaded = await uploadMultipleToS3(req.files, "photos");
        photos = uploaded.map((file) => file.Location || file.url);

      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload photos",
          error: uploadError.message,
        });
      }
    }

    if (photos.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Maximum 20 photos allowed",
      });
    }

    const album = await Album.create({
      name,
      description,
      photos,
    });

    return res.status(201).json({
      success: true,
      message: "Album created successfully",
      data: album,
    });
  } catch (error) {
    console.error("Album creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAllAlbums = async (req, res) => {
  try {

    const albums = await Album.find({}).sort({ created_at: -1 });

    return res.status(200).json({
      success: true,
      message: "Albums fetched successfully",
      data: albums,
    });
  } catch (error) {
    console.error("Get Albums Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAlbumById = async (req, res) => {
  try {
    const { id } = req.params;
    const salon_id = req.user.salon_id;

    const album = await Album.findOne({
      _id: id,
      salon_id,
      deleted_at: null
    });

    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Album not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Album fetched successfully",
      data: album,
    });
  } catch (error) {
    console.error("Get Album By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = { createAlbum, getAllAlbums, getAlbumById };
