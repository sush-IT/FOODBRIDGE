import Donation from '../models/Donation.js';
import Listing from '../models/Listing.js';

const listingSeed = [
  {
    name: 'Paneer Butter Masala Combo',
    description: 'Dinner combo with naan and salad',
    hotelName: 'Grand Aurora',
    city: 'Mumbai',
    originalPrice: 420,
    discountPercent: 55,
    discountedPrice: 189,
    quantity: 10,
  },
  {
    name: 'Mediterranean Veg Bowl',
    description: 'Healthy surplus bowl from buffet line',
    hotelName: 'Skyline Suites',
    city: 'Bangalore',
    originalPrice: 360,
    discountPercent: 50,
    discountedPrice: 180,
    quantity: 8,
  },
];

const donationSeed = [
  {
    foodName: 'Cooked rice and dal trays',
    hotelName: 'Grand Aurora',
    city: 'Mumbai',
    servings: 35,
    status: 'available',
  },
  {
    foodName: 'Sandwich and fruit packs',
    hotelName: 'Skyline Suites',
    city: 'Bangalore',
    servings: 20,
    status: 'available',
  },
];

export async function seedIfEmpty() {
  const listingCount = await Listing.countDocuments();
  if (listingCount === 0) {
    await Listing.insertMany(listingSeed);
  }

  const donationCount = await Donation.countDocuments();
  if (donationCount === 0) {
    await Donation.insertMany(donationSeed);
  }

}
