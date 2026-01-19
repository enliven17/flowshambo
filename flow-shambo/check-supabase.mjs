// ES Module version for testing Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tgwwzppwoyfqidkgwrwa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnd3d6cHB3b3lmcWlka2d3cndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTMzNzMsImV4cCI6MjA4NDM4OTM3M30.Vda8Qgf2HrdVGGCMlK4xqKJhMapcJsuXgCO1j28AhFs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Testing Supabase Connection...\n');

// Test 1: Check table exists
console.log('1️⃣ Testing if games table exists...');
const { data: games, error: selectError } = await supabase
  .from('games')
  .select('*')
  .limit(1);

if (selectError) {
  console.error('❌ Table check failed:', selectError.message);
  console.error('Details:', selectError);
  console.log('\n⚠️  The games table might not exist. Create it with:');
  console.log('   npx supabase db push');
  console.log('   OR manually in Supabase dashboard\n');
} else {
  console.log('✅ Table exists!');
  console.log(`   Found ${games?.length || 0} records\n`);
}

// Test 2: Try to insert
console.log('2️⃣ Testing INSERT permission...');
const testGame = {
  player_address: '0xTEST_' + Date.now(),
  bet_amount: 1.5,
  prediction: 'rock',
  winner: 'paper',
  payout: 0,
  transaction_id: 'test_tx_' + Date.now(),
  status: 'completed'
};

const { data: insertData, error: insertError } = await supabase
  .from('games')
  .insert(testGame)
  .select();

if (insertError) {
  console.error('❌ INSERT failed:', insertError.message);
  console.error('Details:', insertError);
  console.log('\n⚠️  Check RLS policies in Supabase dashboard');
  console.log('   Database > Tables > games > RLS Policies\n');
} else {
  console.log('✅ INSERT successful!');
  console.log('   Inserted:', insertData?.[0]?.id);
  console.log('\n🎉 Supabase is working correctly!\n');
}

// Test 3: Check recent games
console.log('3️⃣ Fetching recent games...');
const { data: recentGames, error: recentError } = await supabase
  .from('games')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

if (!recentError && recentGames) {
  console.log(`✅ Found ${recentGames.length} recent games:`);
  recentGames.forEach((game, i) => {
    console.log(`   ${i + 1}. ${game.player_address.substring(0, 10)}... - ${game.prediction} vs ${game.winner}`);
  });
}

console.log('\n✅ Test complete!');
