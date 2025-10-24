// A simple Node.js backend to serve the TreePro AI data.
// In a real production environment, this would connect to a database like Cloud SQL.
// For now, it uses an in-memory version of the mock data.

const http = require('http');
const url = require('url');

// --- IN-MEMORY DATABASE ---
// We need to simulate the data. Since this is a .js file, we can't directly import TS.
// This is a simplified, copied version of the mock data.
let { mockCustomers, mockLeads, mockQuotes, mockJobs, mockInvoices, mockEmployees, mockEquipment } = require('./data/mockData.js');

const dataSources = {
    customers: mockCustomers,
    leads: mockLeads,
    quotes: mockQuotes,
    jobs: mockJobs,
    invoices: mockInvoices,
    employees: mockEmployees,
    equipment: mockEquipment,
};


// --- HELPER FUNCTIONS ---

const parseBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', (err) => reject(err));
    });
};

const sendJSON = (res, status, data) => {
    res.writeHead(status, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
     });
    res.end(JSON.stringify(data));
};

const handleError = (res, status, message) => {
    res.writeHead(status, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: message }));
};

// --- REQUEST HANDLER ---

const server = http.createServer(async (req, res) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    const reqUrl = url.parse(req.url, true);
    const pathParts = reqUrl.pathname.split('/').filter(Boolean); // e.g., ['api', 'customers', 'cust1']

    if (pathParts[0] !== 'api') {
        return handleError(res, 404, 'Not Found');
    }

    const resource = pathParts[1]; // e.g., 'customers'
    const id = pathParts[2];       // e.g., 'cust1'
    
    const data = dataSources[resource];

    if (!data) {
        return handleError(res, 404, `Resource '${resource}' not found.`);
    }

    try {
        switch (req.method) {
            case 'GET':
                if (id) {
                    const item = data.find(item => item.id === id);
                    if (item) {
                        sendJSON(res, 200, item);
                    } else {
                        handleError(res, 404, 'Item not found');
                    }
                } else {
                    sendJSON(res, 200, data);
                }
                break;

            case 'POST':
                const newItemData = await parseBody(req);
                const newId = `${resource.slice(0, 4)}-${Date.now()}`;
                const newItem = { id: newId, ...newItemData };
                data.push(newItem);
                sendJSON(res, 201, newItem);
                break;

            case 'PUT':
                if (!id) return handleError(res, 400, 'Missing ID for PUT request');
                const updateData = await parseBody(req);
                const itemIndex = data.findIndex(item => item.id === id);
                if (itemIndex > -1) {
                    data[itemIndex] = { ...data[itemIndex], ...updateData };
                    sendJSON(res, 200, data[itemIndex]);
                } else {
                    handleError(res, 404, 'Item not found');
                }
                break;
            
            case 'DELETE':
                if (!id) return handleError(res, 400, 'Missing ID for DELETE request');
                const deleteIndex = data.findIndex(item => item.id === id);
                if (deleteIndex > -1) {
                    data.splice(deleteIndex, 1);
                    sendJSON(res, 204, null);
                } else {
                    handleError(res, 404, 'Item not found');
                }
                break;
            
            default:
                handleError(res, 405, 'Method Not Allowed');
        }
    } catch (e) {
        handleError(res, 500, `Internal Server Error: ${e.message}`);
    }
});


// --- START SERVER ---
const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
