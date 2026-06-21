import { prisma } from '../src/lib/db';
import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
  console.log("Updating SQLite database cms_config table...");
  const sqliteRecord = await prisma.cMSConfig.findUnique({
    where: { key: 'homepage' }
  });

  if (sqliteRecord) {
    const config = JSON.parse(sqliteRecord.value);
    if (config.hero && config.hero.videoUrl) {
      config.hero.videoUrl = '/videos/hero-video.mp4';
      await prisma.cMSConfig.update({
        where: { key: 'homepage' },
        data: { value: JSON.stringify(config) }
      });
      console.log("✅ Successfully updated SQLite cms_config.");
    }
  } else {
    console.log("⚠️ No SQLite cms_config record found.");
  }

  console.log("Updating Supabase database cms_config table...");
  const { data: sbData, error: sbError } = await supabaseAdmin
    .from('cms_config')
    .select('*')
    .eq('key', 'homepage')
    .single();

  if (sbError) {
    console.error("❌ Error fetching from Supabase:", sbError.message);
  } else if (sbData) {
    const config = JSON.parse(sbData.value);
    if (config.hero && config.hero.videoUrl) {
      config.hero.videoUrl = '/videos/hero-video.mp4';
      const { error: updateError } = await supabaseAdmin
        .from('cms_config')
        .update({ value: JSON.stringify(config) })
        .eq('key', 'homepage');

      if (updateError) {
        console.error("❌ Error updating Supabase:", updateError.message);
      } else {
        console.log("✅ Successfully updated Supabase cms_config.");
      }
    }
  } else {
    console.log("⚠️ No Supabase cms_config record found.");
  }
}

main().catch(console.error);
