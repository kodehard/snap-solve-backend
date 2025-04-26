export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Extension-ID');
    
    // Handle preflight request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Only allow POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
      // Basic validation of request
      const { endpoint, data } = req.body;
      
      if (!endpoint || !data) {
        return res.status(400).json({ error: 'Invalid request format' });
      }
      
      // For testing - remove extension ID validation for now
      // We'll add it back after publishing
      /*
      const extensionId = req.headers['x-extension-id'];
      const validExtensionIds = ['YOUR_EXTENSION_ID_AFTER_PUBLISHING'];
      
      if (!validExtensionIds.includes(extensionId)) {
        return res.status(403).json({ error: 'Unauthorized client' });
      }
      */
      
      // API Key (store as environment variable in Vercel)
      const API_KEY = process.env.OPENROUTER_API_KEY;
      
      if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured on server' });
      }
      
      // Handle different endpoints
      if (endpoint === 'ping') {
        return res.status(200).json({ success: true, message: 'API is working!' });
      }
      
      if (endpoint === 'vision') {
        // Call OpenRouter API
        console.log('Calling OpenRouter API with image data');
        
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'HTTP-Referer': 'https://github.com/OpenRouterTeam/openrouter',
            'X-Title': 'Snap Solve'
          },
          body: JSON.stringify({
            model: data.model || 'qwen/qwen2.5-vl-72b-instruct:free',
            messages: [
              { 
                role: "system", 
                content: data.systemPrompt || 'You are analyzing an image containing a problem. Provide a complete solution.'
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Please solve the problem in this image. Provide a detailed step-by-step solution."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: data.image
                    }
                  }
                ]
              }
            ],
            temperature: 0.7,
            max_tokens: 800,
            stream: false
          })
        });
        
        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          console.error(`API error (${openRouterResponse.status}):`, errorText);
          return res.status(openRouterResponse.status).json({ 
            error: `API error: ${errorText}` 
          });
        }
        
        // Process the response from OpenRouter
        const apiData = await openRouterResponse.json();
        
        // Return the result to the extension
        if (apiData.choices && apiData.choices.length > 0) {
          return res.status(200).json({ 
            success: true, 
            solution: apiData.choices[0].message.content 
          });
        } else {
          return res.status(500).json({ 
            error: 'No valid response from API' 
          });
        }
      }
      
      // Unknown endpoint
      return res.status(400).json({ error: 'Unknown endpoint' });
      
    } catch (error) {
      console.error('Error in proxy:', error);
      return res.status(500).json({ 
        error: `Server error: ${error.message}` 
      });
    }
  }