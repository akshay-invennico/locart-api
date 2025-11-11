const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

require("dotenv").config();

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const bucketName = process.env.AWS_BUCKET_NAME || "locart-staging";

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} folder - Folder name (e.g., 'products', 'merchants')
 * @param {string} mimetype - File mimetype
 * @returns {Promise<string>} - S3 file URL
 */
const uploadToS3 = async (fileBuffer, fileName, folder, mimetype) => {
  try {
    // Generate unique file name to avoid conflicts
    const timestamp = Date.now();
    const uniqueFileName = `${folder}/${timestamp}-${fileName}`;

    const uploadParams = {
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: fileBuffer,
      ContentType: mimetype,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Return the public URL of the uploaded file
    return `https://${bucketName}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${uniqueFileName}`;
  } catch (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Upload multiple files to S3
 * @param {Array} files - Array of file objects
 * @param {string} folder - Folder name
 * @returns {Promise<Array<string>>} - Array of S3 file URLs
 */
const uploadMultipleToS3 = async (files, folder) => {
  try {
    const uploadPromises = files.map((file) =>
      uploadToS3(file.buffer, file.originalname, folder, file.mimetype)
    );

    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls;
  } catch (error) {
    throw new Error(`Failed to upload files: ${error.message}`);
  }
};

/**
 * Delete file from S3
 * @param {string} fileUrl - S3 file URL
 * @returns {Promise<boolean>} - Success status
 */
const deleteFromS3 = async (fileUrl) => {
  try {
    // Extract key from URL
    const key = fileUrl.split(
      `https://${bucketName}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/`
    )[1];

    if (!key) {
      throw new Error("Invalid file URL");
    }

    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    return true;
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Generate pre-signed URL for temporary access
 * @param {string} fileName - File name
 * @param {string} folder - Folder name
 * @param {number} expiresIn - URL expiration in seconds (default: 3600)
 * @returns {Promise<string>} - Pre-signed URL
 */
const generatePresignedUrl = async (fileName, folder, expiresIn = 3600) => {
  try {
    const timestamp = Date.now();
    const uniqueFileName = `${folder}/${timestamp}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return {
      signedUrl,
      fileUrl: `https://${bucketName}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${uniqueFileName}`,
    };
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    throw new Error(`Failed to generate pre-signed URL: ${error.message}`);
  }
};

module.exports = {
  uploadToS3,
  uploadMultipleToS3,
  deleteFromS3,
  generatePresignedUrl,
  s3Client,
};
