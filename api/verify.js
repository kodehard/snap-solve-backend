import clientPromise from '../lib/mongodb';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Extension-ID');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Only allow POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
      const { extensionId, installationId } = req.body;
      
      if (!extensionId || !installationId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const validExtensionIds = ['YOUR_EXTENSION_ID_AFTER_PUBLISHING'];
      const isValidExtension = validExtensionIds.includes(extensionId) || process.env.NODE_ENV === 'development';
      
      if (!isValidExtension) {
        return res.status(403).json({ 
          verified: false,
          error: 'Unauthorized extension'
        });
      }
      
      // Connect to MongoDB
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB || 'snap_solve');
      
      // Check if this installation ID has been verified before
      const existingLicense = await db.collection('licenses').findOne({
        extensionId,
        installationId
      });
      
      // If not found, create a new record
      if (!existingLicense) {
        await db.collection('licenses').insertOne({
          extensionId,
          installationId,
          verified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        // Update last verification time
        await db.collection('licenses').updateOne(
          { extensionId, installationId },
          { $set: { updatedAt: new Date() } }
        );
      }
      
      return res.status(200).json({ 
        verified: true,
        expiryTime: null,
        installationId: installationId
      });
    } catch (error) {
      console.error('Error in license verification:', error);
      return res.status(500).json({ 
        verified: false,
        error: 'Server error during verification'
      });
    }
  }