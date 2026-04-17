import { Request, Response } from 'express';
import { HTTP_STATUS } from '../utils/constants';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export const getPresignedUrl = async (req: Request, res: Response): Promise<void> => {
    try {
        const { filename, contentType } = req.query;
        if (!filename) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'filename is required' });
            return;
        }

        const bucketName = process.env.AWS_S3_BUCKET_NAME || 'gym-uploads';
        const region = process.env.AWS_REGION || 'ap-south-1';
        
        // Ensure credentials are available (or S3Client will throw later)
        const s3Client = new S3Client({
            region,
        });

        // Generate a tenant-safe unique path
        const ext = (filename as string).split('.').pop();
        const tenantId = (req as any).user?.tenantId || 'global';
        const objectKey = `${tenantId}/members/${Date.now()}-${uuidv4()}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            ContentType: (contentType as string) || 'image/jpeg',
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
        const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${objectKey}`;

        res.status(HTTP_STATUS.OK).json({ 
            uploadUrl, 
            publicUrl 
        });
    } catch (error) {
        console.error('Error generating presigned url:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Error generating upload URL', error });
    }
};
