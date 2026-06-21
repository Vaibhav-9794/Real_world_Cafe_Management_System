import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE env keys!");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function registerUser(email: string, pin: string, name: string, role: string, branchId: string | null) {
  console.log(`Registering ${email} in Supabase Auth...`);
  
  // 1. Create in Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
    user_metadata: { name, role }
  });

  if (authError) {
    if (authError.message.includes('already exists') || authError.message.includes('already registered')) {
      console.log(`- User ${email} already exists in Auth. Retrieving details...`);
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      const existing = users.find(u => u.email === email);
      if (existing) {
        await syncProfile(existing.id, email, name, role, pin, branchId);
      }
    } else {
      console.error(`❌ Error creating auth user ${email}:`, authError.message);
    }
  } else if (authData.user) {
    console.log(`✅ Created auth user: ${authData.user.id}`);
    await syncProfile(authData.user.id, email, name, role, pin, branchId);
  }
}

async function syncProfile(userId: string, email: string, name: string, role: string, pin: string, branchId: string | null) {
  console.log(`Syncing profile for ${email} in staff_profiles...`);
  
  // Check if profile exists
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('staff_profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (fetchError) {
    console.error(`❌ Error checking profile for ${email}:`, fetchError.message);
    return;
  }

  const profileData = {
    user_id: userId,
    name,
    email,
    role,
    status: 'ACTIVE',
    pin,
    login_method: 'PIN',
    branch_id: branchId
  };

  if (existing) {
    console.log(`- Profile already exists (ID: ${existing.id}). Updating profile...`);
    const { error: updateError } = await supabaseAdmin
      .from('staff_profiles')
      .update(profileData)
      .eq('id', existing.id);
      
    if (updateError) {
      console.error(`❌ Error updating profile for ${email}:`, updateError.message);
    } else {
      console.log(`✅ Successfully updated profile!`);
    }
  } else {
    console.log(`- Creating new profile...`);
    const { error: insertError } = await supabaseAdmin
      .from('staff_profiles')
      .insert([profileData]);
      
    if (insertError) {
      console.error(`❌ Error inserting profile for ${email}:`, insertError.message);
    } else {
      console.log(`✅ Successfully created profile!`);
    }
  }
}

async function main() {
  // Register Owner
  await registerUser('owner@bohocafe.com', '8888', 'Boho Owner', 'OWNER', null);
  // Register Manager
  await registerUser('manager@bohocafe.com', '7777', 'Julian Sterling', 'MANAGER', 'downtown');
}

main().catch(err => console.error(err));
