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
        const uploadType = (req.query.type as string) === 'logo' ? 'logos' : 'members';
        const objectKey = `${tenantId}/${uploadType}/${Date.now()}-${uuidv4()}.${ext}`;

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

export const uploadImageDirect = async (req: Request, res: Response): Promise<void> => {
    try {
        const { imageBase64, filename, contentType } = req.body;
        if (!imageBase64) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'imageBase64 is required' });
            return;
        }

        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        const region = process.env.AWS_REGION || 'ap-south-1';
        const ext = (filename as string)?.split('.').pop() || 'jpg';
        const mimeType = contentType || (imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg');

        // Extract base64 clean data
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        if (bucketName && process.env.AWS_ACCESS_KEY_ID) {
            try {
                const s3Client = new S3Client({ region });
                const entityId = (req as any).user?.entityId || 'general';
                const objectKey = `diary/${entityId}/${Date.now()}-${uuidv4()}.${ext}`;

                await s3Client.send(new PutObjectCommand({
                    Bucket: bucketName,
                    Key: objectKey,
                    Body: buffer,
                    ContentType: mimeType,
                }));

                const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${objectKey}`;
                res.status(HTTP_STATUS.OK).json({ url: publicUrl, publicUrl });
                return;
            } catch (s3Err) {
                console.warn('S3 upload fallback to data URI:', s3Err);
            }
        }

        // Return optimized data URI if S3 not configured or in local development
        const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${base64Data}`;
        res.status(HTTP_STATUS.OK).json({ url: dataUrl, publicUrl: dataUrl });
    } catch (error) {
        console.error('Error in uploadImageDirect:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to process image upload' });
    }
};
