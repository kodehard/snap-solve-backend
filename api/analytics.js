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
    const { event, data, extensionId, timestamp } = req.body;
    
    if (!event || !extensionId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Connect to MongoDB - wrap in try/catch to not block the response
    try {
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB || 'snap_solve');
      
      // Store the analytics event
      await db.collection('analytics').insertOne({
        event,
        data,
        extensionId,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      });
    } catch (dbError) {
      console.error('Database error in analytics:', dbError);
      // Don't fail the API response due to DB errors
    }
    
    // Always return success quickly
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in analytics:', error);
    return res.status(200).json({ success: true });
  }
}