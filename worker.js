// worker.js
require('dotenv').config();
const Bull = require('bull');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');


const {
REDIS_URL = 'redis://127.0.0.1:6379',
SUPABASE_URL,
SUPABASE_SERVICE_KEY,
FB_SYSTEM_ACCESS_TOKEN,
TOKEN_ENCRYPTION_KEY_BASE64
} = process.env;


const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const queue = new Bull('bulk-queue', REDIS_URL);
const ENCKEY = Buffer.from(TOKEN_ENCRYPTION_KEY_BASE64 || crypto.randomBytes(32).toString('base64'), 'base64');


function decrypt(b64) {
const buf = Buffer.from(b64, 'base64');
const iv = buf.slice(0, 12);
const tag = buf.slice(12, 28);
const enc = buf.slice(28);
const decipher = crypto.createDecipheriv('aes-256-gcm', ENCKEY, iv);
decipher.setAuthTag(tag);
return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}


async function getToken(created_by) {
if (FB_SYSTEM_ACCESS_TOKEN) return FB_SYSTEM_ACCESS_TOKEN;
const { data, error } = await supabase.from('fb_tokens').select('*').eq('user_id', created_by).limit(1).maybeSingle();
if (error) throw error;
if (!data) throw new Error('No token found');
return decrypt(data.encrypted_token);
}


async function fbPost(path, body, token) {
const url = `https://graph.facebook.com/v16.0/${path}`;
const res = await axios.post(url, new URLSearchParams({ ...body, access_token: token }).toString(), {
headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});
return res.data;
}


queue.process(async (job, done) => {
try {
const { name, data } = job;
console.log('Processing job', job.id, name);
if (name === 'import_accounts') {
const { rows, created_by } = data;
for (const r
