const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

exports.uploadToS3 = async (file) => {
  const fileExtension = path.extname(file.originalname);
  const Key = `profiles/${uuidv4()}${fileExtension}`;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const result = await s3.upload(params).promise();
  return result.Location;
};

exports.deleteFromS3 = async (fileUrl) => {
  const bucketName = process.env.AWS_BUCKET_NAME;
  const baseUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
  const Key = fileUrl.replace(baseUrl, '');

  const params = {
    Bucket: bucketName,
    Key,
  };

  await s3.deleteObject(params).promise();
};