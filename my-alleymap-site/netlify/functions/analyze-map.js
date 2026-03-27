exports.handler = async function(event) {
  if(event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { imageBase64, imageType, artistList } = JSON.parse(event.body);

    const prompt = 'This is a convention floor plan / artist alley map. I need you to find specific table numbers on this map and return their pixel coordinates.\n\n' +
      'The tables I need to find are:\n' + artistList + '\n\n' +
      'For each table number listed above that you can find on the map, return its approximate centre position as a percentage of the total image width and height (values between 0 and 100).\n\n' +
      'Return ONLY a JSON array like this, no other text:\n' +
      '[{"table":"21","xPct":23.5,"yPct":41.2},{"table":"14","xPct":67.1,"yPct":55.8}]\n\n' +
      'Only include tables you can actually see on the map. If you cannot find a table, omit it.';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imageType, data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if(!data.content || !data.content[0]) throw new Error('No response from Claude');

    let raw = data.content[0].text.trim().replace(/```json|```/g, '').trim();
    const results = JSON.parse(raw);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results })
    };

  } catch(err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
