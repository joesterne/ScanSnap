import { ProductData } from '../store';

export async function lookupUPC(upc: string): Promise<ProductData> {
  // First, try Open Food Facts (good for groceries)
  try {
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${upc}.json`);
    if (offRes.ok) {
      const offData = await offRes.json();
      if (offData.status === 1 && offData.product) {
        return {
          upc,
          name: offData.product.product_name || 'Unknown Product',
          brand: offData.product.brands,
          imageUrl: offData.product.image_url,
          category: offData.product.categories?.split(',')[0],
          description: offData.product.generic_name,
          ingredients: offData.product.ingredients_text,
          nutritionInfo: offData.product.nutriments ? 
            `Energy: ${offData.product.nutriments['energy-kcal_100g'] || '?'} kcal/100g\nFat: ${offData.product.nutriments['fat_100g'] || '?'}g\nCarbs: ${offData.product.nutriments['carbohydrates_100g'] || '?'}g\nProteins: ${offData.product.nutriments['proteins_100g'] || '?'}g` 
            : undefined,
        };
      }
    }
  } catch (error) {
    console.error('OpenFoodFacts API error:', error);
  }

  // Fallback: UPCitemdb Trial API (good for general goods, but rate limited to 100/day)
  try {
    const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`);
    if (upcRes.ok) {
      const upcData = await upcRes.json();
      if (upcData.code === 'OK' && upcData.items && upcData.items.length > 0) {
        const item = upcData.items[0];
        return {
          upc,
          name: item.title || 'Unknown Product',
          brand: item.brand,
          imageUrl: item.images && item.images.length > 0 ? item.images[0] : undefined,
          category: item.category,
          description: item.description,
        };
      }
    }
  } catch (error) {
    console.error('UPCitemdb API error:', error);
  }

  // If both fail or return nothing, return a default missing item
  return {
    upc,
    name: 'Unknown Product (Not found in databases)',
  };
}
