import { newId } from "@/lib/id";
import type { InventoryItem } from "@/types";

interface SkuDef {
  name: string;
  category: string;
  unit: string;
}

const CATEGORIES: Record<string, SkuDef[]> = {
  Beverages: [
    { name: "Sparkling Water 500ml", category: "Beverages", unit: "bottle" },
    { name: "Fresh Orange Juice 1L", category: "Beverages", unit: "bottle" },
    { name: "Karak Chai Mix", category: "Beverages", unit: "pack" },
    { name: "Arabic Coffee 250g", category: "Beverages", unit: "pack" },
    { name: "Cola Can 330ml", category: "Beverages", unit: "can" },
  ],
  Bakery: [
    { name: "Arabic Bread Pack", category: "Bakery", unit: "pack" },
    { name: "Croissant", category: "Bakery", unit: "piece" },
    { name: "Manakish Zaatar", category: "Bakery", unit: "piece" },
    { name: "Sourdough Loaf", category: "Bakery", unit: "loaf" },
    { name: "Baklava Box", category: "Bakery", unit: "box" },
  ],
  "Fresh Produce": [
    { name: "Tomatoes 1kg", category: "Fresh Produce", unit: "kg" },
    { name: "Cucumbers 1kg", category: "Fresh Produce", unit: "kg" },
    { name: "Mint Bunch", category: "Fresh Produce", unit: "bunch" },
    { name: "Lemons 1kg", category: "Fresh Produce", unit: "kg" },
    { name: "Mixed Salad Leaves", category: "Fresh Produce", unit: "pack" },
  ],
  "Meat & Grill": [
    { name: "Chicken Shawarma Meat 1kg", category: "Meat & Grill", unit: "kg" },
    { name: "Beef Kofta Skewers", category: "Meat & Grill", unit: "pack" },
    { name: "Lamb Mandi Portion", category: "Meat & Grill", unit: "portion" },
    { name: "Grilled Chicken Breast", category: "Meat & Grill", unit: "portion" },
    { name: "Falafel Mix 500g", category: "Meat & Grill", unit: "pack" },
  ],
  "Packaged Meals": [
    { name: "Chicken Biryani Box", category: "Packaged Meals", unit: "box" },
    { name: "Mixed Grill Platter", category: "Packaged Meals", unit: "platter" },
    { name: "Vegetable Curry Box", category: "Packaged Meals", unit: "box" },
    { name: "Shawarma Wrap", category: "Packaged Meals", unit: "wrap" },
    { name: "Burger Combo Box", category: "Packaged Meals", unit: "box" },
  ],
  Packaging: [
    { name: "Takeaway Container Large", category: "Packaging", unit: "piece" },
    { name: "Takeaway Container Small", category: "Packaging", unit: "piece" },
    { name: "Paper Bag Medium", category: "Packaging", unit: "piece" },
    { name: "Cutlery Set Disposable", category: "Packaging", unit: "set" },
    { name: "Insulated Delivery Bag", category: "Packaging", unit: "piece" },
    { name: "Napkin Pack", category: "Packaging", unit: "pack" },
  ],
  Condiments: [
    { name: "Garlic Sauce 250ml", category: "Condiments", unit: "bottle" },
    { name: "Tahini Sauce 250ml", category: "Condiments", unit: "bottle" },
    { name: "Hot Sauce 200ml", category: "Condiments", unit: "bottle" },
    { name: "Ketchup Sachet Box", category: "Condiments", unit: "box" },
  ],
};

function skuCode(category: string, idx: number): string {
  const prefix = category.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  return `${prefix}-${String(idx + 1).padStart(3, "0")}`;
}

const LOCATIONS = ["Business Bay DC", "Al Quoz Warehouse", "Deira Store", "JLT Kitchen Hub"];

export function generateInventory(): InventoryItem[] {
  const items: InventoryItem[] = [];
  let globalIdx = 0;
  for (const skus of Object.values(CATEGORIES)) {
    skus.forEach((def) => {
      globalIdx += 1;
      const qty = 10 + Math.floor(Math.random() * 300);
      const reorderThreshold = 20 + Math.floor(Math.random() * 30);
      // Bias some SKUs deliberately toward low/out of stock for demo purposes
      const forceLow = globalIdx % 7 === 0;
      const forceOut = globalIdx % 11 === 0;
      const quantityOnHand = forceOut ? 0 : forceLow ? Math.max(1, reorderThreshold - 5) : qty;
      const reserved = Math.min(quantityOnHand, Math.floor(Math.random() * (quantityOnHand * 0.3)));

      items.push({
        id: newId(),
        sku: skuCode(def.category, globalIdx),
        productName: def.name,
        category: def.category,
        quantityOnHand,
        reservedQuantity: reserved,
        reorderThreshold,
        unit: def.unit,
        location: LOCATIONS[globalIdx % LOCATIONS.length],
        updatedAt: new Date().toISOString(),
      });
    });
  }
  return items;
}
