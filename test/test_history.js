
// ESM compatible script
const baseUrl = 'http://localhost:3000/api';
let cookie = '';

async function runTest() {
    try {
        console.log('1. Starting Conversation (Find Cars)...');
        const findRes = await fetch(`${baseUrl}/find-cars`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requirements: 'I want a cheap city car for italian streets, under 15k' })
        });

        // Cookie handling might be tricky with fetch in Node if not using a cookie jar.
        // Express session usually sets a cookie 'connect.sid'.
        // We need to manually pass it in subsequent requests.
        const setCookie = findRes.headers.get('set-cookie');
        if (setCookie) {
            cookie = setCookie.split(';')[0];
            console.log('   Session acquired:', cookie);
        } else {
            console.warn('   No cookie received! Session might not work.');
        }

        const findData = await findRes.json();
        console.log('   Find result:', findData.success);

        if (!findData.success) throw new Error('Find failed');

        const car1 = findData.cars[0].make + ' ' + findData.cars[0].model;
        const car2 = findData.cars[1].make + ' ' + findData.cars[1].model;

        console.log(`2. Comparing ${car1} vs ${car2}...`);
        const compareRes = await fetch(`${baseUrl}/compare-cars`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie
            },
            body: JSON.stringify({ car1, car2 })
        });
        const compareData = await compareRes.json();
        console.log('   Compare result:', compareData.success);

        console.log(`3. Asking about ${car1}...`);
        const askRes = await fetch(`${baseUrl}/ask-about-car`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie
            },
            body: JSON.stringify({ car: car1, question: 'Is it reliable?' })
        });
        const askData = await askRes.json();
        console.log('   Ask result:', askData.success);

        console.log(`4. Getting alternatives for ${car1}...`);
        const altRes = await fetch(`${baseUrl}/get-alternatives`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie
            },
            body: JSON.stringify({ car: car1, reason: 'Too small' })
        });
        const altData = await altRes.json();
        console.log('   Alternatives result:', altData.success);

        console.log('5. verifying History...');
        const histRes = await fetch(`${baseUrl}/get-conversations`);
        const histData = await histRes.json();

        // Find conversation by scanning all
        // Since we don't have the sessionID explicitly in the cookie easily extracted without parsing, 
        // we look for one that matches our interactions.

        const myConv = histData.conversations.find((conv) => {
            // Match if history has our car1 or original requirements hint
            return conv.history && conv.history.some(h =>
                (h.data.car1 === car1) || 
                (h.data.car === car1) || 
                (h.data.requirements && h.data.requirements.includes('cheap city car'))
            );
        });

        if (myConv) {
            console.log('   Conversation found:', myConv.id);
            console.log('   History Length:', myConv.history ? myConv.history.length : 'undefined');
            
            if (myConv.history && myConv.history.length >= 4) {
                console.log('   ✅ SUCCESS: History has expected 4+ items.');
                // Check types
                const types = myConv.history.map(h => h.type);
                console.log('   Types in history:', types);
            } else {
                console.error('   ❌ FAILURE: History missing or too short.');
                console.log('   Data:', JSON.stringify(myConv, null, 2));
            }
        } else {
            console.error('   ❌ FAILURE: Conversation not found in list.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTest();
