// server.js
// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));


// List ad accounts accessible to token
app.get('/api/accounts', async (req, res) => {
try {
const token = await getAccessTokenForUser(req.query.userId || null);
const data = await fbGet('me/adaccounts', { fields: 'account_id,name,account_status,currency' }, token);
res.json(data);
} catch (err) {
console.error(err.response?.data || err.message || err);
res.status(500).json({ error: err.message || 'failed' });
}
});


// Enqueue import accounts (rows = array of {fb_account_id,name,status})
app.post('/api/import/accounts', async (req, res) => {
try {
const { rows, created_by } = req.body;
if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows array required' });
const job = await importQueue.add('import_accounts', { rows, created_by });
// store job record
await supabase.from('jobs').insert([{ type: 'import_accounts', payload: { rows }, status: 'pending' }]);
res.json({ jobId: job.id });
} catch (err) {
console.error(err.response?.data || err.message || err);
res.status(500).json({ error: 'enqueue failed' });
}
});


// Enqueue create campaigns (items array)
app.post('/api/bulk/create_campaigns', async (req, res) => {
try {
const { items, created_by } = req.body;
if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items required' });
const job = await importQueue.add('create_campaigns', { items, created_by });
await supabase.from('jobs').insert([{ type: 'create_campaigns', payload: { items }, status: 'pending' }]);
res.json({ jobId: job.id });
} catch (err) {
console.error(err.response?.data || err.message || err);
res.status(500).json({ error: 'enqueue failed' });
}
});


// Insights passthrough
app.get('/api/insights', async (req, res) => {
try {
const { ad_account_id, since, until, userId } = req.query;
if (!ad_account_id) return res.status(400).json({ error: 'ad_account_id required' });
const token = await getAccessTokenForUser(userId || null);
const path = `${ad_account_id}/insights`;
const params = { fields: 'impressions,clicks,spend,actions,reach,frequency' };
if (since && until) { params.since = since; params.until = until; }
const data = await fbGet(path, params, token);
res.json(data);
} catch (err) {
console.error(err.response?.data || err.message || err);
res.status(500).json({ error: 'insights failed' });
}
});


app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
