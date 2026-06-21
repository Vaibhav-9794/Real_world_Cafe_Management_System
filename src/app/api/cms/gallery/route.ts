import { NextResponse } from 'next/server';

const INSTAGRAM_MOCK_CMS = [
  {
    id: 'ig-1',
    type: 'POST',
    mediaUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600',
    caption: 'Chasing sunsets and craft cocktails in Kanpur Center. ✦ #BohoLuxury #FineDining',
    likesCount: 142,
    commentsCount: 18,
    permalink: 'https://instagram.com'
  },
  {
    id: 'ig-2',
    type: 'REEL',
    mediaUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600',
    caption: 'POV: You ordered our signature Truffle & Wild Mushroom Pizza. 🤤🔥 #KanpurEats #Woodfired',
    likesCount: 524,
    commentsCount: 42,
    permalink: 'https://instagram.com'
  },
  {
    id: 'ig-3',
    type: 'UGC',
    mediaUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=600',
    caption: 'Birthday celebrations under the bohemian lights. Thank you for sharing your memories @ria_vance! #BohoMoments',
    likesCount: 231,
    commentsCount: 12,
    permalink: 'https://instagram.com'
  },
  {
    id: 'ig-4',
    type: 'POST',
    mediaUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=600',
    caption: 'Culinary symmetry: our Chef Special Smoked Butter Chicken. Crafted to perfection. #MakhaniArtistry',
    likesCount: 189,
    commentsCount: 9,
    permalink: 'https://instagram.com'
  },
  {
    id: 'ig-5',
    type: 'REEL',
    mediaUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=600',
    caption: 'Friday night jazz sessions. Kanpur’s ultimate weekend lounge sanctuary. 🎷✨ #BohoLounge #LiveMusic',
    likesCount: 612,
    commentsCount: 37,
    permalink: 'https://instagram.com'
  },
  {
    id: 'ig-6',
    type: 'UGC',
    mediaUrl: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?q=80&w=600',
    caption: 'Anniversary romance. Elegant candlelit tables, acoustical violins, and our 5-course tasting menu. #EternalLove',
    likesCount: 345,
    commentsCount: 22,
    permalink: 'https://instagram.com'
  }
];

const EVENTS_GALLERY_CMS = [
  {
    category: 'Birthday Celebrations',
    images: [
      { src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=600', title: 'Boho Garden Party' },
      { src: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=600', title: 'Elegant Table Toast' }
    ]
  },
  {
    category: 'Anniversaries',
    images: [
      { src: 'https://images.unsplash.com/photo-1519225495810-7512c696505a?q=80&w=600', title: 'Candlelit Canopy' },
      { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600', title: 'Romantic Violin Setup' }
    ]
  },
  {
    category: 'Corporate Events',
    images: [
      { src: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=600', title: 'Prestige Networking Setup' },
      { src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600', title: 'Presentation Gala Space' }
    ]
  },
  {
    category: 'Private Dining',
    images: [
      { src: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600', title: 'Bohemian Tasting Room' },
      { src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600', title: 'Intimate Sanctuary Hall' }
    ]
  }
];

export async function GET() {
  return NextResponse.json({
    success: true,
    instagram: INSTAGRAM_MOCK_CMS,
    events: EVENTS_GALLERY_CMS
  });
}
