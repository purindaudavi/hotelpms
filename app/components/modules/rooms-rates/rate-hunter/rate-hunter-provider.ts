import { addDays } from "../utils";

export type RateHunterSearchCriteria = {
  city: string;
  country: string;
  checkIn: string;
  checkOut: string;
  mealPlan: string;
};

export type CompetitorQuote = {
  id: string;
  hotelName: string;
  city: string;
  country: string;
  score: number;
  distanceKm: number;
  comparableRoom: string;
  mealPlan: string;
  refundable: boolean;
  currency: "LKR";
  averageNightlyRate: number;
  totalRate: number;
  source: "Sample benchmark";
};

type SampleHotel = Omit<CompetitorQuote, "averageNightlyRate" | "totalRate" | "source"> & {
  weekdayRate: number;
  weekendRate: number;
};

const sampleHotels: SampleHotel[] = [
  {
    id: "olinia",
    hotelName: "Sample Airport Hotel A",
    city: "Katunayake",
    country: "Sri Lanka",
    score: 8.4,
    distanceKm: 2.1,
    comparableRoom: "Standard Double Room",
    mealPlan: "Room Only",
    refundable: true,
    currency: "LKR",
    weekdayRate: 17000,
    weekendRate: 19000
  },
  {
    id: "sera86",
    hotelName: "Sample Transit Hotel B",
    city: "Katunayake",
    country: "Sri Lanka",
    score: 8.8,
    distanceKm: 1.4,
    comparableRoom: "Transit Double Room",
    mealPlan: "Room Only",
    refundable: false,
    currency: "LKR",
    weekdayRate: 14500,
    weekendRate: 16500
  },
  {
    id: "lagoon",
    hotelName: "Sample Airport Residence C",
    city: "Katunayake",
    country: "Sri Lanka",
    score: 7.9,
    distanceKm: 4.8,
    comparableRoom: "Family Room",
    mealPlan: "Room Only",
    refundable: true,
    currency: "LKR",
    weekdayRate: 20500,
    weekendRate: 23000
  }
];

export function stayDates(checkIn: string, checkOut: string) {
  const dates: string[] = [];
  for (let date = checkIn; date < checkOut; date = addDays(date, 1)) dates.push(date);
  return dates;
}

export function searchSampleCompetitorQuotes(criteria: RateHunterSearchCriteria): CompetitorQuote[] {
  const dates = stayDates(criteria.checkIn, criteria.checkOut);
  const city = criteria.city.trim().toLowerCase();
  const country = criteria.country.trim().toLowerCase();

  return sampleHotels
    .filter((hotel) => hotel.city.toLowerCase().includes(city))
    .filter((hotel) => hotel.country.toLowerCase() === country)
    .filter((hotel) => hotel.mealPlan === criteria.mealPlan)
    .map(({ weekdayRate, weekendRate, ...hotel }) => {
      const totalRate = dates.reduce((total, date) => {
        const day = new Date(`${date}T12:00:00`).getDay();
        return total + (day === 0 || day === 6 ? weekendRate : weekdayRate);
      }, 0);
      return {
        ...hotel,
        averageNightlyRate: dates.length ? totalRate / dates.length : 0,
        totalRate,
        source: "Sample benchmark" as const
      };
    });
}
