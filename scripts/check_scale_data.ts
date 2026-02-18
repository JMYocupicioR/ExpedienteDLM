
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('Fetching last 5 scale assessments...');
  const { data, error } = await supabase
    .from('scale_assessments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  console.log('Data found:', data?.length);
  if (data) {
    data.forEach((item, index) => {
      console.log(`\n--- Item ${index + 1} ---`);
      console.log('ID:', item.id);
      console.log('Created At:', item.created_at);
      console.log('Answers:', item.answers);
      console.log('Answers Type:', typeof item.answers);
      console.log('Interpretation:', item.interpretation);
      console.log('Interpretation Type:', typeof item.interpretation);
      console.log('Score:', item.score);
    });
  }
}

checkData();
