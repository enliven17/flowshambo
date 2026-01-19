// Quick test script to verify Supabase connection
// Run with: node test-supabase.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tgwwzppwoyfqidkgwrwa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnd3d6cHB3b3lmcWlka2d3cndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTMzNzMsImV4cCI6MjA4NDM4OTM3M30.Vda8Qgf2HrdVGGCMlK4xqKJhMapcJsuXgCO1j28AhFs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...\n');
  
  // Test 1: Check if we can query the games table
  console.log('1. Testing SELECT query...');
  const { data: games, error: selectError } = await supabase
    .from('games')
    .select('*')
    .limit(5);
  
  if (selectError) {
    console.error('❌ SELECT failed:', selectError.message);
    console.error('Details:', selectError);
  } else {
    console.log('✅ SELECT successful!');
    console.log(`Found ${games.length} games`);
    if (games.length > 0) {
      console.log('Latest game:', games[0]);
    }
  }
  
  console.log('\n2. Testing INSERT query...');
  const testGame = {
    player_address: '0xTEST123',
    bet_amount: 1.0,
    prediction: 'rock',
    winner: 'paper',
    payout: 0,
    transaction_id: 'test_' + Date.now(),
    status: 'completed'
  };
  
  const { data: insertData, error: insertError } = await supabase
    .from('games')
    .insert(testGame)
    .select();
  
  if (insertError) {
    console.error('❌ INSERT failed:', insertError.message);
    console.error('Details:', insertError);
  } else {
    console.log('✅ INSERT successful!');
    console.log('Inserted game:', insertData);
  }
  
  console.log('\n3. Connection test complete!');
}

testConnection().catch(console.error);
