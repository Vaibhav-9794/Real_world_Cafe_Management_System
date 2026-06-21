export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  isPopular?: boolean;
  isChefSpecial?: boolean;
  isVegetarian?: boolean;
  isGlutenFree?: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface CuisineGroup {
  id: string;
  name: string;
  categories: MenuCategory[];
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  mapEmbedUrl: string;
  openingHours: { days: string; hours: string }[];
}

export interface EventPackage {
  id: string;
  name: string;
  type: 'BIRTHDAY' | 'ANNIVERSARY' | 'CORPORATE' | 'FULL_VENUE';
  description: string;
  pricePerGuest: number;
  minGuests: number;
  inclusions: string[];
}

export interface GoogleReview {
  id: string;
  author: string;
  authorAvatar: string;
  rating: number;
  relativeTime: string;
  text: string;
}

export const BRANDING = {
  name: "Boho Cafe & Dining",
  tagline: "A Sanctuary of Boho Chic & Fine Gastronomy",
  logo: "✦ BOHO ✦",
  logoImage: "/images/logo.png", // fallback placeholder
  globalRating: 4.9,
  totalReviewsCount: 1842,
  videoHeroUrl: "/videos/hero-video.mp4",
  
  // Dynamic CSS variables that will be injected into :root
  colors: {
    primary: "#c5a880",       // Luxury Champagne Gold
    primaryHover: "#b3946b",  // Hover gold
    secondary: "#1a1613",     // Warm Dark Brown/Charcoal
    background: "#0a0807",    // Deep Warm Black
    cardBg: "#120f0d",        // High-end Dark Card background
    cardBgHover: "#181412",   // Card hover state
    border: "#251f1a",        // Deep copper border
    borderHover: "#3d332b",   // Active/hover border
    text: "#f5f2eb",          // Soft Ivory/Cream White
    textSecondary: "#a8a29e", // Muted warm grey
    success: "#10b981",       // Forest Emerald Green
    error: "#ef4444",         // Rich Crimson
    warning: "#f59e0b"        // Amber Gold
  },

  fonts: {
    title: "'Playfair Display', serif",
    body: "'Inter', sans-serif"
  },

  // Multi-branch Configuration
  branches: [
    {
      id: "downtown",
      name: "Boho Cafe & Dining - Kanpur Centre",
      city: "Kanpur",
      address: "Boho Cafe & Dining, Kanpur, Uttar Pradesh, India",
      phone: "+91 8400678200",
      whatsapp: "+918400678200",
      email: "hs142636@gmail.com",
      mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d114312.44374823528!2d80.26417711311029!3d26.447814238515093!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399c4770b127c46f%3A0x1778302a6828f445!2sKanpur%2C%20Uttar%20Pradesh!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin",
      openingHours: [
        { days: "Mon - Thu", hours: "11:00 AM - 10:00 PM" },
        { days: "Fri - Sat", hours: "11:00 AM - 11:00 PM" },
        { days: "Sunday", hours: "10:00 AM - 9:00 PM" }
      ]
    },
    {
      id: "uptown",
      name: "Boho Lounge - Kanpur East",
      city: "Kanpur",
      address: "Boho Cafe & Dining, Kanpur, Uttar Pradesh, India",
      phone: "+91 8400678200",
      whatsapp: "+918400678200",
      email: "hs142636@gmail.com",
      mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d114312.44374823528!2d80.26417711311029!3d26.447814238515093!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399c4770b127c46f%3A0x1778302a6828f445!2sKanpur%2C%20Uttar%20Pradesh!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin",
      openingHours: [
        { days: "Mon - Fri", hours: "12:00 PM - 11:00 PM" },
        { days: "Sat - Sun", hours: "10:00 AM - 11:00 PM" }
      ]
    }
  ] as Branch[],

  // Advanced Menu Structure: Cuisine -> Category -> Item
  menu: [
    {
      id: "cuisine-pizza",
      name: "Pizza",
      categories: [
        {
          id: "cat-veg-pizza",
          name: "Veg Pizza",
          items: [
            {
              id: "item-margherita",
              name: "Margherita",
              price: 18.00,
              description: "San Marzano tomatoes, fresh buffalo mozzarella, aromatic sweet basil, cold-pressed extra virgin olive oil.",
              image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600",
              isPopular: true,
              isVegetarian: true
            },
            {
              id: "item-truffle-wild",
              name: "Truffle & Wild Mushroom",
              price: 24.00,
              description: "White truffle crema, roasted chanterelle, shiitake, caramelized onion, fresh fontina, micro herbs.",
              image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?q=80&w=600",
              isChefSpecial: true,
              isVegetarian: true
            }
          ]
        },
        {
          id: "cat-premium-pizza",
          name: "Premium Pizza",
          items: [
            {
              id: "item-loaded-cheese",
              name: "Loaded Cheese & Honey",
              price: 22.00,
              description: "Gorgonzola, aged parmesan, fresh ricotta, smoked provolone, drizzled with organic hot honey and rosemary.",
              image: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?q=80&w=600",
              isPopular: true,
              isVegetarian: true
            },
            {
              id: "item-prosciutto-burrata",
              name: "Prosciutto & Burrata",
              price: 26.00,
              description: "Prosciutto di Parma, creamy center burrata ball, fresh baby arugula, aged balsamic glaze, extra virgin olive oil.",
              image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=600",
              isChefSpecial: true
            }
          ]
        }
      ]
    },
    {
      id: "cuisine-chinese",
      name: "Chinese",
      categories: [
        {
          id: "cat-noodles",
          name: "Noodles",
          items: [
            {
              id: "item-hakka-noodles",
              name: "Hakka Noodles",
              price: 16.00,
              description: "Wok-tossed hand-pulled noodles, julienned seasonal greens, garlic chives, light soy sauce, white pepper.",
              image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=600",
              isVegetarian: true
            },
            {
              id: "item-dan-dan",
              name: "Signature Dan Dan Noodles",
              price: 19.50,
              description: "Sichuan pepper sesame sauce, ground roasted peanuts, scallions, served with choices of protein.",
              image: "https://images.unsplash.com/photo-1612966608997-30dad929b207?q=80&w=600",
              isPopular: true
            }
          ]
        },
        {
          id: "cat-fried-rice",
          name: "Fried Rice",
          items: [
            {
              id: "item-schezwan-rice",
              name: "Schezwan Rice",
              price: 17.00,
              description: "Spicy wok-fried jasmine rice, house-made fiery Schezwan chili paste, roasted peppers, garlic crisps.",
              image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=600",
              isPopular: true,
              isVegetarian: true
            }
          ]
        }
      ]
    },
    {
      id: "cuisine-indian",
      name: "Indian",
      categories: [
        {
          id: "cat-main-course",
          name: "Main Course",
          items: [
            {
              id: "item-paneer-butter",
              name: "Paneer Butter Masala",
              price: 21.00,
              description: "Artisanal paneer cubes simmered in a rich, velvet tomato-cashew gravy, finished with organic butter & dried fenugreek.",
              image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=600",
              isPopular: true,
              isVegetarian: true,
              isGlutenFree: true
            },
            {
              id: "item-smoked-butter-chicken",
              name: "Smoked Butter Chicken",
              price: 24.50,
              description: "Tandoor-charred chicken thigh, silky makhani sauce, fresh cream, smoked using hickory wood blocks.",
              image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=600",
              isChefSpecial: true,
              isGlutenFree: true
            }
          ]
        }
      ]
    }
  ] as CuisineGroup[],

  // Loyalty Program Settings
  loyalty: {
    pointsPerCurrencyUnit: 1, // 1 point per $ spent
    pointsForVIP: 1000,
    vipDiscountPercentage: 15,
    birthdayBonusPoints: 200,
    tiers: [
      { name: "Silver", minVisits: 0, pointsMultiplier: 1.0 },
      { name: "Gold", minVisits: 5, pointsMultiplier: 1.2 },
      { name: "VIP Elite", minVisits: 15, pointsMultiplier: 1.5 }
    ]
  },

  // Event Packages
  eventPackages: [
    {
      id: "pkg-birthday",
      name: "Bohemian Birthday Feast",
      type: "BIRTHDAY",
      description: "Celebrate another year in style. Intimate seating arrangements, custom prefix menu, sparkling champagne toast, and artisan cake.",
      pricePerGuest: 65,
      minGuests: 10,
      inclusions: ["Custom 3-Course Menu", "Welcome Cocktail/Mocktail", "Elegant Boho Table Styling", "Complimentary Birthday Cake"]
    },
    {
      id: "pkg-anniversary",
      name: "Eternal Love Anniversary",
      type: "ANNIVERSARY",
      description: "An intimate, romantic evening curated for couples and their loved ones. Ambient candlelight, acoustic performance, and gourmet tasting menu.",
      pricePerGuest: 85,
      minGuests: 2,
      inclusions: ["5-Course Chef Tasting Menu", "Wine Pairing", "Personalized Menus", "Violin/Acoustic Soloist (1 hour)"]
    },
    {
      id: "pkg-corporate",
      name: "Prestige Corporate Gala",
      type: "CORPORATE",
      description: "High-end corporate gatherings, workshops, and business networking events. Includes full media presentation capability and premium catering.",
      pricePerGuest: 110,
      minGuests: 20,
      inclusions: ["Gourmet Buffet / Buffet Stations", "Open Bar (Premium)", "Projector & High-End Sound System", "Customized Branding Displays"]
    },
    {
      id: "pkg-venue",
      name: "Exclusive Venue Takeover",
      type: "FULL_VENUE",
      description: "The ultimate luxury. Complete reservation of the entire restaurant branch. Curate your dream event with no constraints.",
      pricePerGuest: 150,
      minGuests: 40,
      inclusions: ["Full Private Venue Access", "Custom Curated Dining & Bar", "Dedicated Staff & Event Manager", "Valet Parking Services"]
    }
  ] as EventPackage[],

  // Google Reviews
  reviews: [
    {
      id: "rev-1",
      author: "Eleanor Vance",
      authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150",
      rating: 5,
      relativeTime: "2 days ago",
      text: "The truffle pizza was absolutely out of this world. The aesthetic is stunning, warm gold tones and candlelit tables. Highly recommend Boho Uptown for date night!"
    },
    {
      id: "rev-2",
      author: "Marcus Aurelius",
      authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150",
      rating: 5,
      relativeTime: "1 week ago",
      text: "Outstanding service. The smart booking system suggested combining three tables for my family gathering of 18, and everything was set up perfectly before we arrived."
    },
    {
      id: "rev-3",
      author: "Serena Williams",
      authorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150",
      rating: 5,
      relativeTime: "3 days ago",
      text: "Pure luxury. The smoked butter chicken has a delicate wood aroma that makes it unforgettable. Beautiful live music and premium service from check-in to dessert."
    }
  ] as GoogleReview[]
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};
