import type { PosCategory, PosMenuItem, PosOutlet } from "./types";

export const posSystemDate = "2026-06-03";

export const initialOutlets: PosOutlet[] = [
  {
    id: "outlet-coffee-pizzeria",
    name: "RONAKA COFFEE AND PIZZERIA LOUNGE",
    currency: "LKR",
    active: true
  },
  {
    id: "outlet-yarl-rasa",
    name: "RONAKA YARL RASA VEEDU",
    currency: "LKR",
    active: true
  }
];

export const initialCategories: PosCategory[] = [
  {
    id: "cat-beverages",
    name: "BEVERAGES"
  }
];

export const initialMenuItems: PosMenuItem[] = [
  {
    id: "item-water",
    name: "WATER",
    code: "001",
    category: "BEVERAGES",
    price: 200,
    active: true
  }
];
