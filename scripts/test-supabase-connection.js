// Test Supabase Connection
// Run this in the browser console to debug connection issues

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Import the Supabase client
    const { supabase } = window;
    
    if (!supabase) {
      console.error('Supabase client not found. Make sure you are on the manager page.');
      return;
    }
    
    // Test 1: Check if we can query sites
    console.log('\n1. Testing sites table...');
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('*')
      .limit(5);
    
    if (sitesError) {
      console.error('❌ Sites query failed:', sitesError);
      
      // Check if it's an RLS issue
      if (sitesError.message?.includes('row-level')) {
        console.warn('⚠️  This appears to be a Row Level Security issue.');
        console.warn('    Run the SQL script to disable RLS or add policies.');
      }
    } else {
      console.log('✅ Sites query successful:', sites);
    }
    
    // Test 2: Check if we can query areas
    console.log('\n2. Testing slp_areas table...');
    const { data: areas, error: areasError } = await supabase
      .from('slp_areas')
      .select('*')
      .limit(5);
    
    if (areasError) {
      console.error('❌ Areas query failed:', areasError);
    } else {
      console.log('✅ Areas query successful:', areas);
    }
    
    // Test 3: Check if we can query pages
    console.log('\n3. Testing slp_pages table...');
    const { data: pages, error: pagesError } = await supabase
      .from('slp_pages')
      .select('*')
      .limit(5);
    
    if (pagesError) {
      console.error('❌ Pages query failed:', pagesError);
    } else {
      console.log('✅ Pages query successful:', pages);
    }
    
    // Test 4: Check the joined query for ATL06
    console.log('\n4. Testing joined query for ATL06...');
    const { data: atl06Pages, error: joinError } = await supabase
      .from('slp_pages')
      .select(`
        id,
        page_number,
        slp_areas!slp_area_id (
          name,
          sites!site_id (
            name
          )
        )
      `)
      .eq('slp_areas.sites.name', 'ATL06')
      .limit(5);
    
    if (joinError) {
      console.error('❌ Joined query failed:', joinError);
      console.warn('   This is the query used to load pages in the manager.');
    } else {
      console.log('✅ Joined query successful:', atl06Pages);
      if (atl06Pages?.length === 0) {
        console.warn('⚠️  No ATL06 pages found. Run initialization first.');
      }
    }
    
    // Test 5: Check authentication status
    console.log('\n5. Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.warn('⚠️  Not authenticated or auth error:', authError);
      console.warn('    You may need to configure authentication.');
    } else {
      console.log('✅ Authenticated as:', user.email || user.id);
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY:');
    if (!sitesError && !areasError && !pagesError) {
      console.log('✅ Basic database connection is working');
      
      if (joinError) {
        console.log('❌ But joined queries are failing');
        console.log('   This might be a foreign key or RLS issue');
      } else if (atl06Pages?.length === 0) {
        console.log('⚠️  Database works but ATL06 pages not initialized');
        console.log('   Click "Initialize 119 Pages" button');
      } else {
        console.log('✅ Everything is working correctly!');
      }
    } else {
      console.log('❌ Database connection has issues');
      console.log('   Check the errors above for details');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testSupabaseConnection();

// Also expose it globally for re-running
window.testSupabaseConnection = testSupabaseConnection;