const key = "AIzaSyCveFgmFxuFbl6cf5vosF2AR-j6sx2A-Ts";

async function testStandardGemini25() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Hello' }] }]
    })
  });
  console.log(`Standard Endpoint 2.5 -> Status: ${response.status}`);
  try {
    const text = await response.text();
    console.log(`Response: ${text.slice(0, 300)}`);
  } catch (e) {
    console.log(`Error parsing response: ${e.message}`);
  }
}

async function runTests() {
  await testStandardGemini25();
}

runTests();
